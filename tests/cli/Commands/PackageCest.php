<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class PackageCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_package_the_zip( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.1.0.0.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_without_version_number_if_unknown( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package unknown" );
		$I->seeResultCodeIs( 0 );

		$I->assertTrue( file_exists( 'fake-project.zip' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_defaults( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_distignore( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distignore', "bootstrap.php\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_gitattributes( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.gitattributes', "bootstrap.php export-ignore\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_ignore_files_from_distignore_and_gitattributes( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distignore', "bootstrap.php\n" );
		file_put_contents( '.gitattributes', "other-file.php export-ignore\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_include_files_in_distinclude( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distinclude', ".puprc\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_include_files_in_distfiles( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distfiles', "/node_modules/a-script-i-need.js\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();

		chdir( '.pup-zip' );

		$I->runShellCommand( "ls -a node_modules" );

		$output .= $I->grabShellOutput();

		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_include_files_in_distfiles_and_ignore_from_distignore( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distfiles', "/node_modules/a-script-i-need.js\nsrc/*\nbootstrap.php\nother-file.php\n" );
		file_put_contents( '.distignore', "other-file.php\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();

		chdir( '.pup-zip' );

		$I->runShellCommand( "ls -a src" );

		$output .= $I->grabShellOutput();

		$I->runShellCommand( "ls -a node_modules" );

		$output .= $I->grabShellOutput();

		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_use_default_distignore_when_no_safelist( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distignore', "other-file.php\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip/ fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip" );

		$output = $I->grabShellOutput();

		chdir( '.pup-zip' );

		$I->runShellCommand( "ls -a src" );

		$output .= $I->grabShellOutput();

		$I->runShellCommand( "ls -a node_modules" );

		$output .= $I->grabShellOutput();

		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_package_the_zip_and_not_include_files_in_distinclude_even_if_in_distignore_and_gitattributes( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		file_put_contents( '.distinclude', ".puprc\n" );
		file_put_contents( '.distignore', ".puprc\nnode_modules/\n" );
		file_put_contents( '.gitattributes', ".puprc export-ignore\n" );

		$I->runShellCommand( "php {$this->pup} package 1.0.0" );

		system( 'unzip -d .pup-zip fake-project.1.0.0.zip' );

		$I->runShellCommand( "ls -a .pup-zip/fake-project" );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
