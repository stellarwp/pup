<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Command\Command;
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
		parent::execute( $input, $output );
		$io          = $this->getIO();
		$config      = App::getConfig();
		$root        = $input->getOption( 'root' );
		$build_steps = $config->getBuildCommands( $input->getOption( 'dev' ) );
		$result      = 0;

		if ( $root ) {
			chdir( $root );
		}

		$io->writeln( '<comment>Running build steps...</comment>' );
		foreach ( $build_steps as $step ) {
			$bail_on_failure = true;
			if ( strpos( $step, '@' ) === 0 ) {
				$bail_on_failure = false;
				$step = substr( $step, 1 );
			}
			$io->section( "> <fg=cyan>{$step}</>" );
			system( $step, $result );
			$io->newLine();

			if ( $result ) {
				$io->writeln( "[FAIL] Build step failed: {$step}" );

				if ( $bail_on_failure ) {
					$io->writeln( "<fg=red>Exiting...</>" );
					return $result;
				}
			}
		}

		if ( $root ) {
			chdir( $config->getWorkingDir() );
		}

		$io->writeln( '<fg=green>✓</> <success>Build complete.</success>' );
		return 0;
	}
}
