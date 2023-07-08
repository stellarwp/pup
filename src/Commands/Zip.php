<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Output\BufferedOutput;

class Zip extends Command {
	/**
	 * @var InputInterface
	 */
	protected $input;

	/**
	 * @var OutputInterface
	 */
	protected $output;

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'zip' )
			->addArgument( 'branch', InputArgument::OPTIONAL, 'The branch to zip.' )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Run the dev build commands.' )
			->addOption( 'no-clone', null, InputOption::VALUE_NONE, 'Whether or not to clone.' )
			->setDescription( 'Run through the whole pup workflow with a resulting zip at the end.' )
			->setHelp( 'Run through the whole pup workflow with a resulting zip at the end.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );
		$this->input = $input;
		$this->output = $output;
		$branch = $this->input->getArgument( 'branch' );

		if ( ! $this->input->getOption( 'no-clone' ) ) {
			$branch_arg = '';
			if ( $branch ) {
				$branch_arg = "-b {$branch}";
			}

			$repo = App::getConfig()->getRepo();

			$output->writeln( '<comment>Cloning the ' . $repo . ' repo into ' . App::getConfig()->getBuildDir( false ) . '...</comment>' );
			system( 'git clone --quiet --recursive ' . $branch_arg . ' ' . $repo . ' ' . App::getConfig()->getBuildDir( false ) );
			$output->writeln( 'Clone complete.' );
		} elseif ( $branch ) {
			system( 'git checkout --quiet ' . $branch );
		}

		$results = $this->runBuild();
		if ( $results !== 0 ) {
			$output->writeln( '<error>The build step of `pup zip` failed.</error>' );
			$output->writeln( '<info>Note: if you have a .nvmrc file, you may need to run "nvm use" before running "pup".</info>' );
			return $results;
		}

		$collection = App::getCheckCollection();
		if ( $collection->count() > 0 ) {
			$results = $this->runCheck();
			if ( $results !== 0 ) {
				return $results;
			}
		}

		$version = $this->runGetVersion();
		$results = $this->runPackage( $version );
		if ( $results !== 0 ) {
			$output->writeln( '<error>The package step of `pup zip` failed.</error>' );
			return $results;
		}

		$results = $this->runClean();
		if ( $results !== 0 ) {
			$output->writeln( '<error>The clean step of `pup zip` failed.</error>' );
			return $results;
		}
		return 0;
	}

	/**
	 * Run the build command.
	 *
	 * @throws \Symfony\Component\Console\Exception\ExceptionInterface
	 *
	 * @return int
	 */
	protected function runBuild(): int {
		$application = $this->getApplication();
		if ( ! $application ) {
			return 1;
		}

		$command = $application->find( 'build' );
		$arguments = [];

		if ( $this->input->getOption( 'dev' ) ) {
			$arguments['--dev'] = true;
		}

		if ( ! $this->input->getOption( 'no-clone' ) ) {
			$arguments['--root'] = App::getConfig()->getBuildDir();
		}

		$command_input = new ArrayInput( $arguments );
		return $command->run( $command_input, $this->output );
	}

	/**
	 * Run the build command.
	 *
	 * @throws \Symfony\Component\Console\Exception\ExceptionInterface
	 *
	 * @return int
	 */
	protected function runCheck(): int {
		$application = $this->getApplication();
		if ( ! $application ) {
			return 1;
		}

		$command = $application->find( 'check' );
		$arguments = [];

		if ( $this->input->getOption( 'dev' ) ) {
			$arguments['--dev'] = true;
		}

		if ( ! $this->input->getOption( 'no-clone' ) ) {
			$arguments['--root'] = App::getConfig()->getBuildDir();
		}

		$command_input = new ArrayInput( $arguments );
		return $command->run( $command_input, $this->output );
	}

	/**
	 * Run the get-version command.
	 *
	 * @throws \Symfony\Component\Console\Exception\ExceptionInterface
	 *
	 * @return string
	 */
	protected function runGetVersion(): string {
		$application = $this->getApplication();
		if ( ! $application ) {
			return 'unknown';
		}

		$command = $application->find( 'get-version' );
		$arguments = [];

		if ( $this->input->getOption( 'dev' ) ) {
			$arguments['--dev'] = true;
		}

		if ( ! $this->input->getOption( 'no-clone' ) ) {
			$arguments['--root'] = App::getConfig()->getBuildDir();
		}

		$buffer = new BufferedOutput();

		$command_input = new ArrayInput( $arguments );
		$results = $command->run( $command_input, $buffer );

		if ( $results !== 0 ) {
			return 'unknown';
		}

		return trim( $buffer->fetch() );
	}

	/**
	 * Run the clean command.
	 *
	 * @throws \Symfony\Component\Console\Exception\ExceptionInterface
	 *
	 * @return int
	 */
	protected function runClean() {
		$application = $this->getApplication();
		if ( ! $application ) {
			return 1;
		}

		$command = $application->find( 'clean' );
		$arguments = [];

		$command_input = new ArrayInput( $arguments );
		return $command->run( $command_input, $this->output );
	}

	/**
	 * Run the package command.
	 *
	 * @param string $version The version to package.
	 *
	 * @throws \Symfony\Component\Console\Exception\ExceptionInterface
	 *
	 * @return int
	 */
	protected function runPackage( string $version ) {
		$application = $this->getApplication();
		if ( ! $application ) {
			return 1;
		}

		$command = $application->find( 'package' );
		$arguments = [
			'version' => $version,
		];

		if ( ! $this->input->getOption( 'no-clone' ) ) {
			$arguments['--root'] = App::getConfig()->getBuildDir();
		}

		$command_input = new ArrayInput( $arguments );
		return $command->run( $command_input, $this->output );
	}
}
