<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class ReplaceVersionCest extends AbstractBase {

	/**
	 * The version files modified by the replace-version command. These are git-tracked
	 * fixtures, so they must be restored after each test.
	 *
	 * @var string[]
	 */
	protected $version_files = [
		'bootstrap.php',
		'package.json',
		'src/Plugin.php',
	];

	/**
	 * @inheritDoc
	 */
	public function _after( CliTester $I ) {
		$this->restore_version_files();
		parent::_after( $I );
	}

	/**
	 * Restores the git-tracked version fixture files modified during a test.
	 *
	 * @return void
	 */
	protected function restore_version_files(): void {
		foreach ( $this->version_files as $file ) {
			$path = $this->tests_root . '/_data/fake-project/' . $file;
			system( 'git checkout -- ' . escapeshellarg( $path ) );
		}
	}

	/**
	 * @test
	 */
	public function it_should_replace_the_version_in_version_files( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} replace-version 2.5.0" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'bootstrap.php' );
		$I->seeInShellOutput( '2.5.0' );

		$project = $this->tests_root . '/_data/fake-project';
		$I->assertStringContainsString( "define( 'FAKE_PROJECT_VERSION', '2.5.0' );", (string) file_get_contents( $project . '/bootstrap.php' ) );
		$I->assertStringContainsString( '"version": "2.5.0"', (string) file_get_contents( $project . '/package.json' ) );
		$I->assertStringContainsString( "const VERSION = '2.5.0';", (string) file_get_contents( $project . '/src/Plugin.php' ) );

		$output = $I->grabShellOutput();
		$this->assertMatchesStringSnapshot( $output );
	}

	/**
	 * @test
	 */
	public function it_should_fail_when_no_version_files_are_configured( CliTester $I ) {
		$puprc = $this->get_puprc();
		$puprc['paths']['versions'] = [];
		$this->write_puprc( $puprc );

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} replace-version 2.5.0", false );
		$I->seeResultCodeIs( 1 );
		$I->seeInShellOutput( 'No version files found' );
	}
}
