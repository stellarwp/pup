<?php

namespace StellarWP\Pup\Commands;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions;
use StellarWP\Pup\Filesystem\SyncFiles\SyncFiles;
use StellarWP\Pup\Utils\Directory as DirectoryUtils;;
use stdClass;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Finder\Glob;
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

		//system( 'git stash --quiet' );

		$buffer = new BufferedOutput();
		$application = $this->getApplication();
		if ( $application ) {
			$application->find( 'zip-name' )->run( new ArrayInput( [ 'version' => $version ] ), $buffer );
		}
		$full_zip_name = trim( $buffer->fetch() );

		$zip_filename = "{$full_zip_name}.zip";

		$output->write( '* Updating version files...' );
		if ( $version !== 'unknown' ) {
			$this->updateVersionsInFiles( $version );
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
		//system( 'git stash apply --quiet' );
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
	 * @param string $root      Directory to sync.
	 * @param string $destination Where to sync to.
	 *
	 * @return int
	 */
	protected function syncFiles( string $root, string $destination ): int {
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

		if ( $root === '.' ) {
			$source = $working_dir;
		} elseif ( strpos( $root, $working_dir ) === false ) {
			$source = DirectoryUtils::trailingSlashIt( $working_dir . $root );
		} else {
			$source = DirectoryUtils::trailingSlashIt( $root );
		}

		$this->buildSyncFiles( $source );

		$filesystem = new Filesystem();
		$finder = new Finder();
		//$finder->in( $source );
		//$finder->ignoreDotFiles( true );
		//$finder->ignoreUnreadableDirs( true );
		/*
		$finder->notName( [
			'.puprc',
			'.pup-*',
		] );
		*/

		$ignore = [
			'.puprc',
			'.pup-*',
		];

		$include = [];

		if ( file_exists( $source . '.pup-distignore' ) ) {
			$distignore = file( $source . '/.pup-distignore', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );

			if ( $distignore ) {
				$ignore = array_merge( $ignore, $distignore );
			}
		}

		if ( file_exists( $source . '.pup-distinclude' ) ) {
			$distinclude = file( $source . '/.pup-distinclude', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );

			if ( $distinclude ) {
				$include = array_merge( $include, $distinclude );
			}
		}

		if ( file_exists( $source . '.pup-distfiles' ) ) {
			$distfiles = file( $source . '.pup-distfiles', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
			if ( $distfiles ) {
				$include = array_merge( $include, $distfiles );
			}
		}

		$iterator = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $source, RecursiveDirectoryIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::SELF_FIRST
		);

		foreach ( $iterator as $item ) {
			$path = ltrim( $iterator->getSubPathName(), '/\\' );

			if ( ! $this->is_included_file( $path, $include ) ) {
				continue;
			}

			if ( $this->is_ignored_file( $path, $ignore ) ) {
				continue;
			}

			if ( $item->isDir() ) {
				$filesystem->mkdir( $destination . DIRECTORY_SEPARATOR . $path );
				continue;
			}

			$filesystem->mkdir( $destination . DIRECTORY_SEPARATOR . dirname( $path ) );
			$filesystem->copy( $path, $destination . DIRECTORY_SEPARATOR . $path );
		}

		return 0;
	}

	/**
	 * Generate a glob regex pattern from a globstar pattern.
	 *
	 * @param string $original_pattern
	 *
	 * @return string
	 */
	public function globstarToRegex( string $original_pattern ): string {
		$pattern = ltrim( $original_pattern, '/' );

		// We don't want to quote the glob pattern `**/` in regex, later we'll replace it with an appropriate regex.
		$pattern = str_replace( '**/', '&glob;', $pattern );

		// We don't want to quote `*` in regex pattern, later we'll replace it with `.*`.
		$pattern = str_replace( '*', '&ast;', $pattern );
		$pattern = preg_quote( $pattern, '/' );
		$pattern = str_replace( '&glob;', '(.+\/)?', $pattern );
		$pattern = str_replace( '&ast;', '[^\/]*', $pattern );

		// If the entry is tied to the beginning of the path, add the `^` regex symbol.
		if ( 0 === strpos( $original_pattern, '/' ) ) {
			$pattern = '^' . $pattern;
		} elseif ( 0 === strpos( $original_pattern, '.' ) ) {
			$pattern = '(^|\/)' . $pattern;
		}

		return '/' . $pattern . '/';
	}

	/**
	 * Check a file from the plugin against the list of rules.
	 *
	 * @param string $relative_filepath Path to the file from the plugin root.
	 * @param string[] $rules List of rules.
	 *
	 * @return bool
	 */
	public function is_file_in_group( $relative_filepath, array $rules ) {

		foreach ( array_filter( $rules ) as $entry ) {
			// Skip comments.
			if ( preg_match( '/^#/', $entry ) ) {
				continue;
			}

			// Skip empty lines.
			if ( trim( $entry ) === '' ) {
				continue;
			}

			$pattern = $this->globstarToRegex( $entry );

			if ( preg_match( $pattern, $relative_filepath ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check a file from the plugin against the list of ignored rules.
	 *
	 * @param string $relative_filepath Path to the file from the plugin root.
	 * @param string[] $ignored List of ignore rules.
	 *
	 * @return bool True when the file matches a rule in the `.distignore` file.
	 */
	public function is_ignored_file( $relative_filepath, array $ignored ) {
		return $this->is_file_in_group( $relative_filepath, $ignored );
	}

	/**
	 * Check a file from the plugin against the list of include rules.
	 *
	 * @param string $relative_filepath Path to the file from the plugin root.
	 * @param string[] $include List of include rules.
	 *
	 * @return bool True when the file matches a rule in the `.distfiles` or `.distinclude` file.
	 */
	public function is_included_file( $relative_filepath, array $include ) {
		if ( empty( $include ) ) {
			return true;
		}

		return $this->is_file_in_group( $relative_filepath, $include );
	}

	/**
	 * Build the sync files to be used within the final sync.
	 *
	 * @param string $source
	 *
	 * @return void
	 */
	protected function buildSyncFiles( string $source ) {
		SyncFiles::get( '.distfiles' , $source )->writePup();
		SyncFiles::get( '.distinclude', $source )->writePup();
		SyncFiles::get( '.distignore', $source )->writePup();
		SyncFiles::get( '.gitattributes', $source )->writePup();
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
