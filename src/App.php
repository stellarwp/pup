<?php

namespace StellarWP\Pup;

use Symfony\Component\Console\Application as Symfony_Application;

class App extends Symfony_Application {
	/**
	 * @var Config
	 */
	public static $config;

	/**
	 * @param string $version
	 */
	public function __construct( string $version ) {
		parent::__construct( 'pup', $version );

		static::$config = new Config();

		$this->add( new Commands\GetVersion() );
		$this->add( new Commands\Package() );
	}
}