<?php

namespace StellarWP\Pup\Commands;

use Exception;
use StellarWP\Pup\Config;
use stdClass;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Package extends Command {
	/**
	 * @var string Pup root directory.
	 */
	protected $dir;

	/**
	 * @var stdClass
	 */
	protected $config;

	/**
	 * @inheritDoc
	 */
	protected function configure() {
		$this->setName( 'package' )
			->addOption( 'path', null, InputOption::VALUE_REQUIRED, 'Path to plugin' )
			->addOption( 'branch', null, InputOption::VALUE_REQUIRED, 'Branch to be packaged' )
			->addOption( 'final', null, InputOption::VALUE_NONE, 'Package the zip without a hash in the filename' )
			->setDescription( 'Packages the project for distribution.' )
			->setHelp( 'This command allows you to package the project for distribution.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$this->dir = $input->getOption( 'path' ) ?: getcwd();

		try {
			$this->config = new Config( $this->dir );
		} catch ( Exception $e ) {
			$output->writeln( "<error>{$e->getMessage()}</error>" );

			return 1;
		}

		return 0;
	}
}