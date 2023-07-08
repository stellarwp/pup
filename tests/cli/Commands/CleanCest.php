<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class CleanCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_clean_up_after_itself( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "mkdir .pup-build" );
		$I->runShellCommand( "mkdir .pup-zip" );
		$I->runShellCommand( "touch .pup-distignore" );
		$I->runShellCommand( "php {$this->pup} clean" );
		$I->seeResultCodeIs( 0 );

		$I->assertFalse( file_exists( '.pup-build' ) );
		$I->assertFalse( file_exists( '.pup-zip' ) );
		$I->assertFalse( file_exists( '.pup-distignore' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
