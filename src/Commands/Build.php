<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Build extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'build' )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Run the dev build commands.' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Run the build commands.' )
			->setHelp( 'Run the build commands.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$config      = App::getConfig();
		$root        = $input->getOption( 'root' );
		$build_steps = $config->getBuildCommands( $input->getOption( 'dev' ) );
		$result      = 0;

		if ( $root ) {
			chdir( $root );
		}

		foreach ( $build_steps as $step ) {
			$output->writeln( "<info>Running: {$step}</info>" );
			system( $step, $result );

			if ( $result ) {
				$output->writeln( "Build step failed: {$step}" );
				return $result;
			}
		}

		if ( $root ) {
			chdir( $config->getWorkingDir() );
		}

		$output->writeln( 'Build complete.' );
		return 0;
	}
}
