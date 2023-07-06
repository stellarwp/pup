<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use StellarWP\Pup\Command\Io;
use Symfony\Component\Console\Input\InputInterface;

class VersionConflict extends AbstractCheck {
	/**
	 * The slug for the command.
	 * @var string
	 */
	protected $slug = 'version-conflict';

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function checkConfigure(): void {
		$this->setDescription( 'Hunts conflicts between versions stored in the version files.' );
		$this->setHelp( 'Hunts conflicts between versions stored in the version files.' );
	}

	/**
	 * Execute the check command.
	 *
	 * @param InputInterface  $input
	 * @param Io $output
	 *
	 * @return int
	 */
	protected function checkExecute( InputInterface $input, Io $output ): int {
		$output->writeln( '<comment>Checking for version conflicts...</comment>' );
		$version_files = App::getConfig()->getVersionFiles();

		$found_version_problem            = false;
		$versions                         = [];
		$package_json_compatible_versions = [];

		foreach ( $version_files as $version_file ) {
			$relative_file_path = $version_file->getPath();
			$full_file_path     = App::getConfig()->getWorkingDir() . $relative_file_path;
			$regex              = $version_file->getRegex();
			$location           = $relative_file_path . ' :: ' . $regex;
			$contents           = '';

			$version                         = 'unknown';
			$package_json_compatible_version = 'unknown';

			if ( ! file_exists( $full_file_path ) ) {
				$found_version_problem = true;
			}

			if ( ! $found_version_problem ) {
				$contents = file_get_contents( $full_file_path );
				if ( ! $contents ) {
					$found_version_problem = true;
				}
			}

			if ( ! $found_version_problem && $contents ) {
				preg_match( '!' . $version_file->getRegex() . '!', $contents, $matches );

				if ( empty( $matches[1] ) || empty( $matches[2] ) ) {
					$found_version_problem = true;
				} else {
					$version                         = trim( $matches[2] );
					$package_json_compatible_version = trim( $matches[2] );

					if ( substr_count( $version, '.' ) > 2 ) {
						$parts                           = explode( '.', $version );
						$package_json_compatible_version = $parts[0] . '.' . $parts[1] . '.' . $parts[2];
					}

					$version = trim( $matches[2] );
				}
			}

			if ( ! isset( $versions[ $version ] ) ) {
				$versions[ $version ] = [];
			}

			if ( ! isset( $package_json_compatible_versions[ $package_json_compatible_version ] ) ) {
				$package_json_compatible_versions[ $package_json_compatible_version ] = [];
			}

			$versions[ $version ][] = $location;

			$package_json_compatible_versions[ $package_json_compatible_version ][] = [];
		}

		if ( count( $package_json_compatible_versions ) !== 1 ) {
			$found_version_problem = true;
			$output->writeln( '<error>Found more than one version within the version files.</error>' );
		}

		if ( $found_version_problem ) {
			$output->writeln( 'Versions found: ');
			foreach ( $versions as $version => $locations ) {
				foreach ( $locations as $location ) {
					$output->writeln( " - {$version} in {$location}" );
				}
			}

			return 1;
		}

		$output->writeln( '<info>No version conflicts found.</info>' );
		return 0;
	}
}