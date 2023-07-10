<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use Codeception\Example;
use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class HelpCest extends AbstractBase {

	public function _before( CliTester $I ) {
		parent::_before( $I );
	}

	/**
	 * @test
	 */
	public function it_should_default_to_help( CliTester $I ) {
		$I->runShellCommand( "php {$this->pup}" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'A CLI utility' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_run_help( CliTester $I ) {
		$I->runShellCommand( "php {$this->pup} help" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'A CLI utility' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 * @dataProvider topicProvider
	 */
	public function it_should_show_topic_docs( CliTester $I, Example $example ) {
		$I->runShellCommand( "php {$this->pup} help build" );
		$I->seeResultCodeIs( 0 );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	protected function topicProvider(): array {
		return [
			[ 'topic' => 'build' ],
			[ 'topic' => 'check' ],
			[ 'topic' => 'check:tbd' ],
			[ 'topic' => 'check:version-conflict' ],
			[ 'topic' => 'help' ],
			[ 'topic' => 'get-version' ],
			[ 'topic' => 'package' ],
			[ 'topic' => 'zip' ],
			[ 'topic' => 'zip-name' ],
		];
	}
}
