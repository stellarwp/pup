<?php

namespace StellarWP\Pup\Commands;

use StellarWP\Pup\App;
use StellarWP\Pup\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\Console\Output\OutputInterface;

class Help extends Command {
	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	protected function configure() {
		$this->setName( 'help' )
			->addArgument( 'topic', InputArgument::OPTIONAL, 'Command to get help on.' )
			->setDescription( 'Clean up after pup.' )
			->setHelp( 'Removes pup directories and artifacts.' );
	}

	/**
	 * @inheritDoc
	 */
	protected function execute( InputInterface $input, OutputInterface $output ) {
		parent::execute( $input, $output );
		$topic = $input->getArgument( 'topic' );

		if ( $topic ) {
			$this->printCommandHelp( $topic );
			return 0;
		} else {
			$this->printCommandList();
		}
		return 0;
	}

	/**
	 * Prints the command list.
	 *
	 * @return void
	 */
	protected function printCommandList(): void {
		$docs = file( __PUP_DIR__ . '/docs/commands.md' );

		$io = $this->getIO();

		$io->writeln( str_repeat( '*', 80 ) );
		$io->writeln( '*' );
		$io->writeln( '* <fg=blue><fg=magenta>P</>roduct <fg=magenta>U</>tility & <fg=magenta>P</>ackager</>' );
		$io->writeln( '* ' . str_repeat( '-', 78 ) . '' );
		$io->writeln( '* A CLI utility by StellarWP' );
		$io->writeln( '*' );
		$io->writeln( str_repeat( '*', 80 ) );

		$commands = [];
		$command = null;
		$definition = null;

		$io->newLine();
		$io->writeln( 'Run <fg=cyan>pup help <topic></> for more information on a specific command.' );
		$io->newLine();

		foreach ( (array) $docs as $doc_line ) {
			if ( ! $doc_line ) {
				continue;
			}

			$doc_line = trim( $doc_line );
			if ( ! $doc_line ) {
				continue;
			}

			if ( preg_match( '/##+\s+`pup ([^`]+)`/', $doc_line, $matches ) ) {
				$command = trim( $matches[1] );
				$command = '<fg=yellow>' . $command . '</>';
				$definition = null;
			} elseif ( $command && ! $definition ) {
				$definition = trim( $doc_line );
				$definition = preg_replace( '/`([^`]+)`/', '<fg=cyan>$1</>', $definition );
				$commands[ $command ] = [ $command, $definition ];
			}
		}

		$application = $this->getApplication();
		if ( $application ) {
			$command = $application->find( 'list' );
			$arguments = [];

			$buffer = new BufferedOutput();

			$command_input = new ArrayInput( $arguments );
			$command->run( $command_input, $buffer );

			preg_match_all( '/check:([^\s\t]+)(.*)$/m', $buffer->fetch(), $matches );

			$command_parts = [];
			if ( ! empty( $matches[1] ) ) {
				$command_parts = $matches[1];
			}

			foreach ( $command_parts as $command_part ) {
				if ( ! isset( $command_part ) ) {
					continue;
				}

				$command_part = trim( $command_part );

				if ( in_array( $command_part, [ 'tbd', 'version-conflict' ], true ) ) {
					continue;
				}

				$command = '<fg=yellow>check:' . $command_part . '</>';

				$commands[ $command ] = [ $command, 'Custom check' ];
			}
		}

		ksort( $commands );

		$io->table(
			[ 'Command', 'Description' ],
			$commands
		);

		$io->newLine();
		$io->writeln( 'For more documentation, head over to <fg=yellow>https://github.com/stellarwp/pup</>' );
	}

	/**
	 * @param string $topic
	 *
	 * @return void
	 */
	protected function printCommandHelp( string $topic ): void {
		$docs = file( __PUP_DIR__ . '/docs/commands.md' );

		$io = $this->getIO();

		$start = false;
		$did_first_line = false;
		$example = false;
		$arguments = false;
		$arguments_headers = [];
		$arguments_lines = [];

		foreach ( (array) $docs as $doc_line ) {
			if ( ! is_string( $doc_line ) ) {
				continue;
			}

			if ( $start ) {
				if ( preg_match( '/##+\s+`pup /', $doc_line ) ) {
					break;
				}

				if ( preg_match( '/^```/', $doc_line ) ) {
					if ( ! $example ) {
						$example = true;
					} else {
						$example = false;
					}
					$io->writeln( '<fg=green>' . str_repeat( '.', 50 ) . '</>' );
					continue;
				}

				if ( $example ) {
					if ( preg_match( '/^#/', $doc_line ) ) {
						$doc_line = '<fg=green>' . $doc_line . '</>';
					} else {
						$doc_line = '<fg=cyan>' . $doc_line . '</>';
					}
				}

				$doc_line = (string) preg_replace( '/`([^`]+)`/', '<fg=cyan>$1</>', $doc_line );
				$doc_line = (string) preg_replace( '/\*\*([^*]+)\*\*/', '<fg=red>$1</>', $doc_line );
				$doc_line = (string) preg_replace( '/\[([^\]]+)\]\([^\)]+\)/', '$1', $doc_line );

				if ( $arguments ) {
					if ( preg_match( '/^\| (Arg|Opt)/', $doc_line ) ) {
						$arguments_headers = array_map( 'trim', explode( '|', trim( $doc_line, '|' ) ) );
						continue;
					}

					if ( preg_match( '/^\|--/', $doc_line ) ) {
						continue;
					}

					if ( preg_match( '/^\|/', $doc_line ) ) {
						$arguments_lines[] = array_map( 'trim', explode( '|', trim( $doc_line, '|' ) ) );
						continue;
					}

					if ( ! empty( $arguments_headers ) ) {
						$arguments = false;

						$io->table(
							$arguments_headers,
							$arguments_lines
						);
					}
				}

				if ( preg_match( '/^##(#+ )(.+)/', $doc_line, $matches ) ) {
					$io->section( str_repeat( '>', substr_count( $matches[1], '#' ) ) . ' ' . $matches[2] . ':' );

					if ( preg_match( '/^##(#+ )(Arguments|`\.puprc` options)/', $doc_line, $matches ) ) {
						$arguments = true;
					}
					continue;
				}

				$io->write( $doc_line );

				if ( ! $did_first_line ) {
					$did_first_line = true;
					$io->newLine();
				}
			} elseif ( preg_match( '/^##+\s+`pup ' . $topic . '`/', $doc_line, $matches ) ) {
				$io->title( 'Help: <fg=cyan>pup ' . $topic . '</>' );
				$start = true;
			}

		}

		if ( $arguments && ! empty( $arguments_headers ) ) {
			$arguments = false;
			$io->table(
				$arguments_headers,
				$arguments_lines
			);
		}
	}
}
