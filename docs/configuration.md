# Configuration

Projects that wish to customize the [default configuration](/.puprc-defaults) can do so by adding a `.puprc` file to the
root of the project. This file is a JSON file that contains the configuration options that you wish to override.

## Top-level properties

| Property    | Type            | Description                                                                                                                                                                                   |
|-------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `build`     | `array`         | An array of CLI commands to execute for the build process of your project. Supports sub-arrays for [parallel execution](/docs/commands.md#parallel-build-steps).                               |
| `build_dev` | `array`         | An array of CLI commands to execute for the `--dev` build process of your project. If empty, it defaults to the value of `build`. Supports sub-arrays for [parallel execution](/docs/commands.md#parallel-build-steps). |
| `checks`    | `object`        | An object of check configurations indexed by the check's slug. See the [docs for checks](/docs/checks.md) for more info.                                                                      |
| `env`       | `array`         | An array of environment variable names that, if set, should be passed to the build and workflow commands. |
| `paths`     | `object`        | An object containing paths used by `pup`. [See below](#paths).                                                                                                                                |
| `repo`      | `string`/`null` | The git repo used to clone the project in the format of `<org>/<repo>`. If not provided, at github URL is generated based on the `name` property of `composer.json`                           |
| `workflows` | `object`        | An object of workflow configurations. The index is the workflow slug and the values are arrays of strings that hold commands. See the [docs for workflows](/docs/workflows.md) for more info. |
| `zip_use_default_ignore` | `boolean`       | Whether or not additionally ignore files based on the [`.distignore-defaults`](/.distignore-defaults) file. Defaults to `true`.                                                               |
| `zip_name` | `string`        | The name of the zip file to be generated. Defaults to the name of the project as set in `composer.json`.                                                                                      |

## Paths

| Property          | Type     | Description                                                                                                                                                                                                                                                                         |
|-------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `paths.build_dir` | `string` | If git cloning is needed, this is the directory that the project will be cloned to. Defaults to `.pup-build`                                                                                                                                                                        |
| `paths.changelog` | `string` | The relative path to the project's changelog. Defaults to `null`                                                                                                                                                                                                                    |
| `paths.css`       | `array`  | An array of relative paths to the project's CSS files. Defaults to `[]`                                                                                                                                                                                                             |
| `paths.js`        | `array`  | An array of relative paths to the project's JS files. Defaults to `[]`                                                                                                                                                                                                              |
| `paths.versions`  | `array`  | An array of objects whose keys are `file` and `regex`. The `file` should be a relative path to a file that holds a version number for your project. The `regex` should be the regular expression used to locate version numbers. [Check out some examples](#pathsversions-examples) |
| `paths.views`     | `array`  | An array of relative paths to the project's view files. Defaults to `[]`                                                                                                                                                                                                            |
| `paths.zip_dir`   | `string` | The directory that will be created when creating a zip. Defaults to `pup-zip`.                                                                                                                                                                                                      |


### `paths.versions`

The regular expressions used to locate version numbers must have two capture groups. The first capture group is the _thing_
you are looking for that immediately prefixes the version number. The second capture group is the version number itself.

Here are some examples:

* [A file with the version number in a docblock](#example-a-file-with-the-version-number-in-a-docblock)
* [A file with the version number in a PHP define](#example-a-file-with-the-version-number-in-a-php-define)
* [A file with the version number in a constant](#example-a-file-with-the-version-number-in-a-constant)

#### Example: a file with the version number in a docblock

Let's say you have a WordPress `readme.txt` file that looks like this:

```text
=== My Plugin ===

Contributors: abunchofpeople
Tags: example
Requires at least: 5.8.6
Stable tag: 1.0.0
Tested up to: 6.2.2
Requires PHP: 7.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

# etc...
```

This is what you should add as a `paths.versions` entry:

```json
{
    "paths": {
        "versions": [
            {
                "file": "readme.txt",
                "regex": "^(Stable tag: +)(.+)"
            }
        ]
    }
}
```

#### Example: a file with the version number in a PHP define

Let's say you have a bootstrap file called `bootstrap.php` in the root of your project that looks like this:

```php
<?php
// A bunch of stuff

define( 'MY_PLUGIN_VERSION', '1.0.0' );

// A bunch more stuff
```

This is what you should add as a `paths.versions` entry:

```json
{
    "paths": {
        "versions": [
            {
                "file": "bootstrap.php",
                "regex": "(define\\( +['\"]MY_PLUGIN_VERSION['\"], +['\"])([^'\"]+)"
            }
        ]
    }
}
```

#### Example: a file with the version number in a constant

Let's say you have the following class file: `src/MyPlugin/Plugin.php` that looks like this:

```php
<?php
namespace MyPlugin;

class Plugin {
    // A bunch of stuff
    
    /**
     * The version of the plugin.
     * @var string 
     */
    const VERSION = '1.0.0';

    // A bunch of stuff
}
```

This is what you should add as a `paths.versions` entry:

```json
{
    "paths": {
        "versions": [
            {
                "file": "src/MyPlugin/Plugin.php",
                "regex": "(const +VERSION += +['\"])([^'\"]+)"
            }
        ]
    }
}
```
