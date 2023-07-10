<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions\BaseException;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\Console\Output\OutputInterface;

class ZipName extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'zip-name' )
			->addArgument( 'version', InputArgument::OPTIONAL, 'Version of project - if not passed, pup get-version is called.' )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Get the dev version.' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Gets the version for the product.' )
			->setHelp( 'Gets the version for the product.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );
		$config        = App::getConfig();
		$root          = $input->getOption( 'root' );
		$version       = $input->getArgument( 'version' );
		$version_files = $config->getVersionFiles();

		if ( $root ) {
			chdir( $root );
		}

		if ( ! $version ) {
			$buffer = new BufferedOutput();
			$this->getApplication()->find( 'get-version' )->run( $input, $buffer );
			$version = trim( $buffer->fetch() );
		}

		$zip_name = $config->getZipName();

		if ( $version && $version !== 'unknown' ) {
			$zip_name = "{$zip_name}.{$version}";
		}

		if ( $root ) {
			chdir( $config->getWorkingDir() );
		}

		$output->writeln( $zip_name );

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
