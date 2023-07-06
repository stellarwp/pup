<?php

namespace StellarWP\Pup;

use Exception;
use FilesystemIterator;
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
	 * @param array<int, string>|string $dirs
	 *
	 * @return array<int, string>|string
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
	 * @return int
	 */
	public static function rmdir( string $dir ): int {
		$config      = App::getConfig();
		$dir         = self::normalizeDir( $dir );
		$dir         = rtrim( $dir, DIRECTORY_SEPARATOR ) . DIRECTORY_SEPARATOR;
		$working_dir = rtrim( $config->getWorkingDir(), DIRECTORY_SEPARATOR ) . DIRECTORY_SEPARATOR;

		if ( strpos( $dir, $working_dir ) !== 0 ) {
			throw new Exception( 'You can only delete sub directories in the current working directory.' );
		}

		if ( strpos( $dir, '..' ) !== false ) {
			throw new Exception( 'You cannot delete directories using ".." anywhere in the path.' );
		}

		$results = 0;

		if ( stripos( PHP_OS, 'WIN' ) === 0 ) {
			system( 'rmdir /s /q ' . escapeshellarg( $dir ), $results );
		} else {
			system( 'rm -rf ' . escapeshellarg( $dir ), $results );
		}

		return $results;
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