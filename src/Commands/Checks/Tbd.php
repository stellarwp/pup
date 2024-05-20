<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use StellarWP\Pup\Command\Io;
use Symfony\Component\Console\Input\InputInterface;

class Tbd extends AbstractCheck {
	/**
	 * The slug for the command.
	 * @var string
	 */
	protected $slug = 'tbd';

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function checkConfigure(): void {
		$this->setDescription( 'Hunts for docblock TBD occurrences and tells you where to change them.' );
		$this->setHelp( 'This command alerts if TBD exists in the codebase.' );
	}

	/**
	 * Execute the check command.
	 *
	 * @param InputInterface  $input
	 * @param Io $output
	 *
	 * @return int
	 */
	protected function checkExecute( InputInterface $input, Io $output ): int {
		$output->section( '<comment>Checking for TBDs...</comment>' );

		$root = $input->getOption( 'root' );

		$found_tbds = false;

		$files_to_skip = '.min.css|.min.js|.map.js|.css|.png|.jpg|.jpeg|.svg|.gif|.ico';
		$directories_to_skip = 'bin|build|vendor|node_modules|.git|.github|tests';

		$check_config = $this->check_config->getConfig();

		if ( ! empty( $this->check_config->getConfig()['skip_files'] ) ) {
			$files_to_skip = $this->check_config->getConfig()['skip_files'];
		}

		if ( ! empty( $this->check_config->getConfig()['skip_directories'] ) ) {
			$directories_to_skip = $this->check_config->getConfig()['skip_directories'];
		}

		$files_to_skip       = str_replace( '.', '\.', $files_to_skip );
		$directories_to_skip = str_replace( '.', '\.', $directories_to_skip );

		$matched_lines = [];
		$current_dir = getcwd();

		$dirs = isset( $this->check_config->getConfig()['dirs'] ) ? $this->check_config->getConfig()['dirs'] : [];

		foreach ( $dirs as $dir ) {
			$results = $this->scanDir(
				$root ?: '.',
				$current_dir ?: '.',
				$dir,
				$files_to_skip,
				$directories_to_skip,
			);

			$matched_lines = array_merge( $matched_lines, $results );
		}

		if ( $matched_lines ) {
			$found_tbds = true;
			foreach ( $matched_lines as $file_path => $info ) {
				$output->writeln( "<fg=cyan>{$file_path}</>" );
				foreach ( $info['lines'] as $line_num => $line ) {
					$output->writeln( "<fg=yellow>{$line_num}:</> {$line}" );
				}
				$output->writeln( '' );
			}
		} else {
			$output->writeln( '<success>No TBDs found!</success>' );
			$output->writeln( '' );
		}
		$output->writeln( '' );

		if ( $found_tbds ) {
			$output->writeln( "<fg=red>TBDs have been found!</>" );
		} else {
			$output->writeln( '<success>Success! No TBDs found.</success>' );
		}

		return $found_tbds ? 1 : 0;
	}

	/**
	 * @param string $root
	 * @param string $current_dir
	 * @param string $scan_dir
	 * @param string $files_to_skip
	 * @param string $directories_to_skip
	 *
	 * @return array<string, array<string, array<int, string>>>
	 */
	protected function scanDir( string $root, string $current_dir, string $scan_dir, string $files_to_skip, string $directories_to_skip ): array {
		$matched_lines = [];

		$dir = new \RecursiveIteratorIterator( new \RecursiveDirectoryIterator( $root . '/' . $scan_dir ) );
		foreach ( $dir as $file ) {
			// Skip directories like "." and ".." to avoid file_get_contents errors.
			if ( $file->isDir() ) {
				continue;
			}

			$file_path  = $file->getPathname();
			$short_path = (string) str_replace( $current_dir . '/', '', $file_path );

			if ( preg_match( '!(' . $files_to_skip . ')$!', $short_path ) ) {
				continue;
			}

			if ( preg_match( '!(\.pup-)|(\.puprc)!', $short_path ) ) {
				continue;
			}

			$directory_separator = DIRECTORY_SEPARATOR;
			if ( $directory_separator === '\\' ) {
				$directory_separator = '\\\\';
			}

			if ( preg_match( '!(' . $directories_to_skip . ')' . $directory_separator . '!', $short_path ) ) {
				continue;
			}

			$content   = file_get_contents( $short_path );

			if ( ! $content ) {
				continue;
			}

			$lines     = explode( "\n", $content );
			$num_lines = count( $lines );

			// loop over the lines
			for ( $line = 0; $line < $num_lines; $line++ ) {
				$lines[ $line ] = trim( $lines[ $line ] );

				// does the line match?
				if (
					preg_match( '/\*\s*\@(since|deprecated|version)\s.*tbd/i', $lines[ $line ] )
					|| preg_match( '/_deprecated_\w\(.*[\'"]tbd[\'"]/i', $lines[ $line ] )
					|| preg_match( '/[\'"]tbd[\'"]/i', $lines[ $line ] )
				) {

					// if the file isn't being tracked already, add it to the array
					if ( ! isset( $matched_lines[ $short_path ] ) ) {
						$matched_lines[ $short_path ] = [
							'lines' => [],
						];
					}

					$matched_lines[ $short_path ]['lines'][ $line + 1 ] = $lines[ $line ];
				}
			}
		}

		return $matched_lines;
	}
}
