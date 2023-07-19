<?php

namespace StellarWP\Pup\Filesystem\SyncFiles;

class DistIgnore extends AbstractFile {
	/**
	 * @inheritdoc
	 */
	protected $filename = '.distignore';

	/**
	 * @inheritdoc
	 */
	protected $pup_filename = '.pup-distignore';
}
