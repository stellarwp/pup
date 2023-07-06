<?php

namespace StellarWP\Pup;

use StellarWP\Pup\Commands\Checks;
use StellarWP\Pup\Exceptions\BaseException;
use Symfony\Component\Console\Command\Command;

class CheckCollection implements \ArrayAccess, \Iterator {
	/**
	 * Collection of checks.
	 *
	 * @var array<string, Checks\AbstractCheck>
	 */
	protected $checks = [];

	/**
	 * Adds a check to the collection.
	 *
	 * @since 1.0.0
	 *
	 * @param Checks\AbstractCheck $check Check command instance.
	 *
	 * @return mixed
	 */
	public function add( Checks\AbstractCheck $check ) {
		$this->offsetSet( $check->getSlug(), $check );

		return $this->offsetGet( $check->getSlug() );
	}

	/**
	 * @inheritDoc
	 */
	public function current() {
		return current( $this->checks );
	}

	/**
	 * @inheritDoc
	 */
	public function key() {
		return key( $this->checks );
	}

	/**
	 * @inheritDoc
	 */
	public function next() {
		next( $this->checks );
	}

	/**
	 * @inheritDoc
	 */
	public function offsetExists( $offset ): bool {
		return isset( $this->checks[ $offset ] );
	}

	/**
	 * @inheritDoc
	 */
	public function offsetGet( $offset ) {
		return $this->checks[ $offset ];
	}

	/**
	 * @inheritDoc
	 */
	public function offsetSet( $offset, $value ) {
		if ( ! $value instanceof Checks\AbstractCheck ) {
			throw new BaseException( 'The value must be an instance of ' . Checks\AbstractCheck::class . '.' );
		}

		$this->checks[ $offset ] = $value; // @phpstan-ignore-line - This is a valid assignment.
	}

	/**
	 * @inheritDoc
	 */
	public function offsetUnset( $offset ) {
		unset( $this->checks[ $offset ] );
	}

	/**
	 * Helper function for removing a resource from the collection.
	 *
	 * @since 1.0.0
	 *
	 * @param string $slug Check slug.
	 *
	 * @return void
	 */
	public function remove( $slug ) {
		$this->offsetUnset( $slug );
	}

	/**
	 * @inheritDoc
	 */
	public function rewind() {
		reset( $this->checks );
	}

	/**
	 * Sets a resource in the collection.
	 *
	 * @param string $slug Command slug.
	 * @param Checks\AbstractCheck $check Command instance.
	 *
	 * @return mixed
	 */
	public function set( $slug, Checks\AbstractCheck $check ) {
		$this->offsetSet( $slug, $check );

		return $this->offsetGet( $slug );
	}

	/**
	 * @inheritDoc
	 */
	public function valid(): bool {
		return key( $this->checks ) !== null;
	}
}