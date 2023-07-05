<?php
namespace StellarWP\Pup\Exceptions;

use Symfony\Component\Console\Exception\ExceptionInterface;
use Symfony\Component\Console\Exception\RuntimeException;
use Symfony\Component\Console\Output\OutputInterface;

class BaseException extends RuntimeException {
	public function render( OutputInterface $output ) {
		// Customize the error message output here
		$output->writeln( '<error>' . $this->getMessage() . '</error>' );
	}
}
