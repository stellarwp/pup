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
	 * @var array<string, mixed>
	 */
	protected $puprc;

	/**
	 * Loads the composer.json file and pup config.
	 *
	 * @throws Exception
	 *
	 * @return void
	 */
	public function __construct() {
		$cwd = getcwd();

		if ( ! $cwd ) {
			throw new Exceptions\ConfigException( 'Could not get the current working directory!' );
		}

		$this->working_dir     = DirectoryUtils::trailingSlashIt( DirectoryUtils::normalizeDir( $cwd ) );
		$this->puprc_file_path = $this->working_dir . '.puprc';

		$this->config = (object) $this->getDefaultConfig();

		if ( file_exists( $this->puprc_file_path ) ) {
			$puprc_file_contents = file_get_contents( $this->puprc_file_path );
			if ( ! $puprc_file_contents ) {
				throw new Exceptions\ConfigException( 'Could not read the .puprc file!' );
			}

			$this->puprc = json_decode( $puprc_file_contents, true );

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
	 * @param array<int, string>  $paths Paths to validate.
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
	 * @return array<int, string>
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
	 * @return array<string, mixed>
	 */
	protected function getDefaultConfig() : array {
		$defaults = file_get_contents( __PUP_DIR__ . '/.puprc-defaults' );
		if ( ! $defaults ) {
			throw new Exceptions\ConfigException( 'Could not read the ' . __PUP_DIR__ . DIRECTORY_SEPARATOR . '.puprc-defaults file!' );
		}

		$defaults_decoded = json_decode( $defaults, true );

		if ( ! $defaults_decoded ) {
			throw new Exceptions\ConfigException( 'Could not parse the ' . __PUP_DIR__ . DIRECTORY_SEPARATOR . '.puprc-defaults file!' );
		}

		return $defaults_decoded;
	}

	/**
	 * Get paths from the config.
	 *
	 * @param string $key
	 *
	 * @return array<int, string>
	 */
	public function getPaths( string $key ) {
		if ( empty( $this->config->paths[ $key ] ) ) {
			return [];
		}

		if ( ! is_array( $this->config->paths[ $key ] ) ) {
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
	 * Get composer.json name property.
	 *
	 * @return string
	 */
	protected function getComposerName(): string {
		if ( ! file_exists( $this->working_dir . 'composer.json' ) ) {
			return '';
		}

		$composer_contents = file_get_contents( $this->working_dir . 'composer.json' );
		if ( ! $composer_contents ) {
			throw new Exceptions\ConfigException( 'Could not read composer.json.' );
		}

		$composer = json_decode( $composer_contents, true );
		if ( empty( $composer['name'] ) ) {
			throw new Exceptions\ConfigException( 'Could not find the "name" property in composer.json.' );
		}

		return $composer['name'];
	}

	/**
	 * Returns the repo.
	 *
	 * @return string
	 */
	public function getRepo() : string {
		if ( empty( $this->config->repo ) ) {
			if ( $this->hasComposer() ) {
				$composer_name = $this->getComposerName();

				if ( ! empty( $composer_name ) ) {
					return 'git@github.com:' . $composer_name . '.git';
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
	 * @return array<int, array<string, string>>
	 */
	public function getVersionFiles() : array {
		$version_files = $this->getPaths( 'versions' );

		if ( ! is_array( $version_files ) ) {
			return [];
		}

		foreach ( $version_files as &$version_file ) {
			$version_file = (array) $version_file;

			if ( ! isset( $version_file['file'] ) || ! isset( $version_file['regex' ] ) ) {
				throw new Exceptions\ConfigException( 'Versions specified in .puprc .paths.versions must have the "file" and "regex" property.' );
			}
			$version_file['file'] = $this->getAbsolutePathForRelativePath( $version_file['file'] );
			if ( ! file_exists( $version_file['file'] ) ) {
				throw new Exceptions\ConfigException( 'Version file does not exist: ' . $version_file['file'] );
			}
		}

		/** @var array<int, array<string, string>> */
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
			if ( $this->hasComposer() ) {
				$project_name = $this->getComposerName();
				$project_name = preg_replace( '![^/]+/!', '', $project_name );

				if ( empty( $project_name ) ) {
					throw new Exceptions\ConfigException( 'Could convert composer.json\'s "name" property to a usable zip_name.' );
				}

				return $project_name;
			}

			throw new Exceptions\ConfigException( 'Could not find a "zip_name" in .puprc' );
		}

		return $this->config->zip_name;
	}

	/**
	 * Returns whether or not there is a composer.json file in the project.
	 *
	 * @return bool
	 */
	public function hasComposer(): bool {
		return file_exists( $this->working_dir . 'composer.json' );
	}

	/**
	 * Validates the config file.
	 *
	 * @throws Exceptions\ConfigException
	 *
	 * @return void
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
	 *
	 * @return void
	 */
	protected function validateCssPaths() {
		$files = $this->getPaths( 'css' );

		$this->errorIfPathsDoNotExist( $files, 'The following css paths (.paths.css) in .puprc could not be found:' );
	}

	/**
	 * Validates the js paths.
	 *
	 * @throws Exceptions\ConfigException
	 *
	 * @return void
	 */
	protected function validateJsPaths() {
		$files = $this->getPaths( 'js' );

		$this->errorIfPathsDoNotExist( $files, 'The following js paths (.paths.js) in .puprc could not be found:' );
	}

	/**
	 * Validates the version files.
	 *
	 * @throws Exceptions\ConfigException
	 *
	 * @return void
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
	 *
	 * @return void
	 */
	protected function validateViewPaths() {
		$files = $this->getPaths( 'views' );

		$this->errorIfPathsDoNotExist( $files, 'The following views paths (.paths.views) in .puprc could not be found:' );
	}
}