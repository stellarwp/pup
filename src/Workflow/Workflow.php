<?php

namespace StellarWP\Pup\Workflow;

class Workflow {
	/**
	 * @var string
	 */
	protected $slug;

	/**
	 * @var array<int, string>
	 */
	protected $commands;

	/**
	 * @param string $slug Workflow ID.
	 * @param array<int, string> $commands Workflow commands.
	 */
	public function __construct( $slug, $commands ) {
		$this->slug = $slug;
		$this->commands = $commands;
	}

	/**
	 * @return string
	 */
	public function getSlug(): string {
		return $this->slug;
	}

	/**
	 * @return array<int, string>
	 */
	public function getCommands(): array {
		return $this->commands;
	}
}
