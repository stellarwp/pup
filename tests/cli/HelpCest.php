<?php

namespace StellarWP\Pup\Tests;

use Codeception\Example;
use StellarWP\Pup\Tests\CliTester;

class HelpCest {
	protected $path_to_pup;

	public function _before( CliTester $I ) {
		$this->path_to_pup = dirname( dirname( __DIR__ ) ) . '/pup';
	}

	/**
	 * @test
	 */
	public function it_should_default_to_help( CliTester $I ) {
		$I->runShellCommand( "php {$this->path_to_pup}" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'A CLI utility' );
	}

	/**
	 * @test
	 */
	public function it_should_run_help( CliTester $I ) {
		$I->runShellCommand( "php {$this->path_to_pup} help" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'A CLI utility' );
	}

	/**
	 * @test
	 * @dataProvider topicProvider
	 */
	public function it_should_show_build_docs( CliTester $I, Example $example ) {
		$I->runShellCommand( "php {$this->path_to_pup} help {$example['topic']}" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'pup ' . $example['topic'] );
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
		];
	}
}
