<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class ZipNameCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_get_the_zip_name_from_the_plugin( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} zip-name" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'fake-project.1.0.0.1' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_get_the_dev_zip_name_from_the_plugin( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} zip-name --dev" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'fake-project.1.0.0.1-dev' );
	}
}
