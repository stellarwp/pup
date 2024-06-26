<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use StellarWP\Pup\Check;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\Command\Io;
use Symfony\Component\Console\Exception\LogicException;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

abstract class AbstractCheck extends Command {
	/**
	 * The Config for this check.
	 * @var Check\Config
	 */
	public $check_config;

	/**
	 * The slug for the command.
	 * @var string
	 */
	protected $slug = '';

	/**
	 * The arguments for the command.
	 * @var array<string, mixed>
	 */
	protected $args = [];

	/**
	 * Whether or not to set an output prefix.
	 *
	 * @var bool
	 */
	protected $should_set_prefix = false;

	/**
	 * @param string $slug The name of the command.
	 *
	 * @throws LogicException When the command name is empty
	 */
	public function __construct( string $slug = '' ) {
		if ( $slug ) {
			$this->slug = $slug;
		}

		parent::__construct( 'check:' . $this->slug );
	}

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	final protected function configure() {
		if ( empty( $this->slug ) ) {
			throw new \Exception( 'The "public $slug" property must be set in ' . __CLASS__ . '.' );
		}

		$this->addOption( 'prefix-output', null, InputOption::VALUE_NONE, 'Should output be prefixed by the slug?' );
		$this->addOption( 'dev', null, InputOption::VALUE_NONE, 'Is this a dev build?' );
		$this->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' );

		$config        = App::getConfig();
		$check_configs = $config->getChecks();
		if ( ! empty( $check_configs[ $this->slug ] ) ) {
			$this->check_config = $check_configs[ $this->slug ];
			$this->args = $check_configs[ $this->slug ]->getArgs();
			App::getCheckCollection()->add( $this );
		} else {
			$this->check_config = new Check\Config( $this->slug, [] );
		}

		$this->checkConfigure();
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
		parent::execute( $input, $output );
		$config        = App::getConfig();
		$root          = $input->getOption( 'root' );
		$this->should_set_prefix = (bool) $input->getOption( 'prefix-output' );

		if ( $this->should_set_prefix ) {
			$this->getIO()->setPrefix( $this->getSlug() );
		}

		if ( $root ) {
			chdir( $root );
		}

		$results = $this->checkExecute( $input, $this->getIO() );

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
	 * @param Io       $output
	 *
	 * @return int
	 */
	abstract protected function checkExecute( InputInterface $input, Io $output );

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
		return $this->slug;
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

	/**
	 * Write a message to the console.
	 *
	 * @param string $message
	 *
	 * @return void
	 */
	protected function writeln( string $message ) {
		$this->getIO()->writeln( $message );
	}
}
