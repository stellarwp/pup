<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class CheckCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_run_default_checks( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} check" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( '[tbd] Success!' );
		$I->seeInShellOutput( '[version-conflict] No version conflicts found.' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_ignore_fail_tbd_check_when_tbds_exist_and_fail_method_is_warn( CliTester $I ) {
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
			$I->runShellCommand( "php {$this->pup} check" );
		} catch ( \Exception $e ) {}

		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'TBDs have been found!' );
		$I->seeInShellOutput( '[tbd]' );
		$I->seeInShellOutput( '[version-conflict] No version conflicts found.' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
