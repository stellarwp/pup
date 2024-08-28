<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class CloneCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_clone_the_default_branch_of_a_git_repo( CliTester $I ) {
		$project_path = $this->tests_root . '/_data/fake-project-git-repo';
		system( 'rm -rf ' . $project_path );
		system( 'cp -r ' . $this->tests_root . '/_data/fake-project ' . $project_path );

		chdir( $project_path );

		system( 'cd ' . $project_path . ' && git init --quiet' );
		system( 'cd ' . $project_path . ' && git add .' );
		system( 'cd ' . $project_path . ' && git config user.email "fake@fake.fake"' );
		system( 'cd ' . $project_path . ' && git config user.name "Fake Fake"' );
		system( 'cd ' . $project_path . ' && git commit -m "Initial commit" --quiet' );

		$puprc = $this->get_puprc();
		$puprc['repo'] = $project_path;
		$this->write_puprc( $puprc, 'fake-project-git-repo' );

		$I->runShellCommand( "php {$this->pup} clone" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( '.pup-build/bootstrap.php' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();

		system( 'rm -rf ' . $project_path );
	}

	/**
	 * @test
	 */
	public function it_should_clone_a_specific_branch_of_a_git_repo( CliTester $I ) {
		$project_path = $this->tests_root . '/_data/fake-project-git-repo';
		system( 'rm -rf ' . $project_path );
		system( 'cp -r ' . $this->tests_root . '/_data/fake-project ' . $project_path );

		chdir( $project_path );

		system( 'cd ' . $project_path . ' && git init --quiet' );
		system( 'cd ' . $project_path . ' && git add .' );
		system( 'cd ' . $project_path . ' && git config user.email "fake@fake.fake"' );
		system( 'cd ' . $project_path . ' && git config user.name "Fake Fake"' );
		system( 'cd ' . $project_path . ' && git commit -m "Initial commit" --quiet' );
		system( 'cd ' . $project_path . ' && git checkout -b other-branch --quiet' );
		system( 'cd ' . $project_path . ' && touch new-file.txt' );
		system( 'cd ' . $project_path . ' && git add new-file.txt' );
		system( 'cd ' . $project_path . ' && git commit new-file.txt -m "Added new file" --quiet' );

		$puprc = $this->get_puprc();
		$puprc['repo'] = $project_path;
		$this->write_puprc( $puprc, 'fake-project-git-repo' );

		$I->runShellCommand( "php {$this->pup} clone --branch other-branch" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( '.pup-build/new-file.txt' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();

		system( 'rm -rf ' . $project_path );
	}
}
