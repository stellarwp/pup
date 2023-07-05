<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\DirectoryUtils;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class GetVersion extends Command {
	/**
	 * @inheritDoc
	 */
	protected function configure() {
		$this->setName( 'get-version' )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Get the dev version.' )
			->setDescription( 'Gets the version for the product.' )
			->setHelp( 'Gets the version for the product.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$config        = App::$config;
		$extra_config  = $config->get();
		$version_files = $extra_config->version_files;

		$version_file_data = current( $version_files );
		$version_regex     = $version_file_data['regex'];
		$version_file      = DirectoryUtils::normalizeDir( $version_file_data['file'] );
		$working_dir       = DirectoryUtils::trailingSlashIt( $config->getWorkingDir() );

		$contents = file_get_contents( $working_dir . $version_file );
		preg_match( '/' . $version_regex . '/', $contents, $matches );

		if ( empty( $matches[2] ) ) {
			$version = 'unknown';
		} else {
			$version = $matches[2];
		}

		if ( $input->getOption( 'dev' ) ) {
			$version .= $this->getDevSuffix();
		}

		$output->writeln( $version );
		return 0;
	}

	/**
	 * @return string
	 */
	protected function getDevSuffix(): string {
		$timestamp = exec( 'git show -s --format=%ct HEAD' );
		$hash      = exec( 'git rev-parse --short=8 HEAD' );

		return "-dev-{$timestamp}-{$hash}";
	}
}
