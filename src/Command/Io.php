<?php

namespace StellarWP\Pup\Command;

use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Output\TrimmedBufferOutput;
use Symfony\Component\Console\Style\SymfonyStyle;

class Io extends SymfonyStyle {
	/**
	 * The prefix to use for output.
	 * @var string
	 */
	protected $output_prefix = '';

	/**
	 * The buffered output.
	 *
	 * @var TrimmedBufferOutput
	 */
	protected $bufferedOutput;

	public function __construct( InputInterface $input, OutputInterface $output, string $prefix = '' ) {
		$this->setPrefix( $prefix );

		$this->bufferedOutput = new TrimmedBufferOutput( \DIRECTORY_SEPARATOR === '\\' ? 4 : 2, $output->getVerbosity(), false, clone $output->getFormatter() );

		parent::__construct( $input, $output );
	}

	/**
	 * Sets the output prefix.
	 *
	 * @param string $prefix
	 *
	 * @return void
	 */
	public function setPrefix( string $prefix ): void {
		$this->output_prefix = $prefix ? "<info>[{$prefix}]</info> " : '';
	}

	/**
	 * {@inheritdoc}
	 *
	 * @param string|array<int, string> $messages
	 */
	public function writeln( $messages, int $type = self::OUTPUT_NORMAL ): void {
		if ( ! is_iterable( $messages ) ) {
			$messages = [ $messages ];
		}

		foreach ( $messages as $message ) {
			parent::writeln( $this->output_prefix . $message, $type );
			$this->writeBuffer( $message, true, $type );
		}
	}

	/**
	 * @param string $message
	 * @param bool   $newLine
	 * @param int    $type
	 *
	 * @return void
	 */
	private function writeBuffer( string $message, bool $newLine, int $type ): void {
		// We need to know if the last chars are PHP_EOL
		$this->bufferedOutput->write( $message, $newLine, $type );
	}
}