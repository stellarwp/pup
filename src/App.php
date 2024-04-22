<?php

namespace StellarWP\Pup;

use StellarWP\Pup\Check;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\Commands\Checks\SimpleCheck;
use StellarWP\Pup\Exceptions\ConfigException;
use Symfony\Component\Console\Application as Symfony_Application;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Process\Process;

class App extends Symfony_Application {
	/**
	 * The instance.
	 * @var ?App
	 */
	public static $instance;

	/**
	 * @var ?Config
	 */
	public static $config;

	/**
	 * @var ?Check\Collection
	 */
	public static $check_collection;

	/**
	 * @var bool
	 */
	public static $is_phar = false;

	/**
	 * Get the instance.
	 *
	 * @return App
	 */
	public static function instance(): App {
		if ( ! isset( static::$instance ) ) {
			static::$instance = new self( PUP_VERSION );
		}

		return static::$instance;
	}

	/**
	 * @param string $version
	 */
	public function __construct( string $version ) {
		parent::__construct( 'pup', $version );

		static::getCheckCollection();

		$this->add( new Commands\Build() );
		$this->add( new Commands\Check() );
		$this->add( new Commands\Clean() );
		$this->add( new Commands\GetVersion() );
		$this->add( new Commands\Help() );
		$this->add( new Commands\I18n() );
		$this->add( new Commands\Info() );
		$this->add( new Commands\Package() );
		$this->add( new Commands\Zip() );
		$this->add( new Commands\ZipName() );

		// Add default pup checks.
		$this->add( new Commands\Checks\Tbd( 'tbd' ) );
		$this->add( new Commands\Checks\VersionConflict( 'version-conflict' ) );

		$this->addSimpleCheckCommands();
		$this->addClassCheckCommands();

		$this->setDefaultCommand( 'help' );
	}

	/**
	 * Adds Simple Check Commands to the application.
	 *
	 * @return void
	 */
	protected function addClassCheckCommands(): void {
		$checks = static::getConfig()->getChecks();

		foreach ( $checks as $check ) {
			if ( $check->getType() !== 'class' ) {
				continue;
			}

			$file = $check->getFile();
			$working_dir = static::getConfig()->getWorkingDir();

			$contents = file_get_contents( $working_dir . $file );
			if ( ! $contents ) {
				throw new ConfigException( 'Could not read external check class file: ' . $file );
			}

			preg_match( '/^\s*class\s+(\w+)/m', $contents, $matches );

			if ( ! isset( $matches[1] ) ) {
				throw new ConfigException( 'Could not find class name in external check class file: ' . $file );
			}

			$class_name = $matches[1];

			preg_match( '!^\s*namespace\s+([^;]+)!m', $contents, $matches );

			$namespace = '\\';
			if ( isset( $matches[1] ) ) {
				$namespace .= trim( $matches[1] );
			}

			include_once $working_dir . $file;

			$full_class_name = $namespace . '\\' . $class_name;

			/** @var Command */
			$object = new $full_class_name( $check->getSlug() );

			$this->add( $object );
		}
	}

	/**
	 * Adds Simple Check Commands to the application.
	 *
	 * @return void
	 */
	protected function addSimpleCheckCommands(): void {
		$checks = static::getConfig()->getChecks();

		foreach ( $checks as $check ) {
			if ( $check->getType() !== 'simple' ) {
				continue;
			}

			$this->add( new SimpleCheck( $check->getSlug() ) );
		}
	}

	/**
	 * Returns the long version of the application.
	 *
	 * @return string
	 */
	public function getLongVersion() {

		$process = new Process( [ 'php', '--version' ] );
		$process->run();

		$php_version_line = null;
		if ( $process->isSuccessful() ) {
			$php_version_line = $process->getOutput();
			$php_version_line = explode( "\n", $php_version_line );
			$php_version_line = $php_version_line[0];
		}

		return sprintf(
			'%1$s <info>%2$s</info> from <comment>%3$s</comment>' . ( $php_version_line ? PHP_EOL . 'Using: %4$s' : '' ),
			$this->getName(),
			$this->getVersion(),
			__PUP_DIR__ . '/pup',
			$php_version_line
		);
	}

	/**
	 * @inheritDoc
	 */
	public function renderThrowable( \Throwable $e, OutputInterface $output ): void {
		$output->writeln( $e->getMessage() );
	}

	/**
	 * Get the check collection.
	 *
	 * @return Check\Collection
	 */
	public static function getCheckCollection(): Check\Collection {
		if ( ! isset( static::$check_collection ) ) {
			static::$check_collection = new Check\Collection();
		}

		return static::$check_collection;
	}

	/**
	 * Get the config object.
	 *
	 * @return Config
	 */
	public static function getConfig(): Config {
		if ( ! isset( static::$config ) ) {
			static::$config = new Config();
		}

		return static::$config;
	}

	/**
	 * Get the workflow collection.
	 *
	 * @return Workflow\Collection
	 */
	public static function getWorkflowCollection(): Workflow\Collection {
		if ( ! isset( static::$workflow_collection ) ) {
			static::$workflow_collection = new Workflow\Collection();
		}

		return static::$workflow_collection;
	}

	/**
	 * Sets whether the app is running from a phar.
	 *
	 * @return bool
	 */
	public static function isPhar(): bool {
		return static::$is_phar;
	}

	/**
	 * Sets whether the app is running from a phar.
	 *
	 * @param bool $is_phar
	 *
	 * @return void
	 */
	public static function setIsPhar( bool $is_phar ): void {
		static::$is_phar = $is_phar;
	}
}
