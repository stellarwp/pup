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
		$config    = App::$config;
		$clone_dir = $config->getCloneDir();
		$build_dir = $config->getBuildDir();

		$output->writeln( "Removing clone dir: {$clone_dir}" );
		if ( file_exists( $clone_dir ) && ! DirectoryUtils::rmdir( $clone_dir ) ) {
			throw new \Exception( "Could not remove {$clone_dir}." );
		}

		$output->writeln( "Removing build dir: {$build_dir}" );
		if ( file_exists( $build_dir ) && ! DirectoryUtils::rmdir( $build_dir ) ) {
			throw new \Exception( "Could not remove {$build_dir}." );
		}

		$output->writeln( 'Pup cleanup is complete.' );
		return 0;
	}
}
