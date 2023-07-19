<?php

namespace StellarWP\Pup\Filesystem\SyncFiles;

class DistFiles extends AbstractFile {
	/**
	 * @inheritdoc
	 */
	protected $filename = '.distfiles';

	/**
	 * @inheritdoc
	 */
	protected $pup_filename = '.pup-distfiles';
}
