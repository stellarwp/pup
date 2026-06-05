<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Exceptions\BaseException;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\Commands\Traits\DevSuffix;
use StellarWP\Pup\Utils\Directory as DirectoryUtils;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class ReplaceVersion extends Command {
	use DevSuffix;

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'replace-version' )
			->addArgument( 'version', InputArgument::REQUIRED, 'The version to write into the version files.' )
			->addOption( 'dev', null, InputOption::VALUE_NONE, 'Append the dev suffix to the version.' )
			->addOption( 'root', null, InputOption::VALUE_REQUIRED, 'Set the root directory for running commands.' )
			->setDescription( 'Replaces the version in the files defined in .puprc paths.versions.' )
			->setHelp( 'Replaces the version in the files defined in .puprc paths.versions with the provided version.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );

		$config        = App::getConfig();
		$version       = $input->getArgument( 'version' );
		$version_files = $config->getVersionFiles();

		if ( empty( $version_files ) ) {
			$output->writeln( '<fg=yellow>No version files found in .puprc paths.versions.</>' );
			return 1;
		}

		if ( $input->getOption( 'dev' ) ) {
			$version .= $this->getDevSuffix();
		}

		$root = $input->getOption( 'root' );
		$root = $root ? DirectoryUtils::trailingSlashIt( $root ) : '';

		foreach ( $version_files as $file ) {
			$contents = file_get_contents( $root . $file->getPath() );

			if ( ! $contents ) {
				throw new BaseException( 'Could not read file: ' . $file->getPath() );
			}

			$count    = 0;
			$replaced = preg_replace( '/' . $file->getRegex() . '/', '${1}' . $version, $contents, 1, $count );

			if ( null === $replaced ) {
				throw new BaseException( 'Could not replace version in file (check the regex): ' . $file->getPath() );
			}

			if ( $count === 0 ) {
				$output->writeln( "<fg=yellow>!</> No version found in <fg=cyan>{$file->getPath()}</> matching its regex. Skipping." );
				continue;
			}

			$results = file_put_contents( $root . $file->getPath(), $replaced );

			if ( false === $results ) {
				throw new BaseException( 'Could not write to file: ' . $file->getPath() );
			}

			$output->writeln( "<fg=green>✓</> Updated version in <fg=cyan>{$file->getPath()}</> to <fg=cyan>{$version}</>." );
		}

		return 0;
	}
}
