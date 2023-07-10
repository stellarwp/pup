<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions;
use StellarWP\Pup\Utils\Directory as DirectoryUtils;;
use stdClass;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
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
	 * @var InputInterface
	 */
	protected $input;

	/**
	 * @var OutputInterface
	 */
	protected $output;

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'package' )
			->addArgument( 'version', InputArgument::REQUIRED, 'Version being packaged.' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Packages the project for distribution.' )
			->setHelp( 'This command allows you to package the project for distribution.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );
		$this->input = $input;
		$this->output = $output;
		$version  = $input->getArgument( 'version' );
		$root     = $input->getOption( 'root' ) ?: '.';
		$config   = App::getConfig();
		$zip_name = $config->getZipName();

		$output->writeln( '<comment>Packaging zip...</comment>' );

		system( 'git stash --quiet' );

		$zip_filename = "{$zip_name}.zip";

		$output->write( '* Updating version files...' );
		if ( $version !== 'unknown' ) {
			$this->updateVersionsInFiles( $version );
			$zip_filename = "{$zip_name}.{$version}.zip";
		}
		$output->write( 'Complete.' . PHP_EOL );

		$output->write( '* Synchronizing files to zip directory...' );
		$pup_zip_dir  = $config->getZipDir();

		DirectoryUtils::rmdir( $pup_zip_dir );

		mkdir( $pup_zip_dir );

		$results = $this->syncFiles( $root, $pup_zip_dir );
		$output->write( 'Complete.' . PHP_EOL );

		if ( $results !== 0 ) {
			$this->undoChanges();
			return $results;
		}

		$output->write( '* Zipping...' );
		$results = $this->createZip( $pup_zip_dir, $zip_filename, $zip_name );

		if ( $results !== 0 ) {
			$this->undoChanges();
			return $results;
		}
		$output->write( 'Complete.' . PHP_EOL );

		$this->undoChanges();

		$this->output->writeln( "<info>Zip {$zip_filename} created!</info>" );

		return 0;
	}

	/**
	 *
	 * @return void
	 */
	protected function undoChanges() {
		$version_files = App::getConfig()->getVersionFiles();
		foreach ( $version_files as $file ) {
			system( 'git checkout -- ' . escapeshellarg( $file->getPath() ) );
		}
		system( 'git stash apply --quiet' );
	}

	/**
	 * @param string $version
	 *
	 * @return bool
	 */
	protected function updateVersionsInFiles( string $version ): bool {
		$root          = $this->input->getOption( 'root' );
		$root          = $root ? DirectoryUtils::trailingSlashIt( $root ) : '';
		$config        = App::getConfig();
		$version_files = $config->getVersionFiles();

		foreach ( $version_files as $file ) {
			$contents = file_get_contents( $root . $file->getPath() );

			if ( ! $contents ) {
				throw new Exceptions\BaseException( 'Could not read file: ' . $file->getPath() );
			}

			$contents = preg_replace( '/' . $file->getRegex() . '/', '${1}' . $version, $contents, 1 );
			$results  = file_put_contents( $root . $file->getPath(), $contents );

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
	 * @return int
	 */
	protected function syncFiles( string $source, string $destination ): int {
		$working_dir      = App::getConfig()->getWorkingDir();
		$build_dir        = str_replace( $working_dir, '', App::getConfig()->getBuildDir() );
		$zip_dir          = str_replace( $working_dir, '', App::getConfig()->getZipDir() );
		$use_ignore_defaults  = App::getConfig()->getZipUseDefaultIgnore();
		$rsync_executable = App::getConfig()->getRsyncExecutable();
		$rsync_executable = DirectoryUtils::normalizeDir( $rsync_executable );
		$rsync_split      = explode( DIRECTORY_SEPARATOR, $rsync_executable );
		$executable       = array_pop( $rsync_split );

		if ( preg_match( '/[^a-zA-Z0-9.\-_]/', $executable ) ) {
			throw new Exceptions\BaseException( 'The rsync executable cannot contain spaces or special characters.' );
		}

		$command = [
			$rsync_executable,
			'-rlc',
		];

		if ( file_exists( $working_dir . '.distinclude' ) ) {
			$command[] = '--include-from=' . escapeshellarg( $working_dir . '.distinclude' );
		}

		if ( file_exists( $working_dir . '.distignore' ) ) {
			$command[] = '--exclude-from=' . escapeshellarg( $working_dir . '.distignore' );
		}

		if ( file_exists( $working_dir . '.gitattributes' ) ) {
			$gitattributes_contents = file_get_contents( $working_dir . '.gitattributes' );
			if ( $gitattributes_contents && preg_match( '/\sexport-ignore/m', $gitattributes_contents ) ) {
				$gitattributes_array = file( $working_dir . '.gitattributes' );
				$exclude = [];

				foreach ( (array) $gitattributes_array as $gitattributes_line ) {
					$gitattributes_line = trim( (string) $gitattributes_line );
					if ( strstr( $gitattributes_line, 'export-ignore' ) === false ) {
						continue;
					}

					$exclude[] = preg_replace( '/\s+export-ignore/', '', $gitattributes_line );
				}

				if ( ! empty( $exclude ) && file_put_contents( $working_dir . '.pup-distignore', implode( "\n", $exclude ) ) ) {
					$command[] = '--exclude-from=' . escapeshellarg( $working_dir . '.pup-distignore' );
				}
			}
		}

		if ( $use_ignore_defaults ) {
			if ( App::isPhar() ) {
				$command[] = '--exclude-from=<(php -r \'include ' . escapeshellarg( __PUP_DIR__ . '/.distignore-defaults' ) . ';\')';
			} else {
				$command[] = '--exclude-from=' . escapeshellarg( __PUP_DIR__ . '/.distignore-defaults' );
			}
		}

		$command[] = '--exclude=' . escapeshellarg( $build_dir );
		$command[] = '--exclude=' . escapeshellarg( $zip_dir );
		$command[] = '--exclude=\'.puprc\'';
		$command[] = '--exclude=\'.pup-distignore\'';

		$command[] = escapeshellarg( $source . '/' );
		$command[] = escapeshellarg( $destination . '/' );
		$command[] = '--delete';
		$command[] = '--delete-excluded';

		$command = implode( ' ', $command );
		$result_code = 0;
		system( $command, $result_code );
		return $result_code;
	}

	/**
	 * Create a zip file.
	 *
	 * @param string $dir_to_zip The directory to zip up.
	 * @param string $zip_filename The name of the zip file.
	 * @param string $root_dir The root directory to use in the zip file to hold all files.
	 *
	 * @return int
	 */
	protected function createZip( string $dir_to_zip, string $zip_filename, string $root_dir ): int {
		$zip = new ZipArchive();
		if ( $zip->open( $zip_filename, ZipArchive::CREATE | ZipArchive::OVERWRITE ) !== true ) {
			$this->output->writeln( '<error>Failed to create the zip archive!</error>' );
			return 1;
		}

		$zip->addEmptyDir( $root_dir );

		// Call the recursive function to add files to the zip archive
		$this->addFilesToZip( $root_dir, $dir_to_zip, $zip );

		// Close the zip archive
		$zip->close();

		return 0;
	}

	/**
	 * Adds files recursively to a zip archive.
	 *
	 * @param string     $root_dir The root directory within the zip archive.
	 * @param string     $dir The directory to add to the zip archive.
	 * @param ZipArchive $zip The zip archive object.
	 * @param string     $base_path The base path (relative path within $dir) to add files to.
	 *
	 * @return void
	 */
	protected function addFilesToZip( string $root_dir, string $dir, \ZipArchive $zip, string $base_path = '' ) {
		// Open the directory
		$handle = opendir( $dir );

		if ( ! $handle ) {
			throw new Exceptions\BaseException( "Could not open directory: {$dir}" );
		}

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