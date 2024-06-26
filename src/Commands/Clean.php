<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Utils\Directory as DirectoryUtils;;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Clean extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'clean' )
			->setDescription( 'Clean up after pup.' )
			->setHelp( 'Removes pup directories and artifacts.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );
		$config    = App::getConfig();
		$zip_dir   = $config->getZipDir();
		$build_dir = $config->getBuildDir();
		$clean_steps = $config->getCleanCommands();
		$io = $this->getIO();

		$this->io->section( '<fg=yellow>Cleaning up...</>' );

		if ( file_exists( $zip_dir ) && DirectoryUtils::rmdir( $zip_dir ) !== 0 ) {
			throw new \Exception( "Could not remove {$zip_dir}." );
		}
		$output->writeln( "<fg=green>✓</> Removing zip dir...Complete." );

		if ( file_exists( $build_dir ) && DirectoryUtils::rmdir( $build_dir ) !== 0 ) {
			throw new \Exception( "Could not remove {$build_dir}." );
		}
		$output->writeln( "<fg=green>✓</> Removing build dir...Complete." );

		$pup_distfiles = $config->getWorkingDir() . '.pup-distfiles';
		if ( file_exists( $pup_distfiles ) ) {
			if ( unlink( $pup_distfiles ) ) {
				$output->writeln( '<fg=green>✓</> Removing .pup-distfiles...Complete.' );
			} else {
				throw new \Exception( "Could not remove {$build_dir}." );
			}
		}

		$pup_distignore = $config->getWorkingDir() . '.pup-distignore';
		if ( file_exists( $pup_distignore ) ) {
			if ( unlink( $pup_distignore ) ) {
				$output->writeln( '<fg=green>✓</> Removing .pup-distignore...Complete.' );
			} else {
				throw new \Exception( "Could not remove {$build_dir}." );
			}
		}

		$pup_distinclude = $config->getWorkingDir() . '.pup-distinclude';
		if ( file_exists( $pup_distinclude ) ) {
			if ( unlink( $pup_distinclude ) ) {
				$output->writeln( '<fg=green>✓</> Removing .pup-distinclude...Complete.' );
			} else {
				throw new \Exception( "Could not remove {$build_dir}." );
			}
		}

		foreach ( $clean_steps as $step ) {
			$notify_on_failure = true;
			if ( strpos( $step, '@' ) === 0 ) {
				$notify_on_failure = false;
				$step = substr( $step, 1 );
			}
			$io->section( "> <fg=cyan>{$step}</>" );
			system( $step, $result );
			$io->newLine();

			if ( $result && $notify_on_failure ) {
				$io->writeln( "[FAIL] Clean step failed: {$step}" );
			}
		}


		return 0;
	}
}
