<?php

namespace StellarWP\Pup\Tests\Cli\Commands;

use Codeception\Example;
use StellarWP\Pup\Tests\Cli\AbstractBase;
use StellarWP\Pup\Tests\CliTester;
use StellarWP\Pup\Utils\Glob;

class PackageGlobCest extends AbstractBase {

	protected function globProvider(): array {
		return [
			[
				'glob' => '/license.txt',
				'match' => [
					'license.txt'
				],
				'not_match' => [
					'src/license.txt',
				]
			],
			[
				'glob' => 'src/**/*.js',
				'match' => [
					'src/js/index.js',
					'src/js/other.js',
					'src/bork/other/other.js',
				],
				'not_match' => [
					'src/js/index.css',
					'src/js/other.css',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/js?/*.js',
				'match' => [
					'src/js/index.js',
					'src/js/other.js',
					'src/j/other.js',
				],
				'not_match' => [
					'src/js/index.css',
					'src/js/other.css',
					'src/jb/other.js',
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/+(js|app)/*.js',
				'match' => [
					'src/js/index.js',
					'src/js/other.js',
					'src/app/other.js',
				],
				'not_match' => [
					'src/js/index.css',
					'src/js/other.css',
					'src/jb/other.js',
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/@(js|app)/*.js',
				'match' => [
					'src/js/index.js',
					'src/js/other.js',
					'src/app/other.js',
				],
				'not_match' => [
					'src/jsapp/other.js',
					'src/jsjs/other.js',
				],
			],
			[
				'glob' => 'src/j?(s|b)/*.js',
				'match' => [
					'src/js/index.js',
					'src/js/other.js',
					'src/jb/other.js',
				],
				'not_match' => [
					'src/jss/other.js',
					'src/jsb/other.js',
					'src/app/other.js',
				],
			],
			[
				'glob' => 'src/j*(s|b)/*.js',
				'match' => [
					'src/js/index.js',
					'src/jb/other.js',
					'src/j/other.js',
					'src/jss/other.js',
					'src/jsb/other.js',
				],
				'not_match' => [
					'src/jj/other.js',
					'src/app/other.js',
				],
			],
			[
				'glob' => 'src/[:upper:]+/*.js',
				'match' => [
					'src/JS/index.js',
					'src/CSS/other.js',
				],
				'not_match' => [
					'src/jS/index.css',
					'src/js/other.css',
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/[:lower:]+/*.js',
				'match' => [
					'src/js/index.js',
					'src/js/other.js',
				],
				'not_match' => [
					'src/JS/index.js',
					'src/Js/other.js',
				],
			],
			[
				'glob' => 'src/[:word:]/*.js',
				'match' => [
					'src/js/index.js',
					'src/js/other.js',
				],
				'not_match' => [
					'src/js/index.css',
					'src/js/other.css',
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/[:lower:][:digit:]+/*.js',
				'match' => [
					'src/v1/index.js',
					'src/v2234/other.js',
				],
				'not_match' => [
					'src/js/other.js',
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/[:lower:][:xdigit:]+/*.js',
				'match' => [
					'src/v1/index.js',
					'src/v2F/other.js',
				],
				'not_match' => [
					'src/js/other.js',
					'src/vG/other.js',
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/v[:blank:]*[:digit:]/*.js',
				'match' => [
					'src/v1/index.js',
					'src/v 2/other.js',
					'src/v   3/other.js',
				],
				'not_match' => [
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/v[:space:]*[:digit:]/*.js',
				'match' => [
					'src/v1/index.js',
					'src/v 2/other.js',
					'src/v   3/other.js',
				],
				'not_match' => [
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/v+/*.js',
				'match' => [
					'src/v/index.js',
					'src/vv/other.js',
					'src/vvv/other.js',
				],
				'not_match' => [
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
			[
				'glob' => 'src/v*/**/js/**/*.js',
				'match' => [
					'src/vasdf/js/index.js',
					'src/vasdf/asdf/js/index.js',
					'src/vasdf/asdf/js/asdf/index.js',
					'src/vasdf/asdf/js/asdf/asdf/index.js',
				],
				'not_match' => [
					'src/bork/other/other.js',
					'src/bork/other/other.php',
				],
			],
		];
	}

	/**
	 * @test
	 * @dataProvider globProvider
	 */
	public function it_should_match_regex( CliTester $I, Example $example ) {
		$regex = Glob::toRegex( $example['glob'] );
		foreach ( $example['match'] as $file ) {
			$I->assertRegExp( $regex, $file );
		}

		foreach ( $example['not_match'] as $file ) {
			$I->assertNotRegExp( $regex, $file );
		}
	}
}