<?php

namespace StellarWP\Pup\Tests\Cli;

use StellarWP\Pup\Tests\CliTester;

class AbstractBase {
	use \tad\Codeception\SnapshotAssertions\SnapshotAssertions;

	protected $pup;
	protected $pup_root;
	protected $tests_root;

	public function __construct() {
		$this->tests_root = dirname( __DIR__ );
		$this->pup_root = dirname( $this->tests_root );
	}

	public function _before( CliTester $I ) {
		$this->pup = dirname( dirname( __DIR__ ) ) . '/pup';
		$this->rm_puprc( 'fake-project' );
	}

	/**
	 * @param array $data
	 *
	 * @return array
	 */
	protected function get_puprc( array $data = [] ) {
		$defaults = [
			'build' => [
				"ls -a",
			],
			'paths' => [
				'versions' => [
					[
						'file'  => 'bootstrap.php',
						'regex' => "(define\\( +['\"]FAKE_PROJECT_VERSION['\"], +['\"])([^'\"]+)",
					],
					[
						'file'  => 'bootstrap.php',
						'regex' => "(Version: )(.+)",
					],
					[
						'file'  => 'src/Plugin.php',
						'regex' => "(const VERSION = ['\"])([^'\"]+)",
					],
				],
			],
			'rsync_executable' => '/usr/bin/rsync',
			'zip_name' => 'fake-project',
		];

		return array_merge( $defaults, $data );
	}

	/**
	 * Removes the .puprc from the provided project in _data.
	 *
	 * @param array $puprc
	 *
	 * @return void
	 */
	protected function rm_puprc( $project = 'fake-project' ): void {
		@unlink( dirname( __DIR__ ) . '/_data/' . $project . '/.puprc' );
	}

	/**
	 * Writes the default .puprc to the provided project in _data.
	 *
	 * @param string $project
	 *
	 * @return void
	 */
	protected function write_default_puprc( $project = 'fake-project' ): void {
		$this->write_puprc( $this->get_puprc(), $project );
	}

	/**
	 * Writes the .puprc to the provided project in _data.
	 *
	 * @param array $puprc
	 * @param string $project
	 *
	 * @return void
	 */
	protected function write_puprc( array $puprc, $project = 'fake-project' ): void {
		file_put_contents( dirname( __DIR__ ) . '/_data/' . $project . '/.puprc', json_encode( $puprc, JSON_PRETTY_PRINT ) );
	}
}
