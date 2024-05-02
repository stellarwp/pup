<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Command\Command;
use StellarWP\Pup\Utils\Directory as DirectoryUtils;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Clone a git repository.
 *
 * This command is named CloneCommand because Clone is a reserved word in PHP.
 */
class CloneCommand extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'clone' )
			->setDescription( 'Clone a git repository.' )
			->setHelp( 'Clone a git repository.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );
		$config    = App::getConfig();
		$build_dir = $config->getBuildDir();
		$branch    = $input->getOption( 'branch' );

		$branch_arg = '';
		if ( $branch ) {
			$branch_arg = "-b {$branch}";
		}

		$repo = App::getConfig()->getRepo();

		if ( file_exists( $build_dir ) ) {
			$build_dir_basename = basename( $build_dir );
			$output->writeln( "The {$build_dir_basename} already exists." );
			$output->write( "Removing build dir..." );
			if ( file_exists( $build_dir ) && DirectoryUtils::rmdir( $build_dir ) !== 0 ) {
				throw new \Exception( "Could not remove {$build_dir}." );
			}
			$output->write( 'Complete.' . PHP_EOL );
		}

		$output->writeln( '<comment>Cloning the ' . $repo . ' repo into ' . App::getConfig()->getBuildDir( false ) . '...</comment>' );
		system( 'git clone --quiet --recurse-submodules -j8 --shallow-submodules --depth 1 ' . $branch_arg . ' ' . $repo . ' ' . App::getConfig()->getBuildDir( false ) );
		$output->writeln( '<fg=green>✓</> Clone complete.' );

		return 0;
	}
}
