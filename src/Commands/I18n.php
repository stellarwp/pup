<?php

namespace StellarWP\Pup\Commands;

use GuzzleHttp\Client;
use StellarWP\Pup\App;
use StellarWP\Pup;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\I18nConfig;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class I18n extends Command {
	/**
	 * Number of retries per translation file (for non-429 failures).
	 *
	 * @var int
	 */
	protected $retries = 3;

	/**
	 * Base delay in seconds for backoff and between retries.
	 *
	 * @var int
	 */
	protected $delay = 2;

	/**
	 * Batch size for grouping downloads (for progress visibility, not concurrency).
	 *
	 * @var int
	 */
	protected $batch_size = 3;

	/**
	 * Maximum number of HTTP 429 retries per translation file.
	 *
	 * @var int
	 */
	protected $max_http_429_retries = 4;

	/**
	 * Backoff multipliers for HTTP 429 rate limit errors.
	 * Index corresponds to the 429 attempt count (0-indexed).
	 * Applied as: delay * multiplier.
	 *
	 * @var int[]
	 */
	protected $http_429_backoff_multipliers = [ 16, 31, 91, 151 ];

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'i18n' )
			->addOption( 'retries', null, InputOption::VALUE_REQUIRED, 'How many retries per translation file.' )
			->addOption( 'delay', null, InputOption::VALUE_REQUIRED, 'Delay (seconds) between retries and for 429 backoff.' )
			->addOption( 'batch-size', null, InputOption::VALUE_REQUIRED, 'Batch size for grouping downloads.' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Fetches language files for the project.' )
			->setHelp( 'Fetches language files for the project.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$config         = App::getConfig();
		$io             = $this->getIO();
		$root           = $input->getOption( 'root' );
		$this->retries  = max( 1, min( 10, (int) ( $input->getOption( 'retries' ) ?? 3 ) ) );
		$this->delay    = max( 1, (int) ( $input->getOption( 'delay' ) ?? 2 ) );
		$this->batch_size = max( 1, (int) ( $input->getOption( 'batch-size' ) ?? 3 ) );
		$i18n           = $config->getI18n();

		if ( $root ) {
			chdir( $root );
		}

		foreach ( $i18n as $i18n_config ) {
			$results = $this->download_language_files( $i18n_config );

			if ( 0 !== $results ) {
				$io->writeln( '<fg=red>Failed to download language files.</>' );
				$io->writeln( '<fg=yellow>Config:</>' );
				$io->writeln( (string) json_encode( $i18n_config, JSON_PRETTY_PRINT ) );
				return $results;
			}
		}

		if ( $root ) {
			chdir( $config->getWorkingDir() );
		}

		return 0;
	}

	/**
	 * Returns default Guzzle client options.
	 *
	 * @return array<string, mixed>
	 */
	protected function get_default_client_options() {
		$version = Pup\PUP_VERSION;
		return [
			'headers' => [
				'User-Agent' => "StellarWP PUP/{$version}",
			],
			'http_errors' => false,
		];
	}

	/**
	 * Extracts wait time from Retry-After header if present.
	 * Respects server hint but caps it to the fixed backoff schedule.
	 *
	 * @param \Psr\Http\Message\ResponseInterface $response
	 * @param int $default_wait Default wait time in seconds.
	 *
	 * @return int Recommended wait time in seconds.
	 */
	protected function get_retry_after_delay( $response, $default_wait ) {
		$retry_after = $response->getHeaderLine( 'Retry-After' );

		if ( ! $retry_after ) {
			return $default_wait;
		}

		// Retry-After can be seconds (numeric) or HTTP-date string.
		if ( is_numeric( $retry_after ) ) {
			$server_wait = (int) $retry_after;
			// Use the smaller of server hint or our backoff; defer to server if more conservative.
			return max( 1, min( $server_wait, $default_wait ) );
		}

		// If it's an HTTP-date, we'd need to parse it; for simplicity, use default.
		return $default_wait;
	}

	/**
	 * Downloads language files for a given I18n config.
	 * Processes downloads sequentially with deterministic retry logic.
	 *
	 * @param I18nConfig $i18n_config
	 *
	 * @throws \GuzzleHttp\Exception\GuzzleException
	 *
	 * @return int 0 on success, 1 on failure.
	 */
	protected function download_language_files( I18nConfig $i18n_config ): int {
		$io      = $this->getIO();
		$options = (object) [
			'domain_path' => $i18n_config->getPath(),
			'url'         => $i18n_config->getUrl(),
			'slug'        => $i18n_config->getSlug(),
			'text_domain' => $i18n_config->getTextdomain(),
			'file_format' => $i18n_config->getFileFormat(),
			'formats'     => $i18n_config->getFormats(),
			'filter'      => $i18n_config->getFilter(),
		];

		$io->writeln( "<fg=yellow>Fetching language files for {$options->text_domain} from {$options->url}</>" ); // @phpstan-ignore-line: Those are strings.

		$client = new Client( $this->get_default_client_options() );

		$project_url = $options->url . '/api/projects/' . $options->slug;
		$project_res = $client->request( 'GET', $project_url );

		if ( 200 !== $project_res->getStatusCode() ) {
			$io->writeln( "<fg=red>Failed to fetch project data from {$project_url}</>", OutputInterface::VERBOSITY_VERBOSE );
			return 1;
		}

		$project_data = json_decode( $project_res->getBody() );

		if ( empty( $project_data->translation_sets ) ) {
			$io->writeln( "<fg=red>Failed to fetch translation sets from {$project_url}</>", OutputInterface::VERBOSITY_VERBOSE );
			return 1;
		}

		// Build a list of (translation, format) pairs to download.
		$download_items = [];
		foreach ( $project_data->translation_sets as $translation ) {
			// Skip when translations are zero.
			if ( 0 === $translation->current_count ) {
				continue;
			}

			// Skip any translation set that doesn't match the minimum percentage.
			if ( $options->filter['minimum_percentage'] > $translation->percent_translated ) {
				continue;
			}

			foreach ( $options->formats as $format ) {
				$download_items[] = [ $translation, $format ];
			}
		}

		if ( empty( $download_items ) ) {
			return 0;
		}

		// Process downloads sequentially in batches (for grouping/visibility).
		$failed_count = 0;
		$item_count   = count( $download_items );

		for ( $offset = 0; $offset < $item_count; $offset += $this->batch_size ) {
			$batch = array_slice( $download_items, $offset, $this->batch_size );

			// Process each item in the batch sequentially.
			foreach ( $batch as $item ) {
				$translation = $item[0];
				$format      = $item[1];

				try {
					$this->download_and_save_translation_sync( $client, $options, $translation, $format, $project_url );
				} catch ( \Exception $e ) {
					$io->writeln( "<fg=red>Download failed: {$e->getMessage()}</>" );
					$failed_count++;
				}
			}
		}

		return $failed_count > 0 ? 1 : 0;
	}

	/**
	 * Synchronously downloads and saves a translation with deterministic retry logic.
	 * Handles both regular retries and HTTP 429 backoff.
	 *
	 * @param Client $client
	 * @param \stdClass $options
	 * @param \stdClass $translation
	 * @param string $format
	 * @param string $project_url
	 *
	 * @throws \Exception On failure after all retries exhausted.
	 *
	 * @return void
	 */
	protected function download_and_save_translation_sync( $client, $options, $translation, $format, $project_url ) {
		$io               = $this->getIO();
		$translation_url  = "{$project_url}/{$translation->locale}/{$translation->slug}/export-translations?format={$format}";

		// Outer loop: regular retries for non-429 failures.
		for ( $tried = 0; $tried < $this->retries; $tried++ ) {
			$http_429_count = 0;

			// Inner loop: 429 retries with exponential backoff.
			while ( $http_429_count < $this->max_http_429_retries ) {
				$response    = $client->request( 'GET', $translation_url );
				$status_code = $response->getStatusCode();
				$body        = (string) $response->getBody();
				$body_size   = strlen( $body );

				// Handle HTTP 429 (Too Many Requests).
				if ( 429 === $status_code ) {
					$multiplier = $this->http_429_backoff_multipliers[ $http_429_count ];
					$base_wait  = $this->delay * $multiplier;
					$wait_time  = $this->get_retry_after_delay( $response, $base_wait );

					$io->writeln(
						"<fg=yellow>Rate limited (HTTP 429) on {$translation->slug}. Waiting {$wait_time}s before retry (attempt " . ( $http_429_count + 1 ) . '/' . $this->max_http_429_retries . ")...</>",
						OutputInterface::VERBOSITY_VERBOSE
					);

					sleep( $wait_time );
					$http_429_count++;
					continue;
				}

				// Check for valid response.
				if ( 200 !== $status_code || $body_size < 200 ) {
					$io->writeln(
						"<fg=red>Invalid response from {$translation_url} (status: {$status_code}, size: {$body_size})</>" ,
						OutputInterface::VERBOSITY_VERBOSE
					);
					break; // Exit 429 loop; will retry with regular retry logic.
				}

				// Save the translation file and return on success.
				$this->save_translation_file( $body, $options, $translation, $format );
				return;
			}

			// If we get here, we either got a non-429 error or exhausted 429 retries.
			// Try again with regular retry delay (if retries remaining).
			if ( $tried < $this->retries - 1 ) {
				$io->writeln(
					"<fg=yellow>Retrying {$translation->slug} after {$this->delay}s...</>",
					OutputInterface::VERBOSITY_VERBOSE
				);
				sleep( $this->delay );
			}
		}

		// All retries exhausted.
		throw new \Exception( "Failed to download {$translation->slug} after {$this->retries} retries" );
	}

	/**
	 * Saves a translation to disk.
	 *
	 * @param string $content The translation content.
	 * @param \stdClass $options
	 * @param \stdClass $translation
	 * @param string $format
	 *
	 * @throws \Exception On write failure.
	 *
	 * @return void
	 */
	protected function save_translation_file( $content, $options, $translation, $format ) {
		$io = $this->getIO();

		$search = [
			'%domainPath%',
			'%textdomain%',
			'%locale%',
			'%wp_locale%',
			'%format%',
		];
		$replace = [
			$options->domain_path,
			$options->text_domain,
			$translation->locale ?? '',
			$translation->wp_locale ?? '',
			$format,
		];
		$filename = str_replace( $search, $replace, $options->file_format );

		$file_path = "{$options->domain_path}/{$filename}";
		$written   = file_put_contents( $file_path, $content );

		if ( false === $written || $written !== strlen( $content ) ) {
			@unlink( $file_path );
			throw new \Exception( "Failed to write translation to {$file_path}" );
		}

		$io->writeln( "* Translation created for <fg=green>{$file_path}</>" );
	}
}
