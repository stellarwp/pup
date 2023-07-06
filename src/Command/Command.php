<?php

namespace StellarWP\Pup\Command;

use Symfony\Component\Console\Command\Command as SymfonyCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

abstract class Command extends SymfonyCommand {
	/**
	 * @var Io
	 */
	protected $io;

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
}