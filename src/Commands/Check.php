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
		$io = $this->getIO();
		$application = $this->getApplication();
		if ( ! $application ) {
			throw new BaseException( 'Could not run pup.' );
		}

		$collection = App::getCheckCollection();
		$failures = [];

		if ( $collection->count() === 0 ) {
			$io->writeln( '📣 The .puprc does not have any checks configured.' );
			$io->writeln( '💡 If you would like to use the defaults, simply remove the "<comment>checks</comment>" property in <comment>.puprc</comment>.' );

			$io->writeln( '' );
			$io->writeln( 'If you would like to use one of the default checks, add one or more of the following to the "<comment>checks</comment>" property in your <comment>.puprc</comment>:' );
			$io->writeln( '      "tbd": {}' );
			$io->writeln( '      "version-conflict": {}' );

			$io->writeln( '' );
			$io->writeln( 'If you would like to create your own check, take a look at the pup docs to learn how:' );
			$io->writeln( '      https://github.com/stellarwp/pup' );
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

					$io->writeln( "<fg=yellow>{$check->getSlug()}'s fail_method in <fg=cyan>.puprc</> is set to \"<fg=red>error</>\". Exiting...</>" );
					return $results;
				}
			}
		}

		if ( ! empty( $failures ) ) {
			$io->writeln( "\n<error>The following checks failed:</error> \n* " . implode( "\n* ", $failures ) );
		}

		return 0;
	}
}
