<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class GetVersionCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_get_the_version_from_the_plugin( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} get-version" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( '1.0.0' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
