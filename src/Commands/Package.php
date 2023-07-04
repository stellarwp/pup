<?php

namespace StellarWP\Pup\Commands;

use Exception;
use StellarWP\Pup\App;
use StellarWP\Pup\Config;
use stdClass;
use Symfony\Component\Console\Command\Command;
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

		$version_files = $extra_config->version_files;
		foreach ( $version_files as $file_data ) {
			$file  = $file_data->file;
			$regex = $file_data->regex;
			$file = str_replace( '/', DIRECTORY_SEPARATOR, $file );
			$file = str_replace( '\\', DIRECTORY_SEPARATOR, $file );

			$contents = file_get_contents( $file );
			$contents = preg_replace( '/' . $regex . '/', '$1' . $version, $contents );
			file_put_contents( $file, $contents );
		}

		$zip_filename = "{$zip_name}.{$version}.zip";
		$pup_build_dir = $config->getWorkingDir() . DIRECTORY_SEPARATOR . '.pup-build';

		if ( file_exists( $pup_build_dir ) ) {
			rmdir( $pup_build_dir );
		}

		mkdir( $pup_build_dir );
	}
}