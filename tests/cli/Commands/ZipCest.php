<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class ZipCest extends AbstractBase {
	protected function reset_data_and_location() {
		chdir( __DIR__ );
		$files = [
			'.puprc',
			'.distignore',
			'.distinclude',
			'.gitattributes',
			'fake-project.1.0.0.zip',
		];

		foreach ( $files as $file ) {
			@unlink( $this->tests_root . '/_data/fake-project/' . $file );
			@unlink( $this->tests_root . '/_data/fake-project-with-tbds/' . $file );
		}
	}

	/**
	 * @test
	 */
	public function it_should_zip_with_repo_using_path( CliTester $I ) {
		$this->reset_data_and_location();
		$project_path = $this->tests_root . '/_data/fake-project-git-repo';
		system( 'rm -rf ' . $project_path );
		system( 'cp -r ' . $this->tests_root . '/_data/fake-project ' . $project_path );

		chdir( $project_path );

		system( 'git init --quiet' );
		system( 'git add .' );
		system( 'git commit -m "Initial commit" --quiet' );

		$puprc = $this->get_puprc();
		$puprc['repo'] = $project_path;
		$this->write_puprc( $puprc, 'fake-project-git-repo' );

		$I->runShellCommand( "php {$this->pup} zip" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();

		system( 'rm -rf ' . $project_path );
	}

	/**
	 * @test
	 */
	public function it_should_zip_with_repo_using_file_colon_slash_slash( CliTester $I ) {
		$this->reset_data_and_location();
		$project_path = $this->tests_root . '/_data/fake-project-git-repo';
		system( 'rm -rf ' . $project_path );
		system( 'cp -r ' . $this->tests_root . '/_data/fake-project ' . $project_path );

		chdir( $project_path );

		system( 'git init --quiet' );
		system( 'git add .' );
		system( 'git commit -m "Initial commit" --quiet' );

		$puprc = $this->get_puprc();
		$puprc['repo'] = 'file://' . $project_path;
		$this->write_puprc( $puprc, 'fake-project-git-repo' );

		$I->runShellCommand( "php {$this->pup} zip" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();

		system( 'rm -rf ' . $project_path );
	}

	/**
	 * @test
	 */
	public function it_should_zip_without_cloning( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );
		//$I->runShellCommand( 'rm *.zip' );

		$I->runShellCommand( "php {$this->pup} zip --no-clone" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

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

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} zip --no-clone" );
		$I->seeResultCodeIs( 0 );
		$I->dontSeeInShellOutput( '[tbd]' );
		$I->dontSeeInShellOutput( '[version-conflict]' );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_fail_zipping_when_check_errors( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc( 'fake-project-with-tbds' );

		chdir( $this->tests_root . '/_data/fake-project-with-tbds' );

		try {
			$I->runShellCommand( "php {$this->pup} zip --no-clone" );
		} catch ( \Exception $e ) {
			// do nothing
		}

		$I->seeResultCodeIs( 1 );
		$I->seeInShellOutput( '[tbd]' );

		$I->assertFalse( file_exists( 'fake-project.1.0.0.zip' ) );

		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_zip_when_check_has_errors_but_set_to_warn( CliTester $I ) {
		$this->reset_data_and_location();
		$puprc = $this->get_puprc();
		$puprc['checks'] = [
			'tbd' => [
				'fail_method' => 'warn',
			],
			'version-conflict' => [],
		];
		$this->write_puprc( $puprc, 'fake-project-with-tbds' );

		chdir( $this->tests_root . '/_data/fake-project-with-tbds' );

		try {
			$I->runShellCommand( "php {$this->pup} zip --no-clone" );
		} catch ( \Exception $e ) {
			// do nothing
		}

		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( '[tbd]' );
		$I->seeInShellOutput( '[version-conflict]' );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$I->runShellCommand( "php {$this->pup} clean" );

		$this->reset_data_and_location();
	}
}
