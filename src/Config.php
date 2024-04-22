<?php

namespace StellarWP\Pup;

use Exception;
use stdClass;
use StellarWP\Pup\Utils\Directory as DirectoryUtils;

class Config implements \JsonSerializable {
	/**
	 * @var string
	 */
	protected $working_dir;

	/**
	 * @var stdClass
	 */
	protected $config;

	/**
	 * @var bool
	 */
	protected $has_invalid_puprc = false;

	/**
	 * @var array<int, I18nConfig>
	 */
	protected $i18n = [];

	/**
	 * @var string
	 */
	protected $puprc_file_path;

	/**
	 * @var array<string, mixed>
	 */
	protected $puprc = [];

	/**
	 * @var string
	 */
	protected $puprc_parse_error = '';

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

		$this->mergeConfigWithDefaults();
		$this->buildWorkflows();
		$this->parseCheckConfig();
		$this->parseVersionFiles();
		$this->validateConfig();
	}

	/**
	 * Builds the workflows from the config.
	 *
	 * @return void
	 */
	public function buildWorkflows() {
		if ( empty( $this->config->workflows ) ) {
			return;
		}

		$collection = new Workflow\Collection();

		if ( empty( $this->config->workflows->build ) && ! empty( $this->config->build ) ) {
			$collection->add( new Workflow\Workflow( 'build', $this->config->build ) );
		}

		if ( empty( $this->config->workflows->build_dev ) && ! empty( $this->config->build_dev ) ) {
			$collection->add( new Workflow\Workflow( 'build_dev', $this->config->build_dev ) );
		}

		foreach ( $this->config->workflows as $slug => $commands ) {
			$collection->add( new Workflow\Workflow( $slug, $commands ) );
		}

		$this->config->workflows = $collection;
	}

	/**
	 * Merges the local .puprc (if it exists) with the default .puprc-defaults.
	 *
	 * @return void
	 */
	public function mergeConfigWithDefaults() {
		$this->config = (object) $this->getDefaultConfig();

		if ( file_exists( $this->puprc_file_path ) ) {
			$puprc_file_contents = file_get_contents( $this->puprc_file_path );
			if ( ! $puprc_file_contents ) {
				throw new Exceptions\ConfigException( 'Could not read the .puprc file!' );
			}

			$this->puprc = json_decode( $puprc_file_contents, true );

			if ( ! $this->puprc ) {
				$this->has_invalid_puprc = true;
				$this->puprc_parse_error = json_last_error_msg();
				$this->puprc = [];
			}
		}

		foreach ( $this->puprc as $key => $value ) {
			if ( ! isset( $this->config->$key ) ) {
				$this->config->$key = $value;
				continue;
			}

			if ( is_scalar( $this->config->$key ) ) {
				$this->config->$key = $value;
				continue;
			}

			if ( $key === 'checks' && is_array( $value ) ) {
				$default_checks     = $this->config->$key;
				$this->config->$key = $value;

				foreach ( $this->config->$key as $check_slug => $check_config ) {
					if ( ! isset( $default_checks[ $check_slug ] ) ) {
						continue;
					}

					$this->config->$key[ $check_slug ] = $this->mergeConfigValue( $default_checks[ $check_slug ], $check_config );
				}
				continue;
			}

			$this->config->$key = $this->mergeConfigValue( $this->config->$key, $value );
		}
	}

	/**
	 * Intelligently merges two config values.
	 *
	 * @param mixed $original
	 * @param mixed $new
	 *
	 * @return mixed
	 */
	public function mergeConfigValue( $original, $new ) {
		if ( ! is_array( $new ) ) {
			return (array) $new;
		}

		if ( ! is_array( $original ) ) {
			return $new;
		}

		$keys = array_keys( $original );

		if ( ! $keys ) {
			return $new;
		}

		if ( is_numeric( $keys[0] ) ) {
			return $new;
		}

		foreach ( $original as $key => $item ) {
			if ( ! isset( $new[ $key ] ) ) {
				continue;
			}

			if ( isset( $new[ $key ] ) && is_array( $item ) ) {
				$original[ $key ] = $this->mergeConfigValue( $original[ $key ], $new[ $key ] );
				continue;
			}

			$original[ $key ] = $new[ $key ];
		}

		foreach ( $new as $key => $item ) {
			if ( isset( $original[ $key ] ) ) {
				continue;
			}

			$original[ $key ] = $item;
		}

		return $original;
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
	 * @param bool $get_full_path Whether to get the full path or not.
	 *
	 * @return string
	 */
	public function getBuildDir( bool $get_full_path = true ) : string {
		$build_dir = '.pup-build';

		if ( ! empty( $this->config->paths['build_dir'] ) ) {
			$build_dir = DirectoryUtils::normalizeDir( $this->config->paths['build_dir'] );
		}

		if ( ! $get_full_path ) {
			return $build_dir;
		}

		return $this->getAbsolutePathForRelativePath( $build_dir, '.pup-build' );
	}

	/**
	 * Returns the clean steps.
	 *
	 * @return array<int, string>
	 */
	public function getCleanCommands() : array {
		return $this->config->clean ? (array) $this->config->clean : [];
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
	 * Returns the i18n settings.
	 *
	 * @return array<int, I18nConfig>
	 */
	public function getI18n(): array {
		if ( ! empty( $this->i18n ) ) {
			return $this->i18n;
		}

		$defaults = $this->getI18nDefaults();
		$i18n     = $this->config->i18n ? (array) $this->config->i18n : [];

		if ( empty( $i18n ) ) {
			return [];
		}

		$keys = array_keys( $i18n );
		if ( ! is_numeric( current( $keys ) ) ) {
			$i18n = [ $i18n ];
		}

		$i18n = array_filter( $i18n, function ( $item ) {
			return ! empty( $item['url'] ) && ! empty( $item['textdomain'] ) && ! empty( $item['slug'] );
		} );

		if ( empty( $i18n ) ) {
			return [];
		}

		foreach ( $i18n as &$item ) {
			$item = array_merge( $defaults, $item );

			if ( empty( $item['formats'] ) ) {
				$item['formats'] = $defaults['formats'];
			}
		}

		foreach ( $i18n as $i18n_config ) {
			$this->i18n[] = new I18nConfig( $i18n_config );
		}

		return $this->i18n;
	}

	/**
	 * Returns the default i18n settings.
	 *
	 * @return array<string, string|int|array<int, string>>
	 */
	public function getI18nDefaults(): array {
		return $this->config->i18n_defaults ? (array) $this->config->i18n_defaults : [];
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

		$starts_with_separator = strpos( $path, DIRECTORY_SEPARATOR ) === 0;

		// Don't allow absolute paths.
		if ( $starts_with_separator && $default ) {
			return $prefix . $default;
		} elseif ( $starts_with_separator ) {
			throw new Exceptions\ConfigException( 'Absolute paths are not allowed in the .puprc file.' );
		}

		return $prefix . $path;
	}

	/**
	 * Get the checks from the config.
	 *
	 * @return array<string, Check\Config>
	 */
	public function getChecks(): array {
		return $this->config->checks;
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
	 * Gets the parse error for .puprc.
	 *
	 * @return string
	 */
	public function getPuprcParseError(): string {
		return $this->puprc_parse_error;
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
			&& ! str_contains( $this->config->repo, 'file://' )
			&& ! str_contains( $this->config->repo, 'git://' )
			&& ! str_contains( $this->config->repo, 'git@github.com' )
			&& ! file_exists( $this->config->repo )
		) {
			return 'git@github.com:' . $this->config->repo . '.git';
		}

		return $this->config->repo;
	}

	/**
	 * Get sync files from config.
	 *
	 * @return string[]
	 */
	public function getSyncFiles(): array {
		$defaults = [
			'.distfiles',
			'.distinclude',
			'.distignore',
			'.gitattributes',
		];

		if ( ! isset( $this->config->paths['sync_files'] ) ) {
			return $defaults;
		}

		if ( ! is_array( $this->config->paths['sync_files'] ) ) {
			$files = array_merge( $defaults, [ $this->config->paths['sync_files'] ] );
		} else {
			$files = array_merge( $defaults, $this->config->paths['sync_files'] );
		}

		return array_unique( $files );
	}

	/**
	 * Get version files.
	 *
	 * @return array<int, VersionFile>
	 */
	public function getVersionFiles() : array {
		if ( ! isset( $this->config->paths['versions'] ) || ! is_array( $this->config->paths['versions'] ) ) {
			return [];
		}

		return $this->config->paths['versions'];
	}

	/**
	 * Get the workflows from the config.
	 *
	 * @return array<string, Workflow>
	 */
	public function getWorkflows(): array {
		return $this->config->workflows;
	}

	/**
	 * @return string
	 */
	public function getWorkingDir() : string {
		return $this->working_dir;
	}

	/**
	 * Returns the clone directory.
	 *
	 * @param bool $get_full_path Whether to get the full path or not.
	 *
	 * @return string
	 */
	public function getZipDir( bool $get_full_path = true ) : string {
		$dir = '.pup-zip';

		if ( ! empty( $this->config->paths['zip_dir'] ) ) {
			$dir = DirectoryUtils::normalizeDir( $this->config->paths['zip_dir'] );
		}

		if ( ! $get_full_path ) {
			return $dir;
		}

		return $this->getAbsolutePathForRelativePath( $dir, '.pup-zip' );
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
	 * @return bool
	 */
	public function getZipUseDefaultIgnore() : bool {
		return (bool) $this->config->zip_use_default_ignore;
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
	 * Returns whether or not there is an invalid .puprc file.
	 *
	 * @return bool
	 */
	public function hasInvalidPuprc(): bool {
		return $this->has_invalid_puprc;
	}

	/**
	 * @inheritdoc
	 */
	#[\ReturnTypeWillChange]
	public function jsonSerialize() {
		$config = $this->config;
		if ( isset( $config->checks ) ) {
			$config->checks = array_map( function ( Check\Config $check ) {
				return $check->jsonSerialize();
			}, $config->checks );
		}

		if ( isset( $config->paths['versions'] ) ) {
			$config->paths['versions'] = array_map( function ( VersionFile $file ) {
				return $file->jsonSerialize();
			}, $config->paths['versions'] );
		}

		return $config;
	}

	/**
	 * Parses check config into Check\Config objects.
	 *
	 * @return void
	 */
	protected function parseCheckConfig() {
		if ( ! isset( $this->config->checks ) ) {
			return;
		}

		$checks        = (array) $this->config->checks;
		$check_configs = [];

		foreach ( $checks as $check_slug => $check ) {
			if ( $check instanceof Check\Config ) {
				$check_configs[] = $check;
				continue;
			}

			if ( is_int( $check_slug ) ) {
				$check_slug = $check;
				$check      = [];
			}

			$check_configs[ $check_slug ] = new Check\Config( $check_slug, $check );
		}

		$this->config->checks = $check_configs;
	}

	/**
	 * Parses version files into VersionFile objects.
	 *
	 * @return void
	 */
	protected function parseVersionFiles() {
		if ( ! isset( $this->config->paths['versions'] ) ) {
			return;
		}

		$version_files = (array) $this->config->paths['versions'];
		$version_file_objects = [];

		foreach ( $version_files as $file ) {
			if ( $file instanceof VersionFile ) {
				$version_file_objects[] = $file;
				continue;
			}

			if ( ! isset( $file['file'] ) || ! isset( $file['regex'] ) ) {
				throw new Exceptions\ConfigException( 'Versions specified in .puprc .paths.versions must have the "file" and "regex" property.' );
			}

			if ( ! file_exists( $file['file'] ) ) {
				throw new Exceptions\ConfigException( 'Version file does not exist: ' . $file['file'] );
			}

			$contents = file_get_contents( $file['file'] );

			if ( ! $contents ) {
				throw new Exceptions\ConfigException( 'Could not read version file: ' . $file['file'] );
			}

			preg_match( '/' . $file['regex'] . '/', $contents, $matches );

			if ( empty( $matches[1] ) || empty( $matches[2] ) ) {
				throw new Exceptions\ConfigException( 'Could not find version in file ' . $file['file'] . ' using regex "/' . $file['regex'] . '/"' );
			}

			$version_file_objects[] = new VersionFile( $file['file'], $file['regex'] );
		}

		$this->config->paths['versions'] = $version_file_objects;
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
			$file_paths[] = $file->getPath();
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
