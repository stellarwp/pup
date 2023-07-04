<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Build extends Command {
	/**
	 * @inheritDoc
	 */
	protected function configure() {
		$this->setName( 'build' )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Run the dev build commands.' )
			->setDescription( 'Run the build commands.' )
			->setHelp( 'Run the build commands.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$config        = App::$config;
		$extra_config  = $config->get();
		$build         = (array) $extra_config->build;
		$build_dev     = (array) $extra_config->build_dev;

		if ( $input->getOption( 'dev' ) && ! empty( $build_dev ) ) {
			$build_steps = $build_dev;
		} else {
			$build_steps = $build;
		}

		foreach ( $build_steps as $step ) {
			passthru( $step );
		}
	}
}
