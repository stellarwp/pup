<?php

namespace StellarWP\Pup\Utils;

use StellarWP\Pup\App;

class Env {
	/**
	 * Prepend a command with the env vars.
	 *
	 * @param string $command Command to prepend.
	 *
	 * @return string
	 */
	public static function set( string $command ): string {
		$config       = App::getConfig();
		$config_items = $config->get();
		$env = [];

		if ( empty( $config_items->env ) ) {
			return $command;
		}

		foreach ( (array) $config_items->env as $env_item ) {
			$env[ $env_item ] = "{$env_item}=" . getenv( $env_item );
		}

		return implode( ' ', $env ) . ' ' . $command;
	}
}
