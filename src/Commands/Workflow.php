<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions\BaseException;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\Utils\Env;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Workflow extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'workflow' )
		     ->setAliases( [ 'do' ] )
		     ->addArgument( 'workflow', InputArgument::REQUIRED, 'The workflow you would like to run.' )
		     ->addArgument( 'extra_args', InputArgument::IS_ARRAY, 'Additional arguments to pass to the workflow.' )
		     ->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
		     ->addOption( 'extra_options', null, InputOption::VALUE_IS_ARRAY | InputOption::VALUE_OPTIONAL, 'Additional options to pass to the workflow.' )
		     ->setDescription( 'Run a command workflow.' )
		     ->setHelp( 'Run a command workflow.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );
		$config        = App::getConfig();
		$root          = $input->getOption( 'root' );
		$workflow_slug = $input->getArgument( 'workflow' );
		$extra_args    = $input->getArgument( 'extra_args' );
		$extra_options = $input->getOption( 'extra_options' );
		$io            = $this->getIO();
		$application   = $this->getApplication();
		if ( ! $application ) {
			throw new BaseException( 'Could not run pup.' );
		}

		$collection = $config->getWorkflows();

		if ( $collection->count() === 0 ) {
			$io->writeln( '📣 The .puprc does not have any workflows configured.' );
			$io->writeln( '💡 If you would like to use workflows, simply add a "<comment>workflows</comment>" property in <comment>.puprc</comment> similar to:' );
			$io->writeln( '' );
			$io->writeln( '"workflows": {' );
			$io->writeln( '    "my-workflow": [' );
			$io->writeln( '        "composer install",' );
			$io->writeln( '        "npm run build"' );
			$io->writeln( '    ]' );
			$io->writeln( '}' );
			$io->writeln( '' );
			return 0;
		}

		$workflow = $collection->get( $workflow_slug );
		if ( ! $workflow ) {
			$io->writeln( "<error>The workflow '{$workflow_slug}' does not exist.</error>" );
			return 1;
		}

		if ( $root ) {
			chdir( $root );
		}

		$io->writeln( "<comment>Running {$workflow_slug} workflow steps...</comment>" );
		foreach ( $workflow->getCommands() as $step ) {
			$bail_on_failure = true;
			if ( strpos( $step, '@' ) === 0 ) {
				$bail_on_failure = false;
				$step = substr( $step, 1 );
			}

			// Add extra arguments and options to the command.
			$extra_args_string    = implode( ' ', array_map( 'escapeshellarg', $extra_args ) );
			$extra_options_string = implode( ' ', array_map( static function ( $option ) {
				return escapeshellarg( $option );
			}, $extra_options ) );
			$full_command         = trim( "{$step} {$extra_args_string} {$extra_options_string}" );

			$io->section( "> <fg=cyan>{$full_command}</>" );
			system( Env::set( $full_command ), $result );
			$io->newLine();

			if ( $result ) {
				$io->writeln( "[FAIL] Workflow step failed: {$step}" );

				if ( $bail_on_failure ) {
					$io->writeln( "<fg=red>Exiting...</>" );
					return $result;
				}
			}

			if ( $root ) {
				chdir( $config->getWorkingDir() );
			}
		}

		$io->writeln( '<success>Workflow complete.</success>' );

		return 0;
	}
}
