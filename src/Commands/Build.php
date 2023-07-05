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
		$config      = App::$config;
		$build_steps = $config->getBuildCommands( $input->getOption( 'dev' ) );
		$result      = 0;

		foreach ( $build_steps as $step ) {
			system( $step, $result );

			if ( $result ) {
				$output->writeln( "Build step failed: {$step}" );
				return $result;
			}
		}

		$output->writeln( 'Build complete.' );
		return 0;
	}
}
