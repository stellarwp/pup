<?php

namespace StellarWP\Pup;

class I18nConfig {
	/**
	 * @var string
	 */
	protected $file_format = '';

	/**
	 * @var string
	 */
	protected $path = '';

	/**
	 * @var string
	 */
	protected $url = '';

	/**
	 * @var string
	 */
	protected $slug = '';

	/**
	 * @var string
	 */
	protected $textdomain = '';

	/**
	 * @var array<int, string>
	 */
	protected $formats = [];

	/**
	 * @var array<string, int|string>
	 */
	protected $filter = [];

	/**
	 * @param array<string, int|string|array<mixed, int|string>> $args
	 */
	public function __construct( $args = [] ) {
		if ( ! empty( $args['file_format'] ) && is_string( $args['file_format'] ) ) {
			$this->file_format = $args['file_format'];
		}

		if ( ! empty( $args['path'] ) && is_string( $args['path'] ) ) {
			$this->path = $args['path'];
		}

		if ( ! empty( $args['url'] ) && is_string( $args['url'] ) ) {
			$this->url = $args['url'];
		}

		if ( ! empty( $args['slug'] ) && is_string( $args['slug'] ) ) {
			$this->slug = $args['slug'];
		}

		if ( ! empty( $args['textdomain'] ) && is_string( $args['textdomain'] ) ) {
			$this->textdomain = $args['textdomain'];
		}

		if ( ! empty( $args['formats'] ) && is_array( $args['formats'] ) ) {
			foreach ( $args['formats'] as $format ) {
				$this->formats[] = (string) $format;
			}
		}

		if ( ! empty( $args['filter'] ) && is_array( $args['filter'] ) ) {
			foreach ( $args['filter'] as $key => $filter ) {
				$this->filter[ (string) $key ] = $filter;
			}
		}
	}

	/**
	 * @return string
	 */
	public function getFileFormat(): string {
		return $this->file_format;
	}

	/**
	 * @return string
	 */
	public function getPath(): string {
		return $this->path;
	}

	/**
	 * @return string
	 */
	public function getUrl(): string {
		return $this->url;
	}

	/**
	 * @return string
	 */
	public function getSlug(): string {
		return $this->slug;
	}

	/**
	 * @return string
	 */
	public function getTextdomain(): string {
		return $this->textdomain;
	}

	/**
	 * @return array<int, string>
	 */
	public function getFormats(): array {
		return $this->formats;
	}

	/**
	 * @return array<string, int|string>
	 */
	public function getFilter(): array {
		return $this->filter;
	}
}
