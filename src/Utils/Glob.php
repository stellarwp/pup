<?php

namespace StellarWP\Pup\Utils;

class Glob {

	/**
	 * Generate a glob regex pattern from a globstar pattern.
	 *
	 * @param string $original_pattern
	 *
	 * @return string
	 */
	public static function toRegex( string $original_pattern ): string {
		$pattern = ltrim( $original_pattern, '/' );

		// Prevent escaping of desired patterns. Capture and adjust supported patterns.
		$pattern = str_replace( '**/', '&glob;', $pattern );
		$pattern = str_replace( ']*', ']&squareast;', $pattern );
		$pattern = str_replace( '[:upper:]', '&posixupper;', $pattern );
		$pattern = str_replace( '[:lower:]', '&posixlower;', $pattern );
		$pattern = str_replace( '[:alpha:]', '&posixalpha;', $pattern );
		$pattern = str_replace( '[:digit:]', '&posixdigit;', $pattern );
		$pattern = str_replace( '[:xdigit:]', '&posixxdigit;', $pattern );
		$pattern = str_replace( '[:alnum:]', '&posixalnum;', $pattern );
		$pattern = str_replace( '[:blank:]', '&posixblank;', $pattern );
		$pattern = str_replace( '[:space:]', '&posixspace;', $pattern );
		$pattern = str_replace( '[:word:]', '&posixword;', $pattern );
		$pattern = (string) preg_replace( '/\+\(([^)\/]+)\)/', '($1)&pluscapture;', $pattern );
		$pattern = (string) preg_replace( '/\*\(([^)\/]+)\)/', '($1)&astcapture;', $pattern );
		$pattern = (string) preg_replace( '/\?\(([^)\/]+)\)/', '($1)&questcapture;', $pattern );
		$pattern = (string) preg_replace( '/@\(([^)\/]+)\)/', '($1)&atcapture;', $pattern );
		$pattern = str_replace( '?', '&question;', $pattern );
		$pattern = str_replace( '(', '&openparen;', $pattern );
		$pattern = str_replace( ')', '&closeparen;', $pattern );
		$pattern = str_replace( '[', '&openbracket;', $pattern );
		$pattern = str_replace( ']', '&closebracket;', $pattern );
		$pattern = str_replace( '|', '&pipe;', $pattern );
		$pattern = str_replace( '+', '&plus;', $pattern );
		$pattern = str_replace( '*', '&ast;', $pattern );

		// Escape the regex.
		$pattern = preg_quote( $pattern, '/' );

		// Convert placeholders back into supported patterns.
		$pattern = str_replace( '&glob;', '(.+\/)?', $pattern );
		$pattern = str_replace( '&question;', '?', $pattern );
		$pattern = str_replace( '&openparen;', '(', $pattern );
		$pattern = str_replace( '&closeparen;', ')', $pattern );
		$pattern = str_replace( '&openbracket;', '[', $pattern );
		$pattern = str_replace( '&closebracket;', ']', $pattern );
		$pattern = str_replace( '&pipe;', '|', $pattern );
		$pattern = str_replace( '&plus;', '+', $pattern );
		$pattern = str_replace( '&pluscapture;', '+', $pattern );
		$pattern = str_replace( '&astcapture;', '*', $pattern );
		$pattern = str_replace( '&questcapture;', '?', $pattern );
		$pattern = str_replace( '&atcapture;', '{1}', $pattern );
		$pattern = str_replace( '&ast;', '[^\/]*', $pattern );
		$pattern = str_replace( '&posixupper;', '[A-Z]', $pattern );
		$pattern = str_replace( '&posixlower;', '[a-z]', $pattern );
		$pattern = str_replace( '&posixalpha;', '[a-zA-Z]', $pattern );
		$pattern = str_replace( '&posixdigit;', '[\d]', $pattern );
		$pattern = str_replace( '&posixxdigit;', '[\dA-Fa-f]', $pattern );
		$pattern = str_replace( '&posixalnum;', '[a-zA-Z\d]', $pattern );
		$pattern = str_replace( '&posixblank;', '[ \t]', $pattern );
		$pattern = str_replace( '&posixspace;', '\s', $pattern );
		$pattern = str_replace( '&posixword;', '\w+', $pattern );
		$pattern = str_replace( '&squareast;', '*', $pattern );

		// If the entry is tied to the beginning of the path, add the `^` regex symbol.
		if ( 0 === strpos( $original_pattern, '/' ) ) {
			$pattern = '^' . $pattern;
		} elseif ( 0 === strpos( $original_pattern, '.' ) ) {
			$pattern = '(^|\/)' . $pattern;
		}

		return '/' . $pattern . '/';
	}
}