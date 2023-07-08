<?php

namespace StellarWP\Pup\Command;

use StellarWP\Pup\App;
use Symfony\Component\Console\Command\Command as SymfonyCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

abstract class Command extends SymfonyCommand {
	/**
	 * @var Io
	 */
	protected $io;

	/**
	 * @var bool
	 */
	protected $should_validate_puprc = true;

	/**
	 * Runs the wrapping execute command.
	 *
	 * @param InputInterface  $input
	 * @param OutputInterface $output
	 *
	 * @return int
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		$config = App::getConfig();

		if ( $this->should_validate_puprc && $config->hasInvalidPuprc() ) {
			$output->writeln( str_repeat( '<fg=red>!</>', 80 ) );
			$output->writeln( '<fg=red>!!</>' );
			$output->writeln( '<fg=red>!!</> ❌ <fg=red>There is a <fg=cyan>.puprc</> file in this directory, but it could not be parsed.</>' );
			$output->writeln( '<fg=red>!!</> ❌ JSON Error: ' . $config->getPuprcParseError() );
			$output->writeln( '<fg=red>!!</>' );
			$output->writeln( str_repeat( '<fg=red>!</>', 80 ) );
		}

		return 0;
	}

	/**
	 * @inheritdoc
	 *
	 * @return void
	 */
	protected function initialize( InputInterface $input, OutputInterface $output ) {
		$this->io = new Io( $input, $output );
	}

	/**
	 * @return Io
	 */
	protected function getIO(): Io {
		return $this->io;
	}

	/**
	 * Sets the should_validate_puprc setting.
	 *
	 * @return void
	 */
	public function setShouldNotValidatePuprc() {
		$this->should_validate_puprc = false;
	}
}