<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\DirectoryUtils;
use Symfony\Component\Console\Command\Command;
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

		$output->writeln( "Removing zip dir: {$zip_dir}" );
		if ( file_exists( $zip_dir ) && DirectoryUtils::rmdir( $zip_dir ) !== 0 ) {
			throw new \Exception( "Could not remove {$zip_dir}." );
		}

		$output->writeln( "Removing build dir: {$build_dir}" );
		if ( file_exists( $build_dir ) && DirectoryUtils::rmdir( $build_dir ) !== 0 ) {
			throw new \Exception( "Could not remove {$build_dir}." );
		}

		$output->writeln( 'Pup cleanup is complete.' );
		return 0;
	}
}
