<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\Exceptions\BaseException;
use Symfony\Component\Console\Input\ArrayInput;
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
			->setAliases( [ 'build:dev' ] )
			->setDescription( 'Run the build commands.' )
			->setHelp( 'Run the build commands.' );
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
			'workflow' => $is_dev ? 'build:dev' : 'build',
		];

		if ( $root ) {
			$arguments['--root'] = $root;
		}

		$command_input = new ArrayInput( $arguments );
		return $command->run( $command_input, $output );
	}
}
