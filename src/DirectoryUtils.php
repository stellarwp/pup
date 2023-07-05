<?php

namespace StellarWP\Pup;

use Exception;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;

class DirectoryUtils {

	/**
	 * Normalizes a directory for the system that the script is running on.
	 *
	 * @param string $dir
	 *
	 * @return string
	 */
	public static function normalizeDir( string $dir ) : string {
		if ( empty( $dir ) ) {
			return '';
		}

		$dir = str_replace( '/', DIRECTORY_SEPARATOR, $dir );
		$dir = str_replace( '\\', DIRECTORY_SEPARATOR, $dir );

		return $dir;
	}

	/**
	 * Normalizes an array of directories for the system that the script is running on.
	 *
	 * @param array|string $dirs
	 *
	 * @return array|string
	 */
	public static function normalizeDirs( $dirs ) {
		if ( ! is_array( $dirs ) ) {
			return self::normalizeDir( $dirs );
		}

		foreach ( $dirs as &$dir ) {
			$dir = self::normalizeDir( $dir );
		}

		return $dirs;
	}

	/**
	 * Recursively removes a directory and all of its contents.
	 *
	 * This will only allow removal of directories within the working directory.
	 *
	 * @param string $dir
	 *
	 * @throws Exception
	 *
	 * @return bool
	 */
	public static function rmdir( string $dir ): bool {
		$config      = App::getConfig();
		$dir         = self::normalizeDir( $dir );
		$dir         = rtrim( $dir, DIRECTORY_SEPARATOR ) . DIRECTORY_SEPARATOR;
		$working_dir = rtrim( $config->getWorkingDir(), DIRECTORY_SEPARATOR ) . DIRECTORY_SEPARATOR;

		if ( ! str_contains( $working_dir, $dir ) ) {
			throw new Exception( 'You can only delete sub directories in the current working directory.' );
		}

		// If the directory doesn't exist, we're done and let's call it successful.
		if ( ! file_exists( $dir ) ) {
			return true;
		}

		if ( ! is_dir( $dir ) ) {
			return false;
		}

		$files = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $dir, RecursiveDirectoryIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::CHILD_FIRST
		);

		foreach ( $files as $file_info ) {
			$todo = ( $file_info->isDir() ? 'rmdir' : 'unlink' );
			$todo( $file_info->getRealPath() );
		}

		return rmdir( $dir );
	}

	/**
	 * Adds a trailing slash to a path.
	 *
	 * @param string $path
	 *
	 * @return string
	 */
	public static function trailingSlashIt( string $path ) : string {
		return rtrim( $path, DIRECTORY_SEPARATOR ) . DIRECTORY_SEPARATOR;
	}
}