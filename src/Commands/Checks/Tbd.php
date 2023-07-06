<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class Tbd extends AbstractCheck {
	/**
	 * The slug for the command.
	 * @var string
	 */
	public static $slug = 'tbd';

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function checkConfigure(): void {
		$this->setDescription( 'Hunts for docblock TBD occurrences and tells you where to change them.' );
		$this->setHelp( 'This command alerts if TBD exists in the codebase.' );
	}
	protected function checkExecute( InputInterface $input, OutputInterface $output ) {
		$root = $input->getOption( 'root' );

		$found_tbds = false;

		$files_to_skip = [
			'(\.(png|jpg|jpeg|svg|gif|ico)$)',
			'(\.min\.(css|js)$)',
		];

		$matched_lines = [];
		$current_dir = getcwd();

		$dir = new \RecursiveIteratorIterator( new \RecursiveDirectoryIterator( App::getConfig()->getWorkingDir() . $root ) );
		foreach ( $dir as $file ) {
			// Skip directories like "." and ".." to avoid file_get_contents errors.
			if ( $file->isDir() ) {
				continue;
			}

			$file_path  = $file->getPathname();
			$short_path = str_replace( $current_dir . '/', '', $file_path );

			if ( preg_match( '/\.((min\.css)|(min\.js)|png|jpg|jpeg|svg|gif|ico)$/', $file_path ) ) {
				continue;
			}

			if ( preg_match( '!(vendor|node_modules|\.git|tests)' . DIRECTORY_SEPARATOR . '!', $file_path ) ) {
				continue;
			}

			$content   = file_get_contents( $file_path );
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

		if ( $matched_lines ) {
			$found_tbds = true;
			$this->getIO()->writeln( "<fg=red>TBDs have been found!</>" );
			foreach ( $matched_lines as $file_path => $info ) {
				$this->getIO()->writeln( "<fg=cyan>{$file_path}</>" );
				foreach ( $info['lines'] as $line_num => $line ) {
					$this->getIO()->writeln( "<fg=yellow>{$line_num}:</> {$line}" );
				}
				$this->getIO()->newline();
			}
		} else {
			$this->getIO()->writeln( '<fg=green>No TBDs found!</>' );
			$this->getIO()->newline();
		}
		$this->getIO()->newline();


		$output->writeln( '<info>-------------------</info>' );
		if ( $found_tbds ) {
			$this->getIO()->error( 'TBDs found!' );
		} else {
			$this->getIO()->success( 'DONE' );
		}

		return $found_tbds ? 1 : 0;
	}
}