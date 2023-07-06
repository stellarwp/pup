<?php

namespace StellarWP\Pup;

class VersionFile {
	/**
	 * The file to check.
	 * @var string
	 */
	protected $path;

	/**
	 * The regex to use to check the file for a version.
	 * @var string
	 */
	protected $regex;

	/**
	 * VersionFile constructor.
	 *
	 * @param string $path  The file to check.
	 * @param string $regex The regex to use to check the file for a version.
	 */
	public function __construct( string $path, string $regex ) {
		$this->path  = DirectoryUtils::normalizeDir( $path );
		$this->regex = $regex;
	}

	/**
	 * Get the file to check.
	 *
	 * @return string
	 */
	public function getPath(): string {
		return $this->path;
	}

	/**
	 * Get the regex to use to check the file for a version.
	 *
	 * @return string
	 */
	public function getRegex(): string {
		return $this->regex;
	}
}