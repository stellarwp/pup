<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions\BaseException;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Check extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'check' )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Is this a dev build?' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Run checks against codebase.' )
			->setHelp( 'Run checks against codebase.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$application = $this->getApplication();
		if ( ! $application ) {
			throw new BaseException( 'Could not run pup.' );
		}

		$collection = App::getCheckCollection();
		$failures = [];

		if ( $collection->count() === 0 ) {
			$output->writeln( '📣 The .puprc does not have any checks configured.' );
			$output->writeln( '💡 If you would like to use the defaults, simply remove the "<comment>checks</comment>" property in <comment>.puprc</comment>.' );

			$output->writeln( '' );
			$output->writeln( 'If you would like to use one of the default checks, add one or more of the following to the "<comment>checks</comment>" property in your <comment>.puprc</comment>:' );
			$output->writeln( '      "tbd": {}' );
			$output->writeln( '      "version-conflict": {}' );

			$output->writeln( '' );
			$output->writeln( 'If you would like to create your own check, take a look at the pup docs to learn how:' );
			$output->writeln( '      https://github.com/stellarwp/pup' );
			return 0;
		}

		foreach ( $collection as $check ) {
			$command = $application->find( 'check:' . $check->getSlug() );
			$args    = $check->getArgs();

			if ( $input->getOption( 'root' ) ) {
				$args['--root'] = $input->getOption( 'root' );
			}

			$args['--prefix-output'] = true;

			$results = $command->run( new ArrayInput( $args ), $output );
			if ( $results !== 0 ) {
				$failures[] = $check->getSlug();

				$should_bail_on_failure = $input->getOption( 'dev' ) ? $check->shouldBailOnFailureDev() : $check->shouldBailOnFailure();
				if ( $should_bail_on_failure ) {
					return $results;
				}
			}
		}

		if ( ! empty( $failures ) ) {
			$output->writeln( "\n<error>The following checks failed:</error> \n* " . implode( "\n* ", $failures ) );
		}

		return 0;
	}
}
