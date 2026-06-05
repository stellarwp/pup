<?php

namespace StellarWP\Pup\Check;

/**
 * Shared file-walk and TBD detection used by both the `tbd` check and the
 * `replace-tbd` command, so the two stay in sync: replace-tbd resolves exactly
 * what check:tbd flags.
 */
class TbdScanner {
	/**
	 * Default pipe-delimited list of file patterns to skip.
	 */
	const DEFAULT_SKIP_FILES = '.min.css|.min.js|.map.js|.css|.png|.jpg|.jpeg|.svg|.gif|.ico';

	/**
	 * Default pipe-delimited list of directories to skip.
	 */
	const DEFAULT_SKIP_DIRECTORIES = 'bin|build|vendor|node_modules|.git|.github|tests';

	/**
	 * Patterns that identify a TBD version placeholder on a line.
	 *
	 * @var string[]
	 */
	const PATTERNS = [
		'/\*\s*\@(since|deprecated|version)\s.*tbd/i',
		'/_deprecated_\w\(.*[\'"]tbd[\'"]/i',
		'/[\'"]tbd[\'"]/i',
	];

	/**
	 * Regex-ready list of file patterns to skip.
	 * @var string
	 */
	protected $files_to_skip;

	/**
	 * Regex-ready list of directories to skip.
	 * @var string
	 */
	protected $directories_to_skip;

	/**
	 * @param string $files_to_skip       Pipe-delimited file patterns to skip.
	 * @param string $directories_to_skip Pipe-delimited directories to skip.
	 */
	public function __construct( string $files_to_skip = self::DEFAULT_SKIP_FILES, string $directories_to_skip = self::DEFAULT_SKIP_DIRECTORIES ) {
		$this->files_to_skip       = str_replace( '.', '\.', $files_to_skip );
		$this->directories_to_skip = str_replace( '.', '\.', $directories_to_skip );
	}

	/**
	 * Builds a scanner from a check config array (e.g. the `tbd` check config).
	 *
	 * @param array<string, mixed> $config
	 *
	 * @return self
	 */
	public static function fromConfig( array $config ): self {
		$files_to_skip       = ! empty( $config['skip_files'] ) ? (string) $config['skip_files'] : self::DEFAULT_SKIP_FILES;
		$directories_to_skip = ! empty( $config['skip_directories'] ) ? (string) $config['skip_directories'] : self::DEFAULT_SKIP_DIRECTORIES;

		return new self( $files_to_skip, $directories_to_skip );
	}

	/**
	 * Returns the eligible (non-skipped) file short-paths within a scan dir.
	 *
	 * @param string $root        The root directory to scan from.
	 * @param string $current_dir The current working directory, stripped from paths.
	 * @param string $scan_dir    The directory (relative to root) to scan.
	 *
	 * @return string[]
	 */
	public function getFiles( string $root, string $current_dir, string $scan_dir ): array {
		$files = [];

		$dir = new \RecursiveIteratorIterator( new \RecursiveDirectoryIterator( $root . '/' . $scan_dir ) );
		foreach ( $dir as $file ) {
			// Skip directories like "." and ".." to avoid file_get_contents errors.
			if ( $file->isDir() ) {
				continue;
			}

			$file_path  = $file->getPathname();
			$short_path = (string) str_replace( $current_dir . '/', '', $file_path );

			if ( preg_match( '!(' . $this->files_to_skip . ')$!', $short_path ) ) {
				continue;
			}

			if ( preg_match( '!(\.pup-)|(\.puprc)!', $short_path ) ) {
				continue;
			}

			$directory_separator = DIRECTORY_SEPARATOR;
			if ( $directory_separator === '\\' ) {
				$directory_separator = '\\\\';
			}

			if ( preg_match( '!(' . $this->directories_to_skip . ')' . $directory_separator . '!', $short_path ) ) {
				continue;
			}

			$files[] = $short_path;
		}

		return $files;
	}

	/**
	 * Whether a line contains a TBD version placeholder.
	 *
	 * @param string $line
	 *
	 * @return bool
	 */
	public function lineMatches( string $line ): bool {
		foreach ( self::PATTERNS as $pattern ) {
			if ( preg_match( $pattern, $line ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Replaces the TBD token(s) on a line with the given version.
	 *
	 * Only lines that match a TBD pattern are touched; on those, every standalone
	 * `tbd` token (case-insensitive) is replaced.
	 *
	 * @param string $line    The line to process.
	 * @param string $version The version to replace TBD with.
	 * @param int    $count   Set to the number of replacements made on the line.
	 *
	 * @return string The (possibly) modified line.
	 */
	public function replaceInLine( string $line, string $version, int &$count = 0 ): string {
		$count = 0;

		if ( ! $this->lineMatches( $line ) ) {
			return $line;
		}

		$replaced = preg_replace( '/\btbd\b/i', $version, $line, -1, $count );

		return $replaced === null ? $line : $replaced;
	}
}
