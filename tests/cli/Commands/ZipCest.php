<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class ZipCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_zip_with_repo( CliTester $I ) {
		system( 'cp -r ' . $this->tests_root . '/_data/fake-project ' . $this->tests_root . '/_data/fake-project-git-repo' );
		system( 'git init' );
		system( 'git add .' );
		system( 'git commit -m "Initial commit"' );

		$puprc = $this->get_puprc();
		$puprc['repo'] = 'file://' . $this->tests_root . '/_data/fake-project-git-repo';
		$this->write_puprc( $puprc, 'fake-project-git-repo' );

		chdir( $this->tests_root . '/_data/fake-project-git-repo' );

		$I->runShellCommand( "php {$this->pup} zip" );
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
	public function it_should_zip_without_cloning( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} zip --no-clone" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( 'rm fake-project.1.0.0.zip' );
		$I->runShellCommand( "php {$this->pup} clean" );
	}
}
