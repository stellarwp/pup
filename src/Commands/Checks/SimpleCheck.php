<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use Symfony\Component\Console\Exception\LogicException;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class SimpleCheck extends AbstractCheck {
	/**
	 * @inheritdoc
	 */
	protected function checkConfigure(): void {
		$configure_file = $this->check_config->getConfigureFile();
		$full_path      = App::getConfig()->getWorkingDir() . $this->check_config->getConfigureFile();

		if ( ! empty( $configure_file ) && file_exists( $full_path ) ) {
			include $full_path;
		}
	}

	/**
	 * @inheritdoc
	 */
	protected function checkExecute( InputInterface $input, OutputInterface $output ) {
		$execute_file = $this->check_config->getFile();
		$full_path    = App::getConfig()->getWorkingDir() . $this->check_config->getFile();

		if ( ! empty( $execute_file ) && file_exists( $full_path ) ) {
			return include $full_path;
		}

		return 0;
	}
}