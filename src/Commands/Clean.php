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
		$config    = App::getConfig();
		$zip_dir   = $config->getZipDir();
		$build_dir = $config->getBuildDir();

		$output->writeln( '<fg=yellow>Cleaning up...</>' );

		$output->write( "* Removing zip dir..." );
		if ( file_exists( $zip_dir ) && DirectoryUtils::rmdir( $zip_dir ) !== 0 ) {
			throw new \Exception( "Could not remove {$zip_dir}." );
		}
		$output->write( 'Complete.' . PHP_EOL );

		$output->write( "* Removing build dir..." );
		if ( file_exists( $build_dir ) && DirectoryUtils::rmdir( $build_dir ) !== 0 ) {
			throw new \Exception( "Could not remove {$build_dir}." );
		}
		$output->write( 'Complete.' . PHP_EOL );

		$pup_distignore = $config->getWorkingDir() . '.pup-distignore';
		if ( file_exists( $pup_distignore ) ) {
			if ( unlink( $pup_distignore ) ) {
				$output->writeln( 'Removing .pup-distignore...Complete.' );
			} else {
				throw new \Exception( "Could not remove {$build_dir}." );
			}
		}

		return 0;
	}
}
