<?php

namespace StellarWP\Pup;

use Composer\Composer;
use Composer\Factory;
use Composer\IO\NullIO;
use Exception;
use stdClass;

class Config {
	/**
	 * @var string
	 */
	protected $working_dir;

	/**
	 * @var Composer
	 */
	protected $composer;

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
	public function __construct() {
		$this->working_dir = getcwd() . DIRECTORY_SEPARATOR;
		$this->composer    = Factory::create(
			new NullIO(),
			rtrim( $this->working_dir, DIRECTORY_SEPARATOR ) . DIRECTORY_SEPARATOR . 'composer.json',
			true
		);

		if ( ! isset( $this->composer->getPackage()->getExtra()['pup'] ) ) {
			throw new Exception( 'No pup configuration found in composer.json' );
		}

		$this->config = (object) $this->getDefaultConfig();

		$extra_config = (array) $this->composer->getPackage()->getExtra()['pup'];

		foreach ( $extra_config as $key => $value ) {
			$this->config->$key = $value;
		}
	}

	/**
	 * Returns the default config.
	 *
	 * @return array
	 */
	protected function getDefaultConfig() : array {
		return [
			'build_command' => [
				'npm run build',
			],
			'changelog'     => null,
			'css'           => [],
			'js'            => [],
			'version_files' => [],
			'views'         => [],
			'zip_name'      => null,
			'checks'        => [
				'tbd',
				'version-conflict',
				'view-version',
			],
		];
	}

	/**
	 * @return stdClass
	 */
	public function get() : stdClass {
		return $this->config;
	}

	/**
	 * @return string
	 */
	public function getWorkingDir() : string {
		return $this->working_dir;
	}
}