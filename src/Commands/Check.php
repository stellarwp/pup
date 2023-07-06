<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions\BaseException;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class Check extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'check' )
			->addArgument( 'module', InputArgument::OPTIONAL, 'Module to use as a check' )
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

		foreach ( $collection as $check ) {
			$command = $application->find( $check->getSlug() );
			$results = $command->run( new ArrayInput( $check->getArgs() ), $output );
			if ( $results !== 0 ) {
				$failures[] = $check->getSlug();

				if ( $check->bailOnFailure() ) {
					return $results;
				}
			}
		}

		if ( ! empty( $failures ) ) {
			$output->writeln( "<error>The following checks failed: \n* " . implode( "\n* ", $failures ) . '</error>' );
		}

		return 0;
	}
}