<?php

namespace FakeProject\Thing;

_deprecated_file( __FILE__, 'TBD' );

class AnotherFile {
	/**
	 * @since TBD
	 * @version TBD
	 * @returns void
	 */
	public static function do_something() {
		$x = 1;
	}

	/**
	 * @since tbd
	 * @version tbd
	 * @returns void
	 */
	public static function do_something_else() {

		$x = 1;
	}

	/**
	 * @deprecated TBD
	 * @returns void
	 */
	public static function do_something_else_entirely() {
		_deprecated_function( __METHOD__, 'TBD' );
		$x = 1;
	}

	public static function get_version() {
		$version = 'TBD';
		return $version;
	}

	public static function get_other_version() {
		return "TBD";
	}
}
