<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use StellarWP\Pup\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

abstract class AbstractCheck extends Command {
	/**
	 * The slug for the command.
	 * @var string
	 */
	public static $slug = '';

	/**
	 * The arguments for the command.
	 * @var array<string, mixed>
	 */
	protected $args = [];

	/**
	 * Should this command bail on failure?
	 * @var bool
	 */
	protected $bail_on_failure = false;

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	final protected function configure() {
		if ( empty( static::$slug ) ) {
			throw new \Exception( 'The "public static $slug" property must be set in ' . __CLASS__ . '.' );
		}

		$this->setName( 'check:' . static::$slug );
		$this->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' );
		$this->checkConfigure();

		App::getCheckCollection()->add( $this );
	}

	/**
	 * Runs the wrapping execute command.
	 *
	 * @param InputInterface  $input
	 * @param OutputInterface $output
	 *
	 * @return int
	 */
	final protected function execute( InputInterface $input, OutputInterface $output ) {
		$config        = App::getConfig();
		$root          = $input->getOption( 'root' );

		if ( $root ) {
			chdir( $root );
		}

		$results = $this->checkExecute( $input, $output );

		if ( $root ) {
			chdir( $config->getWorkingDir() );
		}

		return $results;
	}

	/**
	 * Configure the check command.
	 *
	 * @return void
	 */
	abstract protected function checkConfigure(): void;

	/**
	 * Runs the check execute command.
	 *
	 * @param InputInterface  $input
	 * @param OutputInterface $output
	 *
	 * @return int
	 */
	abstract protected function checkExecute( InputInterface $input, OutputInterface $output );

	/**
	 * Get the check's slug.
	 *
	 * @return array<string, mixed>
	 */
	public function getArgs(): array {
		return $this->args;
	}

	/**
	 * Get the check's slug.
	 *
	 * @return string
	 */
	public function getSlug(): string {
		return static::$slug;
	}

	/**
	 * Should this command bail on failure?
	 * @return bool
	 */
	public function shouldBailOnFailure(): bool {
		return $this->bail_on_failure;
	}
}