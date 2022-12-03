<?php

namespace StellarWP\Pup;

use Symfony\Component\Console\Application as Symfony_Application;

class App extends Symfony_Application {
	/**
	 * @param string $version
	 */
	public function __construct( string $version ) {
		parent::__construct( 'pup', $version );

		$this->add( new Commands\Package() );
	}
}