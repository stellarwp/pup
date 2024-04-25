<?php

namespace StellarWP\Pup\Workflow;

use StellarWP\Pup\Exceptions\BaseException;

class Collection implements \ArrayAccess, \Iterator, \Countable {
	/**
	 * Collection of workflows.
	 *
	 * @var array<string, Workflow>
	 */
	protected $workflows = [];

	/**
	 * Adds a workflow to the collection.
	    *
	 * @since 1.0.0
	 *
	 * @param Workflow $workflow Workflow instance.
	 *
	 * @return mixed
	 */
	public function add( Workflow $workflow ) {
		$this->offsetSet( $workflow->getSlug(), $workflow );

		return $this->offsetGet( $workflow->getSlug() );
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function current() {
		return current( $this->workflows );
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function get( $offset ) {
		return $this->offsetGet( $offset );
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function key() {
		return key( $this->workflows );
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function next() {
		next( $this->workflows );
	}

	/**
	 * @inheritDoc
	 */
	public function offsetExists( $offset ): bool {
		return isset( $this->workflows[ $offset ] );
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function offsetGet( $offset ) {
		if ( ! isset( $this->workflows[ $offset ] ) ) {
			return null;
		}
		return $this->workflows[ $offset ];
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function offsetSet( $offset, $value ) {
		if ( ! $value instanceof Workflow ) {
			throw new BaseException( 'The value must be an instance of ' . Workflow::class . '.' );
		}

		$this->workflows[ $offset ] = $value; // @phpstan-ignore-line - This is a valid assignment.
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function offsetUnset( $offset ) {
		unset( $this->workflows[ $offset ] );
	}

	/**
	 * Helper function for removing a resource from the collection.
	 *
	 * @since 1.0.0
	 *
	 * @param string $slug Workflow slug.
	 *
	 * @return void
	 */
	public function remove( $slug ) {
		$this->offsetUnset( $slug );
	}

	/**
	 * @inheritDoc
	 */
	#[\ReturnTypeWillChange]
	public function rewind() {
		reset( $this->workflows );
	}

	/**
	 * Sets a resource in the collection.
	 *
	 * @param string $slug Workflow slug.
	 * @param Workflow $workflow Workflow instance.
	 *
	 * @return Workflow|null
	 */
	public function set( $slug, Workflow $workflow ) {
		$this->offsetSet( $slug, $workflow );

		return $this->offsetGet( $slug );
	}

	/**
	 * @inheritDoc
	 */
	public function valid(): bool {
		return key( $this->workflows ) !== null;
	}

	#[\ReturnTypeWillChange]
	public function count() {
		return count( $this->workflows );
	}
}
