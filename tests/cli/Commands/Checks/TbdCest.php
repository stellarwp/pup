<?php

namespace StellarWP\Pup\Tests\Cli\Commands\Checks;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class TbdCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_run_successful_tbd_check( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} check:tbd" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'Success!' );
		$I->dontSeeInShellOutput( '[tbd]' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_fail_tbd_check_when_tbds_exist( CliTester $I ) {
		$this->write_default_puprc( 'fake-project-with-tbds' );

		chdir( $this->tests_root . '/_data/fake-project-with-tbds' );

		try {
			$I->runShellCommand( "php {$this->pup} check:tbd" );
		} catch ( \Exception $e ) {}

		$I->seeResultCodeIs( 1 );
		$I->seeInShellOutput( 'TBDs have been found!' );
		$I->dontSeeInShellOutput( '[tbd]' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
