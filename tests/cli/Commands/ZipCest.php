<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class ZipCest extends AbstractBase {
	protected function reset_data_and_location() {
		chdir( __DIR__ );
		@unlink( $this->tests_root . '/_data/fake-project/.puprc' );
		@unlink( $this->tests_root . '/_data/fake-project/fake-project.1.0.0.zip' );
	}

	/**
	 * @test
	 */
	public function it_should_zip_with_repo_using_path( CliTester $I ) {
		$this->reset_data_and_location();
		$project_path = $this->tests_root . '/_data/fake-project-git-repo';
		$I->runShellCommand( 'rm -rf ' . $project_path );
		$I->runShellCommand( 'cp -r ' . $this->tests_root . '/_data/fake-project ' . $project_path );

		$current_dir = getcwd();
		chdir( $project_path );

		$I->runShellCommand( 'git init --quiet' );
		$I->runShellCommand( 'git add .' );
		$I->runShellCommand( 'git commit -m "Initial commit" --quiet' );

		$puprc = $this->get_puprc();
		$puprc['repo'] = $project_path;
		$this->write_puprc( $puprc, 'fake-project-git-repo' );

		$I->runShellCommand( "php {$this->pup} zip" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( 'rm *.zip' );
		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();

		$I->runShellCommand( 'rm -rf ' . $project_path );
	}

	/**
	 * @test
	 */
	public function it_should_zip_with_repo_using_file_colon_slash_slash( CliTester $I ) {
		$this->reset_data_and_location();
		$project_path = $this->tests_root . '/_data/fake-project-git-repo';
		$I->runShellCommand( 'rm -rf ' . $project_path );
		$I->runShellCommand( 'cp -r ' . $this->tests_root . '/_data/fake-project ' . $project_path );

		$current_dir = getcwd();
		chdir( $project_path );

		$I->runShellCommand( 'git init --quiet' );
		$I->runShellCommand( 'git add .' );
		$I->runShellCommand( 'git commit -m "Initial commit" --quiet' );

		$puprc = $this->get_puprc();
		$puprc['repo'] = 'file://' . $project_path;
		$this->write_puprc( $puprc, 'fake-project-git-repo' );

		$I->runShellCommand( "php {$this->pup} zip" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( 'rm *.zip' );
		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();

		$I->runShellCommand( 'rm -rf ' . $project_path );
	}

	/**
	 * @test
	 */
	public function it_should_zip_without_cloning( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		$current_dir = getcwd();
		chdir( $this->tests_root . '/_data/fake-project' );
		//$I->runShellCommand( 'rm *.zip' );

		$I->runShellCommand( "php {$this->pup} zip --no-clone" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( 'rm *.zip' );
		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();
	}


	/**
	 * @test
	 */
	public function it_should_zip_without_running_checks_when_checks_are_empty( CliTester $I ) {
		$this->reset_data_and_location();
		$puprc = $this->get_puprc();
		$puprc['checks'] = [];
		$this->write_puprc( $puprc );

		$current_dir = getcwd();
		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} zip --no-clone" );
		$I->seeResultCodeIs( 0 );
		$I->dontSeeInShellOutput( '[tbd]' );
		$I->dontSeeInShellOutput( '[version-conflict]' );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( 'rm *.zip' );
		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();
	}
}
