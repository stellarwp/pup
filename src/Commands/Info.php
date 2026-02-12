<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Utils\Directory as DirectoryUtils;;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Info extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'info' )
			->setDescription( 'Gets pup details for the current project.' )
			->setHelp( 'Gets pup details for the current project.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$config = App::getConfig();
		$io     = $this->getIO();

		$io->title( 'CLI Info' );
		$io->writeln( App::instance()->getLongVersion() );

		$io->section( 'Working Directory' );
		$io->writeln( $config->getWorkingDir() );

		$io->section( 'File info' );
		$files = [
			'.distignore',
			'.distinclude',
			'.gitattributes',
			'.puprc',
		];

		$files_error  = [];
		$files_exist  = [];
		$files_absent = [];

		foreach ( $files as $file ) {
			$exists = file_exists( $file );

			$file_styled = '<fg=cyan>' . $file . '</>';
			$prefix = '⚫';
			$suffix = 'does not exist';
			$array_to_populate = 'files_absent';

			if ( $exists && $file === '.puprc' && ! json_decode( (string) file_get_contents( $file ) ) ) {
				$prefix = '❌';
				$suffix = '<fg=green>exists</> but could not be parsed: ' . json_last_error_msg();
				$array_to_populate = 'files_error';
			} elseif ( $exists ) {
				$prefix = '✅';
				$suffix = '<fg=green>exists</>';
				$array_to_populate = 'files_exist';
			}

			$$array_to_populate[] = "{$prefix} {$file_styled} - {$suffix}";
		}

		foreach ( (array) $files_error as $file_line ) { // @phpstan-ignore-line - false positive, array populated by variable variable
			$io->writeln( $file_line );
		}

		foreach ( (array) $files_exist as $file_line ) { // @phpstan-ignore-line - false positive, array populated by variable variable
			$io->writeln( $file_line );
		}

		foreach ( (array) $files_absent as $file_line ) { // @phpstan-ignore-line - false positive, array populated by variable variable
			$io->writeln( $file_line );
		}

		$io->section( 'Config' );
		$io->writeln( (string) json_encode( $config, JSON_PRETTY_PRINT ) );

		return 0;
	}
}
