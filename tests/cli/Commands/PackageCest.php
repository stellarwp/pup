<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class PackageCest extends AbstractBase {
	protected function reset_data_and_location() {
		chdir( __DIR__ );
		$files = [
			'.puprc',
			'.distignore',
			'.distinclude',
			'.gitattributes',
			'fake-project.1.0.0.zip',
			'fake-project.zip',
		];

		foreach ( $files as $file ) {
			@unlink( $this->tests_root . '/_data/fake-project/' . $file );
		}
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );
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
	public function it_should_package_the_zip_without_version_number_if_unknown( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package unknown" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_defaults( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_distignore( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distignore', "bootstrap.php\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_gitattributes( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.gitattributes', "bootstrap.php export-ignore\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_distignore_and_gitattributes( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distignore', "bootstrap.php\n" );
		file_put_contents( '.gitattributes', "other-file.php export-ignore\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_use_distinclude_as_a_filter_for_candidate_files( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		// .distinclude with bootstrap.php means only bootstrap.php is a candidate.
		file_put_contents( '.distinclude', "bootstrap.php\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "find .pup-zip/fake-project -type f | sort" );
		$output = $I->grabShellOutput();

		// bootstrap.php passes the include filter
		$I->assertStringContainsString( 'bootstrap.php', $output );
		// other-file.php is excluded because it doesn't match .distinclude
		$I->assertStringNotContainsString( 'other-file.php', $output );

		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}

	/**
	 * @test
	 */
	public function it_should_not_let_distinclude_override_distignore_and_gitattributes( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		// .distinclude allows bootstrap.php, but .distignore and .gitattributes exclude it.
		file_put_contents( '.distinclude', "bootstrap.php\n" );
		file_put_contents( '.distignore', "bootstrap.php\n" );
		file_put_contents( '.gitattributes', "bootstrap.php export-ignore\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "find .pup-zip/fake-project | sort" );
		$output = $I->grabShellOutput();

		// bootstrap.php should NOT be present — ignore rules still apply despite .distinclude
		$I->assertStringNotContainsString( 'bootstrap.php', $output );

		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}
}
