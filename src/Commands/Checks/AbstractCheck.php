<?php

namespace StellarWP\Pup\Commands\Checks;

use StellarWP\Pup\App;
use Symfony\Component\Console\Command\Command;

abstract class AbstractCheck extends Command {
	/**
	 * The slug for the command.
	 * @var string
	 */
	public static $slug = '';

	/**
	 * The arguments for the command.
	 * @var array<string, mixed>
	 */
	protected $args = [];

	/**
	 * Should this command bail on failure?
	 * @var bool
	 */
	protected $bail_on_failure = false;

	/**
	 * @inheritDoc
	 *
	 * @return void
	 */
	final protected function configure() {
		if ( empty( static::$slug ) ) {
			throw new \Exception( 'The "public static $slug" property must be set in ' . __CLASS__ . '.' );
		}

		$this->setName( 'check:' . static::$slug );
		$this->checkConfigure();

		App::getCheckCollection()->add( $this );
	}

	/**
	 * Configure the check command.
	 *
	 * @return void
	 */
	abstract protected function checkConfigure(): void;

	/**
	 * Get the check's slug.
	 *
	 * @return array<string, mixed>
	 */
	public function getArgs(): array {
		return $this->args;
	}

	/**
	 * Get the check's slug.
	 *
	 * @return string
	 */
	public function getSlug(): string {
		return static::$slug;
	}

	/**
	 * Should this command bail on failure?
	 * @return bool
	 */
	public function shouldBailOnFailure(): bool {
		return $this->bail_on_failure;
	}
}