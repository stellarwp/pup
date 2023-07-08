<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class PackageCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_package_the_zip( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( 'rm fake-project.1.0.0.zip' );
		$I->runShellCommand( "php {$this->pup} clean" );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_without_version_number_if_unknown( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package unknown" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( 'rm fake-project.zip' );
		$I->runShellCommand( "php {$this->pup} clean" );
	}
}
