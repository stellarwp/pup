<?php

namespace StellarWP\Pup\Check;

class Config implements \JsonSerializable {
	/**
	 * The check args.
	 * @var array<string, mixed>
	 */
	protected $args = [];

	/**
	 * Should the check bail on failure when running dist builds?
	 * @var string
	 */
	protected $fail_method = 'error';

	/**
	 * Should the check bail on failure when running dev builds?
	 * @var string
	 */
	protected $fail_method_dev = 'warning';

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
	 * The check type.
	 * @var string
	 */
	protected $type = 'pup';

	/**
	 * Config constructor.
	 *
	 * @param string $slug  The check slug.
	 * @param array<string, mixed> $check_config The check config args.
	 */
	public function __construct( string $slug, array $check_config ) {
		$this->slug   = $slug;
		$this->config = $check_config;

		if ( isset( $this->config['fail_method'] ) ) {
			$this->fail_method = (string) $this->config['fail_method'];
		}

		if ( isset( $this->config['fail_method_dev'] ) ) {
			$this->fail_method_dev = (string) $this->config['fail_method_dev'];
		}

		if ( isset( $this->config['args'] ) ) {
			$this->args = (array) $this->config['args'];
		}

		if ( isset( $this->config['type'] ) ) {
			$this->type = (string) $this->config['type'];
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
	 * Get the configure file.
	 *
	 * @return string
	 */
	public function getConfigureFile(): string {
		return empty( $this->config['configure'] ) ? '' : $this->config['configure'];
	}

	/**
	 * Get fail method.
	 *
	 * @return string
	 */
	public function getFailMethod(): string {
		return $this->fail_method;
	}

	/**
	 * Get fail method for --dev.
	 *
	 * @return string
	 */
	public function getFailMethodDev(): string {
		return $this->fail_method_dev;
	}

	/**
	 * Get the file.
	 *
	 * @return string
	 */
	public function getFile(): string {
		return empty( $this->config['file'] ) ? '' : $this->config['file'];
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
	 * Get the check type.
	 *
	 * @return string
	 */
	public function getType(): string {
		return $this->type;
	}

	/**
	 * @inheritdoc
	 */
	public function jsonSerialize() {
		return $this->config;
	}

	/**
	 * Should the check bail on failure for dist?
	 *
	 * @return bool
	 */
	public function shouldBailOnFailure(): bool {
		return $this->fail_method === 'error';
	}

	/**
	 * Should the check bail on failure for dev?
	 *
	 * @return bool
	 */
	public function shouldBailOnFailureDev(): bool {
		return $this->fail_method_dev === 'error';
	}
}