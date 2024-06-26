<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class WorkflowCest extends AbstractBase {
	public function _before( CliTester $I ) {
		parent::_before( $I );
	}

	/**
	 * @test
	 */
	public function it_should_run_workflow( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['workflows'] = [];
		$puprc['workflows']['bork'] = [];
		$puprc['workflows']['bork'][] = 'echo "fake project, yo"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} workflow bork" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'fake project, yo' );
		$I->seeInShellOutput( 'Workflow complete.' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_do( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['workflows'] = [];
		$puprc['workflows']['bork'] = [];
		$puprc['workflows']['bork'][] = 'echo "fake project, yo"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} do bork" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'fake project, yo' );
		$I->seeInShellOutput( 'Workflow complete.' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_build_as_workflow( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['build'][] = 'echo "fake project, yo"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} do build" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'fake project, yo' );
		$I->seeInShellOutput( 'Workflow complete.' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_build_dev_as_workflow( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['build_dev'][] = 'echo "fake project, yo"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} do build_dev" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'fake project, yo' );
		$I->seeInShellOutput( 'Workflow complete.' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_an_empty_workflow( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['workflows'] = [];
		$puprc['workflows']['bork'] = [];
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} do bork" );
		$I->seeResultCodeIs( 0 );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_fail_non_existent_workflow( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['workflows'] = [];
		$puprc['workflows']['bork'] = [];
		$puprc['workflows']['bork'][] = 'echo "fake project, yo"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} workflow whee", false );
		$I->seeResultCodeIs( 1 );
		$I->seeInShellOutput( '\'whee\' does not exist.' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
