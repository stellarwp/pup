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
			->setAliases( [ 'check:dev' ] )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Is this a dev build?' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Run checks against codebase.' )
			->setHelp( 'Run checks against codebase.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );

		$command     = $input->getFirstArgument();
		$aliases     = $this->getAliases();
		$root        = $input->getOption( 'root' );
		$is_dev      = $input->getOption( 'dev' ) || in_array( $command, $aliases );
		$application = $this->getApplication();

		if ( ! $application ) {
			throw new BaseException( 'Could not run pup.' );
		}

		$command = $application->find( 'workflow' );
		$arguments = [
			'workflow' => $is_dev ? 'checks:dev' : 'checks',
		];

		if ( $root ) {
			$arguments['--root'] = $root;
		}

		$command_input = new ArrayInput( $arguments );
		return $command->run( $command_input, $output );

		if ( ! empty( $failures ) ) {
			$io->writeln( "\n<error>The following checks failed:</error> \n* " . implode( "\n* ", $failures ) );
		}

		return 0;
	}
}
