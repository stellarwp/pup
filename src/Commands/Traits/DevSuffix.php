<?php

namespace StellarWP\Pup\Commands\Traits;

/**
 * Provides the dev version suffix used by version-related commands.
 */
trait DevSuffix {
	/**
	 * Builds the dev suffix (e.g. -dev-<timestamp>-<hash>) from the current git HEAD.
	 *
	 * @return string
	 */
	protected function getDevSuffix(): string {
		$timestamp = exec( 'git show -s --format=%ct HEAD' );
		$hash      = exec( 'git rev-parse --short=8 HEAD' );

		return "-dev-{$timestamp}-{$hash}";
	}
}
