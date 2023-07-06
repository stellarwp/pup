<?php

namespace StellarWP\Pup;

use Symfony\Component\Console\Command\Command as SymfonyCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

abstract class Command extends SymfonyCommand {
	/**
	 * @var SymfonyStyle
	 */
	protected $io;

	/**
	 * @inheritdoc
	 *
	 * @return void
	 */
	protected function initialize( InputInterface $input, OutputInterface $output ) {
		$this->io = new SymfonyStyle( $input, $output );
	}

	/**
	 * @return SymfonyStyle
	 */
	protected function getIO(): SymfonyStyle {
		return $this->io;
	}
}