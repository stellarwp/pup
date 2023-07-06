<?php

namespace StellarWP\Pup;

use Symfony\Component\Console\Application as Symfony_Application;
use Symfony\Component\Console\Output\OutputInterface;

class App extends Symfony_Application {
	/**
	 * @var ?Config
	 */
	public static $config;

	/**
	 * @param string $version
	 */
	public function __construct( string $version ) {
		parent::__construct( 'pup', $version );

		$this->add( new Commands\Build() );
		$this->add( new Commands\Clean() );
		$this->add( new Commands\GetVersion() );
		$this->add( new Commands\Help() );
		$this->add( new Commands\Package() );
		$this->add( new Commands\Zip() );

		$this->setDefaultCommand( 'help' );
	}

	public function renderThrowable( \Throwable $e, OutputInterface $output ): void {
		$output->writeln( $e->getMessage() );
	}

	public static function getConfig(): Config {
		if ( ! isset( static::$config ) ) {
			static::$config = new Config();
		}

		return static::$config;
	}
}