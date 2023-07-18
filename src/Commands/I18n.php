<?php

namespace StellarWP\Pup\Commands;

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Request;
use StellarWP\Pup\App;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class I18n extends Command {
	/**
	 * @var int
	 */
	protected $retries = 3;

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'i18n' )
			->addOption( 'retries', null, InputOption::VALUE_REQUIRED, 'How many retries we do for each file.' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Fetches language files for the project.' )
			->setHelp( 'Fetches language files for the project.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$config        = App::getConfig();
		$io            = $this->getIO();
		$root          = $input->getOption( 'root' );
		$this->retries = $input->getOption( 'retries' ) ?? 3;
		$i18n          = $config->getI18n();

		if ( $root ) {
			chdir( $root );
		}

		foreach ( $i18n as $i18n_config ) {
			$results = $this->download_language_files( $i18n_config );

			if ( $results !== 0 ) {
				$io->writeln( '<fg=red>Failed to download language files.</>' );
				$io->writeln( '<fg=yellow>Config:</>' );
				$io->writeln( json_encode( $i18n_config, JSON_PRETTY_PRINT ) );
				return $results;
			}
		}

		if ( $root ) {
			chdir( $config->getWorkingDir() );
		}

		return 0;
	}

	/**
	 * Downloads language files.
	 *
	 * @param array<int, mixed> $i18n_config
	 *
	 * @throws \GuzzleHttp\Exception\GuzzleException
	 *
	 * @return int
	 */
	protected function download_language_files( array $i18n_config ): int {
		$io      = $this->getIO();
		$options = (object) [
			'domain_path' => $i18n_config['path'] ?? '',
			'url'         => $i18n_config['url'] ?? '',
			'slug'        => $i18n_config['slug'] ?? '',
			'text_domain' => $i18n_config['textdomain'] ?? '',
			'file_format' => $i18n_config['file_format'] ?? '',
			'formats'     => $i18n_config['formats'] ?? [],
			'filter'      => (object) $i18n_config['filter'] ?? [],
		];

		$io->writeln( "<fg=yellow>Fetching language files for {$options->text_domain} from {$options->url}</>" );

		$client = new Client();

		$project_url = $options->url . '/api/projects/' . $options->slug;
		$project_res = $client->request( 'GET', $project_url );

		if ( 200 !== $project_res->getStatusCode() ) {
			$io->writeln( "<fg=red>Failed to fetch project data from {$project_url}</>", OutputInterface::VERBOSITY_VERBOSE );
			return 1;
		}
		$project_data = json_decode( $project_res->getBody() );
		$promises = [];

		if ( empty( $project_data->translation_sets ) ) {
			$io->writeln( "<fg=red>Failed to fetch translation sets from {$project_url}</>", OutputInterface::VERBOSITY_VERBOSE );
			return 1;
		}

		foreach ( $project_data->translation_sets as $translation ) {
			// skip when translations are zero.
			if ( 0 === $translation->current_count ) {
				continue;
			}

			// Skip any translation set that doest match our min translated.
			if ( $options->filter->minimum_percentage > $translation->percent_translated ) {
				continue;
			}

			foreach ( $options->formats as $format ) {
				$promise = $this->download_and_save_translation( $options, $translation, $format, $project_url );

				if ( null !== $promise ) {
					$promises[] = $promise;
				}
			}
		}

		array_map( static function( $promise ) {
			$promise->wait();
		}, $promises );

		return 0;
	}

	/**
	 * Downloads and saves a translation.
	 *
	 * @param \stdClass $options
	 * @param \stdClass $translation
	 * @param string $format
	 * @param string $project_url
	 * @param int $tried
	 *
	 * @return \GuzzleHttp\Promise\PromiseInterface|null
	 */
	protected function download_and_save_translation( $options, $translation, $format, $project_url, $tried = 0 ) {
		$io              = $this->getIO();
		$translation_url = "{$project_url}/{$translation->locale}/{$translation->slug}/export-translations?format={$format}";
		if ( $tried >= $this->retries ) {
			$io->writeln( "<fg=red>Failed to fetch translation from {$translation_url} too many times, bailing on {$translation->slug}</>", OutputInterface::VERBOSITY_VERBOSE );
			return null;
		}

		$tried++;

		$client  = new Client();
		$request = new Request( 'GET', $translation_url );

		$promise = $client->sendAsync( $request )->then( function ( $response ) use ( $translation_url, $options, $translation, $format, $project_url, $tried, $io  ) {
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

			$translation_body = $response->getBody();
			$translation_size = $translation_body->getSize();

			if ( 200 > $translation_size ) {
				$io->writeln( "<fg=red>Failed to fetch translation from {$translation_url}</>", OutputInterface::VERBOSITY_VERBOSE );

				// Not sure if 2seconds is needed, but it prevents the firewall from catching us.
				sleep( 2 );

				// Retries to download this file.
				return $this->download_and_save_translation( $options, $translation, $format, $project_url, $tried );
			}

			$translation_content = $translation_body->getContents();
			$file_path = "{$options->domain_path}/{$filename}";

			$put_contents = file_put_contents( $file_path, $translation_content );

			if ( $put_contents !== $translation_size ) {
				$io->writeln( "<fg=red>Failed to save the translation from {$translation_url} to {$file_path}</>", OutputInterface::VERBOSITY_VERBOSE );

				// Delete the file in that case.
				@unlink( $file_path );

				// Not sure if 2 seconds is needed, but it prevents the firewall from catching us.
				sleep( 2 );

				// Retries to download this file.
				return $this->download_and_save_translation( $options, $translation, $format, $project_url, $tried );
			}

			$io->writeln( "* Translation created for <fg=green>{$file_path}</>" );
		} );

		return $promise;
	}
}
