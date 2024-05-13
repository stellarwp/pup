<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
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

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( '.puprc' );
		$I->seeInShellOutput( 'bootstrap.php' );
		$I->seeInShellOutput( 'fake project, yo' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_no_build_steps_when_not_set_in_puprc( CliTester $I ) {
		$puprc = $this->get_puprc();
		unset( $puprc['build'] );
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'Workflow complete.' );
		$I->dontSeeInShellOutput( '.puprc' );
		$I->dontSeeInShellOutput( 'bootstrap.php' );
		$I->dontSeeInShellOutput( 'fake project, yo' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_no_build_steps_when_missing_puprc( CliTester $I ) {
		chdir( $this->tests_root . '/_data/fake-project' );
		$I->runShellCommand( "php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'Workflow complete.' );
		$I->seeInShellOutput( "Running build workflow steps...\nWorkflow complete." );
		$I->dontSeeInShellOutput( '.puprc' );
		$I->dontSeeInShellOutput( 'bootstrap.php' );
		$I->dontSeeInShellOutput( 'fake project, yo' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
