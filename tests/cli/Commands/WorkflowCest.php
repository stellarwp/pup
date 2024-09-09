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

	/**
	 * @test
	 */
	public function it_should_run_build_with_default_env_vars( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['workflows'] = [];
		$puprc['workflows']['bork'] = [];
		$puprc['workflows']['bork'][] = 'echo "NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "NODE_AUTH_TOKEN=123 php {$this->pup} do bork" );
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
		$puprc['workflows'] = [];
		$puprc['workflows']['bork'] = [];
		$puprc['workflows']['bork'][] = 'echo "NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN"';
		$puprc['workflows']['bork'][] = 'echo "BORK=$BORK"';
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "NODE_AUTH_TOKEN=123 BORK=abc php {$this->pup} do bork" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'NODE_AUTH_TOKEN=123' );
		$I->seeInShellOutput( 'BORK=abc' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_pass_additional_arguments_and_options_to_workflow_script( CliTester $I ) {
		$puprc                                 = $this->get_puprc();
		$puprc['workflows']                    = [];
		$puprc['workflows']['test-workflow']   = [];
		$puprc['workflows']['test-workflow'][] = codecept_data_dir( 'test-workflow-script.sh' );
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} do test-workflow -- arg1 arg2 --option-one=one --option-two=two" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'Argument: arg1' );
		$I->seeInShellOutput( 'Argument: arg2' );
		$I->seeInShellOutput( 'Option: --option-one, Value: one' );
		$I->seeInShellOutput( 'Option: --option-two, Value: two' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
