<?php

namespace StellarWP\Pup\Tests;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class InvalidPuprcCest extends AbstractBase {
	/**
	 * @test
	 */
	public function it_should_show_puprc_error_if_invalid( CliTester $I ) {
		$this->write_default_puprc();

		file_put_contents( $this->tests_root . '/_data/fake-project/.puprc', 'asldjfakjfdasdf,asdlfajsfasfm', FILE_APPEND );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} help" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( '!!!!!!!!!!!' );
		$I->seeInShellOutput( 'but it could not be parsed' );
	}
	/**
	 * @test
	 */
	public function it_should_not_show_puprc_error_if_invalid_while_running_info( CliTester $I ) {
		$this->write_default_puprc();

		file_put_contents( $this->tests_root . '/_data/fake-project/.puprc', 'asldjfakjfdasdf,asdlfajsfasfm', FILE_APPEND );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} info" );
		$I->seeResultCodeIs( 0 );
		$I->dontSeeInShellOutput( '!!!!!!!!!!!' );
		$I->dontSeeInShellOutput( 'but it could not be parsed' );
	}
}
