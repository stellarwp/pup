<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions\BaseException;
use StellarWP\Pup\Command\Command;
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
		$is_dev        = $input->getOption( 'dev' );
		$workflow_slug = $input->getArgument( 'workflow' );
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
			$io->writeln( 'workflows:' );
			$io->writeln( '    my-workflow:' );
			$io->writeln( '        - composer install' );
			$io->writeln( '        - npm run build' );
			$io->writeln( '' );
			return 0;
		}

		$original_workflow_slug = $workflow_slug;

		// Support workflows with :dev as a suffix and convert it to <slug>_dev. If :dev is provided and there isn't a <slug>_dev, use <slug>.
		$workflow_slug_parts = explode( ':', $workflow_slug );
		if ( ! empty( $workflow_slug_parts[1] ) && $workflow_slug_parts[1] === 'dev' ) {
			$is_dev = true;
			if ( $collection->has( $workflow_slug_parts[0] . '_dev' ) ) {
				$workflow_slug = $workflow_slug_parts[0] . '_dev';
			} else {
				$workflow_slug = $workflow_slug_parts[0];
			}
		}

		$workflow = $collection->get( $workflow_slug );
		if ( ! $workflow ) {
			$io->writeln( "<error>The workflow '{$original_workflow_slug}' does not exist.</error>" );
			return 1;
		}

		if ( $root ) {
			chdir( $root );
		}

		$failures = [];

		$io->writeln( "<comment>Running {$workflow_slug} workflow steps...</comment>" );
		foreach ( $workflow->getCommands() as $step ) {
			$bail_on_failure = true;
			if ( strpos( $step, '@' ) === 0 ) {
				$bail_on_failure = false;
				$step = substr( $step, 1 );
			}

			$io->section( "> <fg=cyan>{$step}</>" );

			$is_pup_command = false;
			if ( strpos( $step, 'pup' ) === 0 ) {
				$is_pup_command = true;
			}

			// If we are executing checks, ensure that the check configurations for bailing/continuing on failure are observed.
			if ( $bail_on_failure && preg_match( '/^pup check:([^ ]+)/', $step, $matches ) ) {
				$check  = $matches[1];
				$checks = $config->getChecks();
				if ( ! empty( $checks[ $check ] ) ) {
					$check_config = $checks[ $check ];

					$bail_on_failure = $is_dev ? $check_config->shouldBailOnFailureDev() : $check_config->shouldBailOnFailure();
				}
			}

			// If we are executing from within a composer command, ensure that pup sub commands are run with composer.
			if ( App::isComposer() && strpos( $step, 'pup ' ) === 0 ) {
				$step = preg_replace( '/^pup/', 'composer run -- pup', $step );
			} elseif ( App::isPhar() && strpos( $step, 'pup ' ) === 0 ) {
				$step = str_replace( 'pup', \Phar::running( false ), $step );
			}

			// Pass on relevant options to pup commands.
			if ( $is_pup_command ) {
				if ( ! empty( $root ) ) {
					$step .= " --root='{$root}'";
				}

				if ( $is_dev ) {
					$step .= " --dev";
				}
			}

			system( $step, $result );
			$io->newLine();

			if ( $result ) {
				$io->writeln( "<fg=red>[✗] {$step} failed.</>" );
				$failures[] = $step;

				if ( $bail_on_failure ) {
					$io->writeln( "<fg=red>Exiting...</>" );
					return $result;
				}

				continue;
			}

			$io->writeln( "<success>[✓]</success> {$step} completed successfully.\n" );
		}

		if ( $root ) {
			chdir( $config->getWorkingDir() );
		}

		if ( empty( $failures ) ) {
			$io->writeln( '<success>Workflow complete.</success>' );
		} else {
			$io->writeln( '<fg=yellow>Workflow complete with failures.</>' );

			if ( ! empty( $failures ) ) {
				$io->writeln( "\nThe following checks failed: \n* " . implode( "\n* ", $failures ) );
			}
		}

		return 0;
	}
}
