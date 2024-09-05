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
		$I->seeInShellOutput( 'Build complete.' );
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
		$I->seeInShellOutput( 'Build complete.' );
		$I->dontSeeInShellOutput( '.puprc' );
		$I->dontSeeInShellOutput( 'bootstrap.php' );
		$I->dontSeeInShellOutput( 'fake project, yo' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_build_with_default_env_vars( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['build'][] = 'echo "NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "NODE_AUTH_TOKEN=123 php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'NODE_AUTH_TOKEN=123' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_build_with_custom_env_vars( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['env'][] = 'BORK';
		$puprc['build'][] = 'echo "NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN"';
		$puprc['build'][] = 'echo "BORK=$BORK"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "NODE_AUTH_TOKEN=123 BORK=abc php {$this->pup} build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'NODE_AUTH_TOKEN=123' );
		$I->seeInShellOutput( 'BORK=abc' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
