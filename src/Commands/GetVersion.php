<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\DirectoryUtils;
use StellarWP\Pup\Exceptions\BaseException;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class GetVersion extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
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
		$config        = App::getConfig();
		$version_files = $config->getVersionFiles();

		if ( empty( $version_files ) ) {
			$output->writeln( 'No version files found.' );
			return 1;
		}

		$version_file_data = current( $version_files );
		$version_regex     = $version_file_data['regex'];
		$version_file      = $version_file_data['file'];

		$contents = file_get_contents( $version_file );
		if ( ! $contents ) {
			throw new BaseException( "Could not read version file: {$version_file}" );
		}

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
