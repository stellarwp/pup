<?php

namespace StellarWP\Pup\Tests\Cli;

use StellarWP\Pup\Tests\CliTester;

class AbstractBase {
	protected $pup;

	public function _before( CliTester $I ) {
		$this->pup = dirname( dirname( __DIR__ ) ) . '/pup';
	}
}
