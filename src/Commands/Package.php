<?php

namespace StellarWP\Pup\Commands;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use StellarWP\Pup\App;
use StellarWP\Pup\DirectoryUtils;
use stdClass;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Package extends Command {
	/**
	 * @var string Pup root directory.
	 */
	protected $dir;

	/**
	 * @var stdClass
	 */
	protected $config;

	/**
	 * @inheritDoc
	 */
	protected function configure() {
		$this->setName( 'package' )
			->addArgument( 'version', null, InputArgument::REQUIRED, 'Version being packaged.' )
			->setDescription( 'Packages the project for distribution.' )
			->setHelp( 'This command allows you to package the project for distribution.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$version      = $input->getArgument( 'version' );
		$config       = App::$config;
		$extra_config = $config->get();

		if ( empty( $extra_config->zip_name ) ) {
			$zip_name = $extra_config->zip_name;
		} else {
			$zip_name = preg_replace( '![^/]+/!', '', $config->getComposer()->getPackage()->getName() );
		}

		$working_dir   = DirectoryUtils::trailingSlashIt( $config->getWorkingDir() );
		$version_files = $extra_config->version_files;
		foreach ( $version_files as $file_data ) {
			$file  = DirectoryUtils::normalizeDir( $file_data->file );
			$regex = $file_data->regex;

			$contents = file_get_contents( $file );
			$contents = preg_replace( '/' . $regex . '/', '$1' . $version, $contents );
			file_put_contents( $file, $contents );
		}

		$zip_filename  = "{$zip_name}.{$version}.zip";
		$pup_build_dir = $working_dir . $config->getBuildDir();
		$pup_clone_dir = $working_dir . $config->getCloneDir();

		DirectoryUtils::rmdir( $pup_build_dir );

		mkdir( $pup_build_dir );

		$this->syncFiles( $pup_clone_dir, $pup_build_dir );

		$zip = new \ZipArchive();
		$zip->
	}

	/**
	 * Sync files from one directory to another.
	 *
	 * This mimics rsync so that it works on non-unix systems.
	 *
	 * @param string $source      Directory to sync.
	 * @param string $destination Where to sync to.
	 *
	 * @return array
	 */
	protected function syncFiles( string $source, string $destination ) {
		$iterator = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $source, RecursiveDirectoryIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::SELF_FIRST
		);

		$excluded_patterns = $this->loadExcludedPatterns( $source );

		foreach ( $iterator as $item ) {
			$source_path      = $item->getPathname();
			$relative_path    = substr( $source_path, strlen( $source ) + 1 );
			$destination_path = DirectoryUtils::trailingSlashIt( $destination ) . $iterator->getSubPathname();

			if ( $this->shouldExclude( $relative_path, $excluded_patterns ) ) {
				continue;
			}

			if ( $item->isDir() ) {
				if ( ! is_dir( $destination_path ) ) {
					mkdir( $destination_path );
				}
			} else {
				if ( ! file_exists( $destination_path ) || filemtime( $source_path ) > filemtime( $destination_path ) ) {
					copy( $source_path, $destination_path );
				}
			}
		}
	}

	/**
	 * Loads excluded patterns from the zip ignore file.
	 *
	 * @param string $source
	 *
	 * @return array
	 */
	protected function loadExcludedPatterns( string $source ) {
		$excluded_patterns = [
			App::$config->getCloneDir(),
			App::$config->getBuildDir(),
		];

		$exclude_file = DirectoryUtils::trailingSlashIt( $source ) . App::$config->getZipIgnore();

		if ( file_exists( $exclude_file ) ) {
			$excluded_patterns = file( $exclude_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
		}

		return $excluded_patterns;
	}

	/**
	 * Determine if a file should be excluded from the zip.
	 *
	 * @param string $path              Path to file to determine if exclusion is necessary.
	 * @param array  $excluded_patterns File glob patterns to exclude.
	 *
	 * @return bool
	 */
	protected function shouldExclude( $path, $excluded_patterns ): bool {
		foreach ( $excluded_patterns as $pattern ) {
			if ( fnmatch( $pattern, $path ) ) {
				return true;
			}
		}

		return false;
	}
}