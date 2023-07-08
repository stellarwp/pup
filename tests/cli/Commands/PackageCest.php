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
	public function it_should_package_the_zip_and_include_files_in_distinclude( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distinclude', ".puprc\n" );

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
	public function it_should_package_the_zip_and_include_files_in_distinclude_even_if_in_distignore_and_gitattributes( CliTester $I ) {
		$this->reset_data_and_location();
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distinclude', ".puprc\n" );
		file_put_contents( '.distignore', ".puprc\n" );
		file_put_contents( '.gitattributes', ".puprc export-ignore\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );

		$I->runShellCommand( "php {$this->pup} clean" );
		$this->reset_data_and_location();
	}
}
