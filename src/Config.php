<?php

namespace StellarWP\Pup;

use Exception;
use stdClass;

class Config {
	/**
	 * @var string
	 */
	protected $working_dir;

	/**
	 * @var stdClass
	 */
	protected $config;

	/**
	 * @var string
	 */
	protected $puprc_file_path;

	/**
	 * Loads the composer.json file and pup config.
	 *
	 * @throws Exception
	 *
	 * @return void
	 */
	public function __construct() {
		$this->working_dir     = DirectoryUtils::trailingSlashIt( DirectoryUtils::normalizeDir( getcwd() ) );
		$this->puprc_file_path = $this->working_dir . '.puprc';

		$this->config = (object) $this->getDefaultConfig();

		if ( file_exists( $this->puprc_file_path ) ) {
			$this->puprc = json_decode( file_get_contents( $this->puprc_file_path ), true );

			if ( ! $this->puprc ) {
				throw new Exceptions\ConfigException( 'Could not parse the .puprc file! Check the json syntax and try again.' );
			}
		}

		foreach ( $this->puprc as $key => $value ) {
			$this->config->$key = $value;
		}

		$this->validateConfig();
	}

	/**
	 * Throws an error if the paths do not exist.
	 *
	 * @param array  $paths Paths to validate.
	 * @param string $message Error message to throw if paths do not exist.
	 *
	 * @throws Exceptions\ConfigException
	 *
	 * @return bool
	 */
	protected function errorIfPathsDoNotExist( array $paths, string $message ): bool {
		$invalid_paths = [];

		foreach ( $paths as $path ) {
			if ( file_exists( $path ) ) {
				continue;
			}

			$invalid_paths[] = $path;
		}

		if ( $invalid_paths ) {
			throw new Exceptions\ConfigException( $message . "\n* " . implode( "\n* ", $invalid_paths ) );
		}

		return true;
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
	 * Returns the build directory.
	 *
	 * @return string
	 */
	public function getBuildDir() : string {
		$build_dir = '.pup-build';

		if ( ! empty( $this->config->paths['build_dir'] ) ) {
			$build_dir = DirectoryUtils::normalizeDir( $this->config->paths['build_dir'] );
		}

		return $this->getAbsolutePathForRelativePath( $build_dir, '.pup-build' );
	}

	/**
	 * Returns the clone directory.
	 *
	 * @return string
	 */
	public function getZipDir() : string {
		$dir = '.pup-zip';

		if ( ! empty( $this->config->paths['zip_dir'] ) ) {
			$dir = DirectoryUtils::normalizeDir( $this->config->paths['zip_dir'] );
		}

		return $this->getAbsolutePathForRelativePath( $dir, '.pup-zip' );
	}

	/**
	 * Returns the default config.
	 *
	 * @return array
	 */
	protected function getDefaultConfig() : array {
		return json_decode( file_get_contents( __PUP_DIR__ . '/.puprc-defaults' ), true );
	}

	/**
	 * Get paths from the config.
	 *
	 * @param string $key
	 *
	 * @return array|string|null
	 */
	public function getPaths( string $key ) {
		if ( empty( $this->config->paths[ $key ] ) ) {
			return [];
		}

		return $this->config->paths[ $key ];
	}

	/**
	 * Get absolute paths for relative path.
	 *
	 * @param string $path
	 * @param string|null $default
	 *
	 * @return string
	 */
	protected function getAbsolutePathForRelativePath( string $path, $default = null ) {
		$prefix = DirectoryUtils::trailingSlashIt( $this->getWorkingDir() );
		$path   = DirectoryUtils::normalizeDir( $path );
		$path   = str_replace( $prefix, '', $path );

		$starts_with_separator = str_starts_with( $path, DIRECTORY_SEPARATOR );

		// Don't allow absolute paths.
		if ( $starts_with_separator && $default ) {
			return $prefix . $default;
		} elseif ( $starts_with_separator ) {
			throw new Exceptions\ConfigException( 'Absolute paths are not allowed in the .puprc file.' );
		}

		return $prefix . $path;
	}

	/**
	 * Returns the repo.
	 *
	 * @return string
	 */
	public function getRepo() : string {
		if ( empty( $this->config->repo ) ) {
			if ( file_exists( $this->working_dir . 'composer.json' ) ) {
				$composer = json_decode( file_get_contents( $this->working_dir . 'composer.json' ) );
				if ( ! empty( $composer->name ) ) {
					return 'git@github.com:' . $composer->name . '.git';
				}
			}

			throw new Exceptions\ConfigException( 'Could not find a repo in the .puprc file or the "name" property in composer.json.' );
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
	 * Gets the rsync executable to run.
	 *
	 * @return string
	 */
	public function getRsyncExecutable(): string {
		return $this->config->rsync_executable;
	}

	/**
	 * Get version files.
	 *
	 * @return array
	 */
	public function getVersionFiles() : array {
		$version_files = $this->getPaths( 'versions' );

		foreach ( $version_files as &$version_file ) {
			$version_file['file'] = $this->getAbsolutePathForRelativePath( $version_file['file'] );
			if ( ! file_exists( $version_file['file'] ) ) {
				throw new Exceptions\ConfigException( 'Version file does not exist: ' . $version_file['file'] );
			}
		}

		return $version_files;
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
			if ( file_exists( $this->working_dir . 'composer.json' ) ) {
				$composer = json_decode( file_get_contents( $this->working_dir . 'composer.json' ) );
				if ( empty( $composer->name ) ) {
					throw new Exceptions\ConfigException( 'Could not find the "name" property in composer.json.' );
				}

				$project_name = $composer->name;
				$project_name = preg_replace( '![^/]+/!', '', $project_name );
				return $project_name;
			}

			throw new Exceptions\ConfigException( 'Could not find a "zip_name" in .puprc' );
		}

		return $this->config->zip_name;
	}

	/**
	 * Validates the config file.
	 *
	 * @throws Exceptions\ConfigException
	 */
	protected function validateConfig() {
		$this->validateVersionPaths();
		$this->validateCssPaths();
		$this->validateJsPaths();
		$this->validateViewPaths();
	}

	/**
	 * Validates the css paths.
	 *
	 * @throws Exceptions\ConfigException
	 */
	protected function validateCssPaths() {
		$files = $this->getPaths( 'css' );

		$this->errorIfPathsDoNotExist( $files, 'The following css paths (.paths.css) in .puprc could not be found:' );
	}

	/**
	 * Validates the js paths.
	 *
	 * @throws Exceptions\ConfigException
	 */
	protected function validateJsPaths() {
		$files = $this->getPaths( 'js' );

		$this->errorIfPathsDoNotExist( $files, 'The following js paths (.paths.js) in .puprc could not be found:' );
	}

	/**
	 * Validates the version files.
	 *
	 * @throws Exceptions\ConfigException
	 */
	protected function validateVersionPaths() {
		$files = $this->getVersionFiles();

		$file_paths = [];
		foreach ( $files as $file ) {
			$file_paths[] = $file['file'];
		}

		$this->errorIfPathsDoNotExist( $file_paths, 'The following version files (.paths.versions) in .puprc could not be found:' );
	}

	/**
	 * Validates the views paths.
	 *
	 * @throws Exceptions\ConfigException
	 */
	protected function validateViewPaths() {
		$files = $this->getPaths( 'views' );

		$this->errorIfPathsDoNotExist( $files, 'The following views paths (.paths.views) in .puprc could not be found:' );
	}
}