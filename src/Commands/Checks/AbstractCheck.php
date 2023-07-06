<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use StellarWP\Pup\CheckConfig;
use StellarWP\Pup\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

abstract class AbstractCheck extends Command {
	/**
	 * The Config for this check.
	 * @var CheckConfig
	 */
	public $check_config;

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
	 * @inheritDoc
	 *
	 * @return void
	 */
	final protected function configure() {
		if ( empty( static::$slug ) ) {
			throw new \Exception( 'The "public static $slug" property must be set in ' . __CLASS__ . '.' );
		}

		$this->setName( 'check:' . static::$slug );
		$this->addOption( 'dev', null, InputOption::VALUE_NONE, 'Is this a dev build?' );
		$this->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' );
		$this->checkConfigure();

		$config = App::getConfig();
		$check_configs = $config->getChecks();
		if ( ! empty( $check_configs[ static::$slug ] ) ) {
			$this->check_config = $check_configs[ static::$slug ];
			$this->args = $check_configs[ static::$slug ]->getArgs();
		} else {
			$this->check_config = new CheckConfig( static::$slug, [] );
		}

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
	 * Should this command bail on failure for dist builds?
	 * @return bool
	 */
	public function shouldBailOnFailure(): bool {
		$config = App::getConfig();
		$checks = $config->getChecks();
		if ( isset( $checks[ $this->getSlug() ] ) ) {
			return $checks[ $this->getSlug() ]->shouldBailOnFailure();
		}

		return false;
	}

	/**
	 * Should this command bail on failure for dev builds?
	 * @return bool
	 */
	public function shouldBailOnFailureDev(): bool {
		$config = App::getConfig();
		$checks = $config->getChecks();
		if ( isset( $checks[ $this->getSlug() ] ) ) {
			return $checks[ $this->getSlug() ]->shouldBailOnFailureDev();
		}

		return false;
	}
}