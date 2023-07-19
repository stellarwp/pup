<?php

namespace StellarWP\Pup\Filesystem\SyncFiles;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions\BaseException;

class SyncFiles {
	/**
	 * @param string $filename
	 * @param string $root
	 *
	 * @throws BaseException
	 *
	 * @return AbstractFile
	 */
	public static function get( string $filename, string $root ): AbstractFile {
		switch ( $filename ) {
			case '.distfiles':
				return static::getDistFiles( $root );
			case '.distignore':
				return static::getDistIgnore( $root );
			case '.distinclude':
				return static::getDistInclude( $root );
			case '.gitattributes':
				return static::getGitAttributes( $root );
			default:
				throw new BaseException( 'Invalid sync file.' );
		}
	}

	/**
	 * @param string   $root
	 * @param array<int, string> $paths
	 *
	 * @return DistFiles
	 */
	public static function getDistFiles( string $root, array $paths = [] ): DistFiles {
		return new DistFiles( $root, static::getSyncFiles( '.distfiles' ) );
	}

	/**
	 * @param string   $root
	 * @param array<int, string> $paths
	 *
	 * @return DistInclude
	 */
	public static function getDistInclude( string $root, array $paths = [] ): DistInclude {
		return new DistInclude( $root, static::getSyncFiles( '.distinclude' ) );
	}

	/**
	 * @param string   $root
	 * @param array<int, string> $paths
	 *
	 * @return DistIgnore
	 */
	public static function getDistIgnore( string $root, array $paths = [] ): DistIgnore {
		$use_ignore_defaults  = App::getConfig()->getZipUseDefaultIgnore();
		$files                = static::getSyncFiles( '.distignore' );

		if ( $use_ignore_defaults ) {
			$files[] = __PUP_DIR__ . '/.distignore-defaults';
		}

		return new DistIgnore( $root, $files );
	}

	/**
	 * @param string   $root
	 * @param array<int, string> $paths
	 *
	 * @return GitAttributes
	 */
	public static function getGitAttributes( string $root, array $paths = [] ): GitAttributes {
		return new GitAttributes( $root, static::getSyncFiles( '.gitattributes' ) );
	}

	/**
	 * Get files of a given filename from the sync files.
	 *
	 * @param string $filename
	 *
	 * @return array<int, string>
	 */
	public static function getSyncFiles( string $filename ): array {
		$files = [];

		$files_from_config = App::getConfig()->getSyncFiles();

		foreach ( $files_from_config as $file ) {
			if ( strpos( $file, $filename ) === false ) {
				continue;
			}

			$files[] = $file;
		}

		return $files;
	}
}
