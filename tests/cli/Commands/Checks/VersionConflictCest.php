<?php

namespace StellarWP\Pup\Tests\Cli\Commands\Checks;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class VersionConflictCest extends AbstractBase {

	/**
	 * @test
	 */
	public function it_should_run_successful_version_conflict_check( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} check:version-conflict" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'No version conflicts found.' );
		$I->dontSeeInShellOutput( '[version-conflict]' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_fail_version_conflict_check_when_there_are_mismatched_versions( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['paths']['versions'][] = [
			'file' => 'src/OtherFileWithBadVersion.php',
			'regex' => "(const VERSION = ['\"])([^'\"]+)",
		];
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		try {
			$I->runShellCommand( "php {$this->pup} check:version-conflict" );
		} catch ( \Exception $e ) {}

		$I->seeResultCodeIs( 1 );
		$I->seeInShellOutput( 'Found more than one version' );
		$I->dontSeeInShellOutput( '[version-conflict]' );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}
}
