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
		$puprc = $this->get_puprc();
		$puprc['build'][] = 'echo "fake project, yo"';
		$this->write_puprc( $puprc );

		chdir( dirname( __DIR__ ) . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'drwxr-xr-x' );
		$I->seeInShellOutput( 'fake project, yo' );
	}

	/**
	 * @test
	 */
	public function it_should_run_no_build_steps_when_not_set_in_puprc( CliTester $I ) {
		$puprc = $this->get_puprc();
		unset( $puprc['build'] );
		$this->write_puprc( $puprc );

		chdir( dirname( __DIR__ ) . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'Build complete.' );
		$I->dontSeeInShellOutput( 'drwxr-xr-x' );
		$I->dontSeeInShellOutput( 'fake project, yo' );
	}

	/**
	 * @test
	 */
	public function it_should_run_no_build_steps_when_missing_puprc( CliTester $I ) {
		chdir( dirname( __DIR__ ) . '/_data/fake-project' );
		$I->runShellCommand( "php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'Build complete.' );
		$I->dontSeeInShellOutput( 'drwxr-xr-x' );
		$I->dontSeeInShellOutput( 'fake project, yo' );
	}
}
