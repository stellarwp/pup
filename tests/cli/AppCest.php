<?php

namespace StellarWP\Pup\Tests;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class AppCest extends AbstractBase {
	/**
	 * @test
	 */
	public function it_should_show_version( CliTester $I ) {
		$I->runShellCommand( "php {$this->pup} --version" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'pup ' );
		$I->seeInShellOutput( 'Using: PHP ' );
	}
}
