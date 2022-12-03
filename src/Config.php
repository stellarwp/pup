<?php

namespace StellarWP\Pup;

use Exception;
use stdClass;

class Config {
	/**
	 * @var string
	 */
	protected $dir;

	/**
	 * @var stdClass
	 */
	protected $composer_json;

	/**
	 * @var stdClass
	 */
	protected $config;

	/**
	 * Loads the composer.json file and pup config.
	 *
	 * @throws Exception
	 *
	 * @return void
	 */
	public function __construct( $dir ) {
		$this->dir     = $dir;
		$composer_json = file_get_contents( $this->dir . DIRECTORY_SEPARATOR . 'composer.json' );
		$composer_json = json_decode( $composer_json );

		if ( ! isset( $composer_json->extra->pup ) ) {
			throw new Exception( 'No pup configuration found in composer.json' );
		}

		$this->composer_json = $composer_json;
		$this->config        = array_merge( $this->get_default_config(), $composer_json->extra->pup );
	}

	/**
	 * Returns the default config.
	 *
	 * @return array
	 */
	protected function get_default_config() : array {
		return [
			'bootstrap' => null,
			'build_command' => 'npm run build',
			'changelog' => 'readme.txt',
			'css' => [
				'src/resources/css',
			],
			'js' => [
				'src/resources/js',
			],
			'submodule_build' => [],
			'submodule_sync'  => false,
			'version_file'    => null,
			'version_search'  => 'VERSION',
			'views'           => [
				'src/views',
			],
			'zip_command' => 'npm run zip',
			'checks' => [
				'tbd',
				'version-conflict',
				'view-version',
			],
		];
	}

	/**
	 * @return stdClass
	 */
	public function get_composer() : stdClass {
		return $this->composer_json;
	}

	/**
	 * @return stdClass
	 */
	public function get() : stdClass {
		return $this->config;
	}
}