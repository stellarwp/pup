<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class InfoCest extends AbstractBase {
	protected function removeDynamicDataFromOutput( $output ) {
		$output = preg_replace( '/pup ([^\s]+) from/m', 'pup <version> from', $output );
		$output = preg_replace( '/Using: PHP (.+)$/m', 'Using: PHP <whatever>', $output );

		return $output;
	}

	/**
	 * @test
	 */
	public function it_should_provide_info( CliTester $I ) {

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} info" );
		$I->seeResultCodeIs( 0 );

		$output = $this->removeDynamicDataFromOutput( $I->grabShellOutput() );

		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_provide_info_with_puprc( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} info" );
		$I->seeResultCodeIs( 0 );

		$output = $this->removeDynamicDataFromOutput( $I->grabShellOutput() );

		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_provide_info_with_distignore( CliTester $I ) {
		file_put_contents( $this->tests_root . '/_data/fake-project/.distignore', "vendor\n.git\n" );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} info" );
		$I->seeResultCodeIs( 0 );

		$output = $this->removeDynamicDataFromOutput( $I->grabShellOutput() );

		$this->assertMatchesStringSnapshot( $output );

		unlink( $this->tests_root . '/_data/fake-project/.distignore' );
	}

	/**
	 * @test
	 */
	public function it_should_provide_info_with_distinclude( CliTester $I ) {
		file_put_contents( $this->tests_root . '/_data/fake-project/.distinclude', "vendor\n.git\n" );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} info" );
		$I->seeResultCodeIs( 0 );

		$output = $this->removeDynamicDataFromOutput( $I->grabShellOutput() );

		$this->assertMatchesStringSnapshot( $output );

		unlink( $this->tests_root . '/_data/fake-project/.distinclude' );
	}

	/**
	 * @test
	 */
	public function it_should_provide_info_with_gitattributes( CliTester $I ) {
		file_put_contents( $this->tests_root . '/_data/fake-project/.gitattributes', "vendor\n.git\n" );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} info" );
		$I->seeResultCodeIs( 0 );

		$output = $this->removeDynamicDataFromOutput( $I->grabShellOutput() );

		$this->assertMatchesStringSnapshot( $output );

		unlink( $this->tests_root . '/_data/fake-project/.gitattributes' );
	}

	/**
	 * @test
	 */
	public function it_should_show_invalid_puprc( CliTester $I ) {
		$this->write_default_puprc();

		file_put_contents( $this->tests_root . '/_data/fake-project/.puprc', 'asldjfakjfdasdf,asdlfajsfasfm', FILE_APPEND );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} info" );
		$I->seeResultCodeIs( 0 );

		$output = $this->removeDynamicDataFromOutput( $I->grabShellOutput() );

		$this->assertMatchesStringSnapshot( $output );
	}
}
