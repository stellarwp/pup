<?php

namespace StellarWP\Pup\Tests\Cli;

use StellarWP\Pup\Tests\CliTester;

class AbstractBase {
	protected $pup;

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
				"ls -al",
			],
			"paths" => [
				"versions" => [
					[
						"file"  => "bootstrap.php",
						"regex" => "(define\\( +['\"]FAKE_PROJECT_VERSION['\"], +['\"])([^'\"]+)",
					],
					[
						"file"  => "bootstrap.php",
						"regex" => "(Version: )(.+)",
					],
					[
						"file"  => "src/Plugin.php",
						"regex" => "(const VERSION = ['\"])([^'\"]+)",
					],
				],
			],
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
	 * Writes the .puprc to the provided project in _data.
	 *
	 * @param array $puprc
	 *
	 * @return void
	 */
	protected function write_puprc( array $puprc, $project = 'fake-project' ): void {
		file_put_contents( dirname( __DIR__ ) . '/_data/' . $project . '/.puprc', json_encode( $puprc ) );
	}
}
