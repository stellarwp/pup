<?php

namespace StellarWP\Pup;

class CheckConfig {
	/**
	 * The check args.
	 * @var array<string, mixed>
	 */
	protected $args = [];

	/**
	 * Should the check bail on failure when running dist builds?
	 * @var bool
	 */
	protected $bail_on_failure = false;

	/**
	 * Should the check bail on failure when running dev builds?
	 * @var bool
	 */
	protected $bail_on_failure_dev = false;

	/**
	 * The check config.
	 * @var array<string, mixed>
	 */
	protected $config = [];

	/**
	 * The check slug.
	 * @var string
	 */
	protected $slug;

	/**
	 * CheckConfig constructor.
	 *
	 * @param string $slug  The check slug.
	 * @param array<string, mixed> $check_config The check config args.
	 */
	public function __construct( string $slug, array $check_config ) {
		$this->slug   = $slug;
		$this->config = $check_config;

		if ( isset( $this->config['bail_on_failure'] ) ) {
			$this->bail_on_failure = (bool) $this->config['bail_on_failure'];
		}

		if ( isset( $this->config['bail_on_failure_dev'] ) ) {
			$this->bail_on_failure = (bool) $this->config['bail_on_failure_dev'];
		}

		if ( isset( $this->config['args'] ) ) {
			$this->args = (array) $this->config['args'];
		}
	}

	/**
	 * Get the check args.
	 *
	 * @return array<string, mixed>
	 */
	public function getArgs(): array {
		return $this->args;
	}

	/**
	 * Get the check config.
	 *
	 * @return array<string, mixed>
	 */
	public function getConfig(): array {
		return $this->config;
	}

	/**
	 * Get the check slug.
	 *
	 * @return string
	 */
	public function getSlug(): string {
		return $this->slug;
	}

	/**
	 * Should the check bail on failure for dist?
	 *
	 * @return bool
	 */
	public function shouldBailOnFailure(): bool {
		return $this->bail_on_failure;
	}

	/**
	 * Should the check bail on failure for dev?
	 *
	 * @return bool
	 */
	public function shouldBailOnFailureDev(): bool {
		return $this->bail_on_failure_dev;
	}
}