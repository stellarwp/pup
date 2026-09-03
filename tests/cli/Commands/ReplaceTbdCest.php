<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;

class ReplaceTbdCest extends AbstractBase {

	/**
	 * The git-tracked fixture files the command mutates, restored after each test.
	 *
	 * @var string[]
	 */
	protected $fixture_files = [
		'src/Plugin.php',
		'src/Thing/AnotherFile.php',
	];

	/**
	 * @inheritDoc
	 */
	public function _after( CliTester $I ) {
		$this->restore_fixtures();
		parent::_after( $I );
	}

	/**
	 * Restores the git-tracked fixture files modified during a test.
	 *
	 * @return void
	 */
	protected function restore_fixtures(): void {
		foreach ( $this->fixture_files as $file ) {
			$path = $this->tests_root . '/_data/fake-project-with-tbds/' . $file;
			system( 'git checkout -- ' . escapeshellarg( $path ) );
		}
	}

	/**
	 * @test
	 */
	public function it_should_replace_tbds_with_the_version( CliTester $I ) {
		$this->write_default_puprc( 'fake-project-with-tbds' );

		$project = $this->tests_root . '/_data/fake-project-with-tbds';
		chdir( $project );

		$I->runShellCommand( "php {$this->pup} replace-tbd 1.4.0" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'Replaced 8 TBD occurrence(s) across 2 file(s) with 1.4.0.' );

		$plugin = (string) file_get_contents( $project . '/src/Plugin.php' );
		$I->assertStringContainsString( '@since 1.4.0', $plugin );
		$I->assertStringNotContainsString( 'TBD', $plugin );

		$another = (string) file_get_contents( $project . '/src/Thing/AnotherFile.php' );
		$I->assertStringContainsString( "_deprecated_file( __FILE__, '1.4.0' );", $another );
		$I->assertStringContainsString( "_deprecated_function( __METHOD__, '1.4.0' );", $another );
		$I->assertStringContainsString( '@deprecated 1.4.0', $another );
		// Lower-case tbd placeholders are resolved too.
		$I->assertStringNotContainsStringIgnoringCase( 'tbd', $another );
	}

	/**
	 * @test
	 */
	public function it_should_only_replace_placeholders_not_surrounding_prose( CliTester $I ) {
		$this->write_default_puprc( 'fake-project-with-tbds' );

		$project = $this->tests_root . '/_data/fake-project-with-tbds';
		$tmp     = $project . '/src/ProseTbd.php';

		// A docblock line with a real version plus the word "tbd" in prose, and a
		// quoted placeholder followed by an unrelated "tbd" in a trailing comment.
		$contents = "<?php\n"
			. "/**\n"
			. " * @since 5.0.0 reworked the tbd handler\n"
			. " */\n"
			. "\$status = 'tbd'; // resolve tbd later\n";
		file_put_contents( $tmp, $contents );

		chdir( $project );

		try {
			$I->runShellCommand( "php {$this->pup} replace-tbd 1.4.0" );
			$I->seeResultCodeIs( 0 );

			$result = (string) file_get_contents( $tmp );

			// The docblock prose (and its real version) is untouched.
			$I->assertStringContainsString( '@since 5.0.0 reworked the tbd handler', $result );
			// The quoted placeholder is resolved...
			$I->assertStringContainsString( "\$status = '1.4.0';", $result );
			// ...but the unrelated "tbd" in the trailing comment is preserved.
			$I->assertStringContainsString( '// resolve tbd later', $result );
		} finally {
			@unlink( $tmp );
		}
	}

	/**
	 * @test
	 */
	public function it_should_not_modify_files_on_dry_run( CliTester $I ) {
		$this->write_default_puprc( 'fake-project-with-tbds' );

		$project = $this->tests_root . '/_data/fake-project-with-tbds';
		chdir( $project );

		$I->runShellCommand( "php {$this->pup} replace-tbd 1.4.0 --dry-run" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'dry-run' );
		$I->seeInShellOutput( 'Would replace 8 TBD occurrence(s) across 2 file(s).' );

		// The file should still contain the original TBD placeholders.
		$plugin = (string) file_get_contents( $project . '/src/Plugin.php' );
		$I->assertStringContainsString( '@since TBD', $plugin );
	}

	/**
	 * @test
	 */
	public function it_should_report_when_no_tbds_are_found( CliTester $I ) {
		$this->write_default_puprc();

		chdir( $this->tests_root . '/_data/fake-project' );

		$I->runShellCommand( "php {$this->pup} replace-tbd 1.4.0" );
		$I->seeResultCodeIs( 0 );
		$I->seeInShellOutput( 'No TBDs found to replace.' );
	}
}
