<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Check\TbdScanner;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\Exceptions\BaseException;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class ReplaceTbd extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'replace-tbd' )
			->addArgument( 'version', InputArgument::REQUIRED, 'The version to replace TBD placeholders with.' )
			->addOption( 'dry-run', null, InputOption::VALUE_NONE, 'Preview the changes without writing to files.' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Replaces "TBD" version placeholders (e.g. @since TBD) with the provided version.' )
			->setHelp( 'Scans the directories configured for the tbd check and replaces TBD version placeholders with the provided version. This resolves exactly what `pup check:tbd` reports.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );

		$config  = App::getConfig();
		$version = $input->getArgument( 'version' );
		$dry_run = (bool) $input->getOption( 'dry-run' );
		$root    = $input->getOption( 'root' );

		$checks     = $config->getChecks();
		$tbd_config = isset( $checks['tbd'] ) ? $checks['tbd']->getConfig() : [];
		$scanner    = TbdScanner::fromConfig( $tbd_config );

		// Mirror the tbd check's directory resolution exactly: when the tbd check is
		// absent/unconfigured it scans nothing, so replace-tbd must not edit files
		// the check would never examine.
		$dirs = isset( $tbd_config['dirs'] ) ? (array) $tbd_config['dirs'] : [];

		if ( $root ) {
			chdir( $root );
		}

		$current_dir = getcwd() ?: '.';
		$total_files = 0;
		$total_count = 0;

		if ( $dry_run ) {
			$output->writeln( '<comment>[dry-run]</comment> No files will be modified.' );
		}

		foreach ( $dirs as $dir ) {
			foreach ( $scanner->getFiles( '.', $current_dir, $dir ) as $short_path ) {
				$content = file_get_contents( $short_path );

				if ( ! $content ) {
					continue;
				}

				$lines      = explode( "\n", $content );
				$file_count = 0;

				foreach ( $lines as $i => $line ) {
					$count       = 0;
					$lines[ $i ] = $scanner->replaceInLine( $line, $version, $count );
					$file_count += $count;
				}

				if ( $file_count === 0 ) {
					continue;
				}

				$total_files++;
				$total_count += $file_count;

				$output->writeln( "<fg=green>✓</> <fg=cyan>{$short_path}</> <fg=gray>({$file_count} replaced)</>" );

				if ( ! $dry_run ) {
					$results = file_put_contents( $short_path, implode( "\n", $lines ) );

					if ( false === $results ) {
						$this->restoreCwd( $root );
						throw new BaseException( 'Could not write to file: ' . $short_path );
					}
				}
			}
		}

		$this->restoreCwd( $root );

		$output->writeln( '' );

		if ( $total_count === 0 ) {
			$output->writeln( '<success>No TBDs found to replace.</success>' );
		} elseif ( $dry_run ) {
			$output->writeln( "<comment>[dry-run]</comment> Would replace <fg=cyan>{$total_count}</> TBD occurrence(s) across <fg=cyan>{$total_files}</> file(s)." );
		} else {
			$output->writeln( "<success>Replaced {$total_count} TBD occurrence(s) across {$total_files} file(s) with {$version}.</success>" );
		}

		return 0;
	}

	/**
	 * Restores the working directory if it was changed via --root.
	 *
	 * @param string|null $root
	 *
	 * @return void
	 */
	protected function restoreCwd( $root ): void {
		if ( $root ) {
			chdir( App::getConfig()->getWorkingDir() );
		}
	}
}
