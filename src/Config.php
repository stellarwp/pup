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
		$this->working_dir = DirectoryUtils::trailingSlashIt( DirectoryUtils::normalizeDir( getcwd() ) );
		$this->composer    = Factory::create(
			new NullIO(),
			DirectoryUtils::trailingSlashIt( $this->working_dir ) . 'composer.json',
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
	 * @return stdClass
	 */
	public function get() : stdClass {
		return $this->config;
	}

	/**
	 * Returns the build steps.
	 *
	 * @param bool $is_dev Is this a dev build?
	 *
	 * @return array
	 */
	public function getBuildCommands( $is_dev = false ) : array {
		if ( $is_dev && ! empty( $this->config->build_dev ) ) {
			return (array) $this->config->build_dev;
		}

		return $this->config->build ? (array) $this->config->build : [];
	}

	/**
	 * @return Composer
	 */
	public function getComposer() : Composer {
		return $this->composer;
	}

	/**
	 * Returns the build directory.
	 *
	 * @return string
	 */
	public function getBuildDir() : string {
		$prefix = DirectoryUtils::trailingSlashIt( $this->getWorkingDir() );

		if ( empty( $this->config->build_dir ) ) {
			return $prefix . '.pup-build';
		}

		$build_dir = DirectoryUtils::normalizeDir( $this->config->build_dir );

		// Don't allow absolute paths.
		if ( str_starts_with( $build_dir, DIRECTORY_SEPARATOR ) ) {
			return $prefix . '.pup-build';
		}

		return $prefix . $this->config->build_dir;
	}

	/**
	 * Returns the clone directory.
	 *
	 * @return string
	 */
	public function getCloneDir() : string {
		return $this->config->clone_dir ?: '.pup-clone';
	}

	/**
	 * Returns the default config.
	 *
	 * @return array
	 */
	protected function getDefaultConfig() : array {
		return [
			'build_dir'     => '.pup-build',
			'build'         => [],
			'build_dev'     => [],
			'changelog'     => null,
			'clone_dir'     => '.pup-clone',
			'css'           => [],
			'js'            => [],
			'repo'          => null,
			'version_files' => [],
			'views'         => [],
			'zip_ignore'    => '.distignore',
			'zip_name'      => null,
			'checks'        => [
				'tbd',
				'version-conflict',
				'view-version',
			],
		];
	}

	/**
	 * Returns the repo.
	 *
	 * @return string
	 */
	public function getRepo() : string {
		if ( empty( $this->config->repo ) ) {
			$repo = $this->composer->getPackage()->getName();
			return 'git@github.com:' . $repo . '.git';
		}

		if (
			! str_contains( $this->config->repo, 'https://' )
			&& ! str_contains( $this->config->repo, 'git://' )
			&& ! str_contains( $this->config->repo, 'git@github.com' )
		) {
			return 'git@github.com:' . $this->config->repo . '.git';
		}

		return $this->config->repo;
	}

	/**
	 * @return string
	 */
	public function getWorkingDir() : string {
		return $this->working_dir;
	}

	/**
	 * @return string
	 */
	public function getZipIgnore() : string {
		return $this->config->zip_ignore ?: '.distignore';
	}

	/**
	 * Returns the zip name for the project.
	 *
	 * @return string
	 */
	public function getZipName() : string {
		if ( empty( $this->config->zip_name ) ) {
			$project_name = $this->getComposer()->getPackage()->getName();
			$project_name = preg_replace( '![^/]+/!', '', $project_name );
			return $project_name;
		}

		return $this->config->zip_name;
	}
}