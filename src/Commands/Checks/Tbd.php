<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use StellarWP\Pup\Check\TbdScanner;
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

		$config  = $this->check_config->getConfig();
		$scanner = TbdScanner::fromConfig( $config );

		$matched_lines = [];
		$current_dir = getcwd();

		$dirs = isset( $config['dirs'] ) ? $config['dirs'] : [];

		foreach ( $dirs as $dir ) {
			$results = $this->scanDir(
				$scanner,
				$root ?: '.',
				$current_dir ?: '.',
				$dir
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
	 * @param TbdScanner $scanner
	 * @param string     $root
	 * @param string     $current_dir
	 * @param string     $scan_dir
	 *
	 * @return array<string, array<string, array<int, string>>>
	 */
	protected function scanDir( TbdScanner $scanner, string $root, string $current_dir, string $scan_dir ): array {
		$matched_lines = [];

		foreach ( $scanner->getFiles( $root, $current_dir, $scan_dir ) as $short_path ) {
			$content = file_get_contents( $short_path );

			if ( ! $content ) {
				continue;
			}

			$lines     = explode( "\n", $content );
			$num_lines = count( $lines );

			// loop over the lines
			for ( $line = 0; $line < $num_lines; $line++ ) {
				$lines[ $line ] = trim( $lines[ $line ] );

				// does the line match?
				if ( $scanner->lineMatches( $lines[ $line ] ) ) {
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
