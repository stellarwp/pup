<?php

namespace StellarWP\Pup\Filesystem\SyncFiles;

class SyncFiles {
	public static function getDistFiles( string $root, array $paths = [] ): DistFiles {
		return new DistFiles( $root, $paths );
	}

	public static function getDistInclude( string $root, array $paths = [] ): DistInclude {
		return new DistInclude( $root, $paths );
	}

	public static function getDistIgnore( string $root, array $paths = [] ): DistIgnore {
		return new DistIgnore( $root, $paths );
	}

	/**
	 * @param string   $root
	 * @param array<int, string> $paths
	 *
	 * @return GitAttributes
	 */
	public static function getGitAttributes( string $root, array $paths = [] ): GitAttributes {
		return new GitAttributes( $root, $paths );
	}
}
