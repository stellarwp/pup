<?php

namespace StellarWP\Pup\Filesystem\SyncFiles;

class AbstractFile {
	/**
	 * @var string
	 */
	protected $filename;

	/**
	 * @var array<int, string>
	 */
	protected $paths = [];

	/**
	 * @var string
	 */
	protected $root;

	/**
	 * @param string   $root     Root directory to collect files.
	 * @param array<int, string> $paths    Paths to the files.
	 */
	public function __construct( string $root, array $paths = [] ) {
		$this->root = $root;

		if ( empty( $paths ) ) {
			$this->paths = [ (string) $this->filename ];
		} else {
			$this->paths = $paths;
		}
	}

	/**
	 * Alters contents.
	 *
	 * This method is meant to be overridden by child classes.
	 *
	 * @param string $contents
	 *
	 * @return string
	 */
	protected function alterContents( string $contents ): string {
		return $contents;
	}

	/**
	 * Gets the contents of the file.
	 *
	 * @param string $target_file File to write to.
	 *
	 * @return string
	 */
	public function writeContents( string $target_file ): string {
		foreach ( $this->getPaths() as $file ) {
			if ( ! file_exists( $file ) ) {
				continue;
			}

			$contents = file_get_contents( $this->getRoot() . $file );

			if ( ! $contents ) {
				continue;
			}

			$contents = $this->alterContents( $contents );

			if ( ! $contents ) {
				continue;
			}

			if ( strpos( $file, '/' ) === false ) {
				file_put_contents( $this->getRoot() . $target_file, $contents . "\n", FILE_APPEND );
				continue;
			}

			$contents = explode( "\n", $contents );
			$contents = (array) array_filter( $contents );
			$contents = array_map( 'trim', $contents );
			$contents = array_unique( $contents );

			$relative_path = str_replace( '/' . $target_file, '', $file );

			foreach ( $contents as $line ) {
				if ( strpos( $line, '/' ) !== 0 ) {
					$line = $relative_path . '/' . $line;
				} else {
					$line = $relative_path . $line;
				}

				file_put_contents( $this->getRoot() . $target_file, $line . "\n", FILE_APPEND );
			}
		}

		if ( ! file_exists( $this->getRoot() . $target_file ) ) {
			return '';
		}

		return (string) file_get_contents( $this->getRoot() . $target_file );
	}

	/**
	 * @return string
	 */
	public function getFilename(): string {
		return $this->filename;
	}

	/**
	 * Gets the paths of all files of this type.
	 *
	 * @return array<int, string>
	 */
	public function getPaths(): array {
		return $this->paths;
	}

	/**
	 * @return string
	 */
	public function getRoot(): string {
		return $this->root;
	}
}
