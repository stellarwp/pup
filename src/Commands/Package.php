<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions;
use StellarWP\Pup\DirectoryUtils;
use stdClass;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use ZipArchive;

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
		$version  = $input->getArgument( 'version' );
		$config   = App::getConfig();
		$zip_name = $config->getZipName();

		$this->updateVersionsInFiles( $version );

		$zip_filename  = "{$zip_name}.{$version}.zip";
		$pup_build_dir = $config->getBuildDir();
		$pup_zip_dir   = $config->getZipDir();

		DirectoryUtils::rmdir( $pup_build_dir );

		mkdir( $pup_build_dir );

		$this->syncFiles( '.', $pup_zip_dir );

		$zip = new ZipArchive();
		if ( $zip->open( $zip_filename, ZipArchive::CREATE | ZipArchive::OVERWRITE ) === true ) {
			$zip->addEmptyDir( $zip_name );

			// Call the recursive function to add files to the zip archive
			$this->addFilesToZip( $zip_name, $pup_zip_dir, $zip );

			// Close the zip archive
			$zip->close();

			$output->writeln( "<info>Zip {$zip_filename} created!</info>" );
		} else {
			$output->writeln( '<error>Failed to create the zip archive!</error>' );
			return 1;
		}

		return 0;
	}

	/**
	 * @param string $version
	 *
	 * @return bool
	 */
	protected function updateVersionsInFiles( string $version ): bool {
		$config        = App::getConfig();
		$version_files = $config->getVersionFiles();

		foreach ( $version_files as $file_data ) {
			$file  = DirectoryUtils::normalizeDir( $file_data['file'] );
			$regex = $file_data['regex'];

			$contents = file_get_contents( $file );
			$contents = preg_replace( '/' . $regex . '/', '$1' . $version, $contents );
			$results  = file_put_contents( $file, $contents );

			if ( false === $results ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Sync files from one directory to another.
	 *
	 * This mimics rsync so that it works on non-unix systems.
	 *
	 * @param string $source      Directory to sync.
	 * @param string $destination Where to sync to.
	 *
	 * @return bool
	 */
	protected function syncFiles( string $source, string $destination ) {
		$working_dir      = App::getConfig()->getWorkingDir();
		$build_dir        = str_replace( $working_dir, '', App::getConfig()->getBuildDir() );
		$zip_dir          = str_replace( $working_dir, '', App::getConfig()->getZipDir() );
		$rsync_executable = App::getConfig()->getRsyncExecutable();
		$rsync_executable = DirectoryUtils::normalizeDir( $rsync_executable );
		$rsync_split      = explode( DIRECTORY_SEPARATOR, $rsync_executable );
		$executable       = array_pop( $rsync_split );

		if ( preg_match( '/[^a-zA-Z0-9.\-_]/', $executable ) ) {
			throw new Exceptions\BaseException( 'The rsync executable cannot contain spaces or special characters.' );
		}

		$command = [
			$rsync_executable,
			'-rc',
			'--exclude-from=' . escapeshellarg( $working_dir . '/.distignore' ),
			'--exclude-from=' . escapeshellarg( __PUP_DIR__ . '/.distignore-defaults' ),
			'--exclude=' . escapeshellarg( $build_dir ),
			'--exclude=' . escapeshellarg( $zip_dir ),
			'--exclude=.puprc',
			escapeshellarg( $source . '/' ),
			escapeshellarg( $destination . '/' ),
			'--delete',
			'--delete-excluded',
		];

		$command = implode( ' ', $command );
		$result_code = 0;
		system( $command, $result_code );
		return $result_code === 0;
	}

	protected function addFilesToZip( string $root_dir, string $dir, \ZipArchive $zip, string $base_path = '' ) {
		// Open the directory
		$handle = opendir( $dir );

		// Iterate through each file and directory
		while ( ( $file = readdir( $handle ) ) !== false ) {
			// Skip ".", "..", and hidden files/directories
			if ( $file == '.' || $file == '..' || strpos( $file, '.' ) === 0 ) {
				continue;
			}

			$file_path = $dir . '/' . $file;

			// Calculate the relative path inside the zip archive
			$zip_path = ltrim( $base_path . '/' . $file, '/' );

			if ( is_file( $file_path ) ) {
				// Add the file to the zip archive
				$zip->addFile( $file_path, $root_dir . '/' . $zip_path );
			} elseif ( is_dir( $file_path ) ) {
				// Create a new directory inside the zip archive
				$zip->addEmptyDir( $root_dir . '/' . $zip_path );

				// Recursively add files from the subdirectory
				$this->addFilesToZip( $root_dir, $file_path, $zip, $zip_path );
			}
		}

		// Close the directory handle
		closedir( $handle );
	}
}