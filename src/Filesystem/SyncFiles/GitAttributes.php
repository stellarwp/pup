<?php

namespace StellarWP\Pup\Filesystem\SyncFiles;

class GitAttributes extends AbstractFile {
	/**
	 * @inheritdoc
	 */
	protected $filename = '.gitattributes';

	/**
	 * @inheritdoc
	 */
	protected function alterContents( string $contents ): string {
		if ( ! $contents || ! preg_match( '/\sexport-ignore/m', $contents ) ) {
			return '';
		}

		$lines   = explode( "\n", $contents );
		$exclude = [];

		foreach ( (array) $lines as $line ) {
			$line = trim( (string) $line );
			if ( strstr( $line, 'export-ignore' ) === false ) {
				continue;
			}

			$exclude[] = preg_replace( '/\s+export-ignore/', '', $line );
		}

		return implode( "\n", $exclude );
	}
}
