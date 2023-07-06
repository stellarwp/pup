<?php

namespace StellarWP\Pup;

use Symfony\Component\Console\Application as Symfony_Application;
use Symfony\Component\Console\Output\OutputInterface;

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
	 * @var ?CheckCollection
	 */
	public static $check_collection;

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
		$this->add( new Commands\Clean() );
		$this->add( new Commands\GetVersion() );
		$this->add( new Commands\Help() );
		$this->add( new Commands\Package() );
		$this->add( new Commands\Zip() );

		$this->setDefaultCommand( 'help' );
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
	 * @return CheckCollection
	 */
	public static function getCheckCollection(): CheckCollection {
		if ( ! isset( static::$check_collection ) ) {
			static::$check_collection = new CheckCollection();
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
}