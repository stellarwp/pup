<?php

namespace StellarWP\Pup\Tests\Cli;

use StellarWP\Pup\Tests\CliTester;

class BuildCest extends AbstractBase {
	public function _before( CliTester $I ) {
		parent::_before( $I );
	}


	/**
	 * @test
	 */
	public function it_should_run_build( CliTester $I ) {
		chdir( dirname( __DIR__ ) . '/_data/fake-project' );
		$I->runShellCommand( "php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'drwxr-xr-x' );
		$I->seeInShellOutput( 'fake project, yo' );
	}
}
