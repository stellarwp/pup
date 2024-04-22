# Commands

* [`pup build`](/docs/commands.md#pup-build)
* [`pup check`](/docs/commands.md#pup-check)
  * [`pup check:tbd`](/docs/commands.md#pup-checktbd)
  * [`pup check:version-conflict`](/docs/commands.md#pup-checkversion-conflict)
* [`pup clean`](/docs/commands.md#pup-clean)
* [`pup do`](/docs/commands.md#pup-do)
* [`pup get-version`](/docs/commands.md#pup-get-version)
* [`pup help`](/docs/commands.md#pup-help)
* [`pup i18n`](/docs/commands.md#pup-i18n)
* [`pup info`](/docs/commands.md#pup-info)
* [`pup package`](/docs/commands.md#pup-package)
* [`pup workflow`](/docs/commands.md#pup-workflow)
* [`pup zip`](/docs/commands.md#pup-zip)
* [`pup zip-name`](/docs/commands.md#pup-zip-name)

## `pup build`
Runs the `build` commands from the `.puprc` file.

If you want your dev builds to build differently, you can add a `build_dev` property to your `.puprc` file.

### Usage
```bash
pup build [--dev]
# or
composer -- pup build [--dev]
```

### Arguments
| Argument | Description                                                                                                                                                                          |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--dev`  | **Optional.** Whether or not this is a dev build. Using this option will run the `build_dev` commands from your `.puprc` file if they exist, otherwise it will run `build` commands. |
| `--root` | **Optional.** Run the command from a different directory from the current. |

### Specifying build commands
You can specify build commands within your `.puprc` file by adding to either the `build` or `build_dev` properties. These
commands will be run in the order they are specified. By default, if any command fails, the build will fail. You can,
however, prepend your commands with `@` and that will tell `pup` to ignore failures for that step. Here's an example:

```json
{
    "build": [
        "npm ci",
        "npm run build",
        "@composer run some-script"
    ]
}
```

In the above example, `npm ci` and `npm run build` will need to complete successfully for the build to succeed, but the
`composer run some-script` is prepended by `@` so if it fails, the build will continue forward.

## `pup check`
Runs all registered check commands.

You can run all checks specified by your `.puprc` file (or the `.puprc-defaults` file if your `.puprc` file hasn't
declared any checks) by running the following command:

### Usage
```bash
pup check
# or
composer -- pup check
```

### Arguments
| Argument | Description                                                                                                                                        |
|----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `--root` | **Optional.** Run the command from a different directory from the current.                                                                         |
| `--dev`  | **Optional.** Run the command with with an alternate faliure method. This alternate method is set as `fail_method_dev` for each Check in `.puprc`. |

### `pup check:tbd`
Scans your files for `tbd` (case-insensitive) and tells you where to find them.

The `tbd` check will scan your files in relevant locations (`@since`, `@todo`, `@version`, etc) and display the files
and line numbers where they appear.

#### Usage
```bash
pup check:tbd
# or
composer -- pup check:tbd
```

#### `.puprc` options
| Option                | Description                                                                                                                |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------|
| `fail_method`     | **Optional.** How the check should fail. Defaults to `error`.                                |
| `fail_method_dev` | **Optional.** How the check should fail when running with `--dev`. Defaults to `warn`. |
| `dirs`                | **Optional.** An array of directories to scan. Defaults to `['src']`.                                                      |
| `skip_directories`    | **Optional.** A pipe delimited list of directories to skip. Defaults can be seen in [`.puprc-defaults`](https://github.com/stellarwp/pup/blob/main/.puprc-defaults). |
| `skip_files`          | **Optional.** A pipe delimited list of files to skip. Defaults can be seen in [`.puprc-defaults`](https://github.com/stellarwp/pup/blob/main/.puprc-defaults).       |


### `pup check:version-conflict`
Verifies that all of your version numbers match.

The `version-conflict` check looks at all of the version files you've declared in your `.puprc` file and ensures that
they all match. If they do not, it will display the version numbers, file, and associated regex.

_Note:_ If you track your version numbers within `package.json`, that file only allows versions with two dots (`.`). For
the purposes of validation, `pup` will consider `major.minor.patch` versions within `package.json` to match with
`major.minor.patch.whatever` versions in other files.

### Usage
```bash
pup check:version-conflict
# or
composer -- pup check:version-conflict
```

#### `.puprc` options
| Option            | Description                                                                                  |
|-------------------|----------------------------------------------------------------------------------------------|
| `fail_method`     | **Optional.** How the check should fail. Defaults to `error`.                                |
| `fail_method_dev` | **Optional.** How the check should fail when running with `--dev`. Defaults to `warn`. |

## `pup clean`
This command cleans up any directories that `pup` creates.

### Usage
```bash
pup clean
# or
composer -- pup clean
```

### Arguments
| Argument | Description                                                                  |
|----------|------------------------------------------------------------------------------|
| `--root` | **Optional.** Run the command from a different directory from the current.   |


## `pup do`
Alias for `pup workflow`. See `pup help workflow` for more information.

### Usage
```bash
pup do <workflow>
# or
composer -- pup do <workflow>
```

### Arguments
| Argument | Description                                                                                                                                        |
|----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `workflow` | **Required.** The workflow you would like to run.                                                                                                 |
| `--root` | **Optional.** Run the command from a different directory from the current.                                                                         |


## `pup get-version`
Gets your project's version number.

This command will use the first [version file](https://github.com/stellarwp/pup/blob/main/docs/configuration.md#paths-versions) declared in your `.puprc` file to get the version number.
If you haven't provided a version file, the version will be `unknown`.

### Usage
```bash
pup get-version [--dev]
# or
composer -- pup get-version [--dev]
```

### Arguments
| Argument | Description                                                                                              |
|----------|----------------------------------------------------------------------------------------------------------|
| `--dev`  | **Optional.** Whether or not this is a dev build. Using this option will result in a dev version number. |
| `--root` | **Optional.** Run the command from a different directory from the current.   |

## `pup help`
Shows the help menu.

### Usage
```bash
pup help [command]
# or
composer -- pup help [command]
```

### Arguments
| Argument | Description                                                                                              |
|--- |----------------------------------------------------------------------------------------------------------|
| `command` | **Optional.** The command to get help for. If omitted, the general help menu will be displayed.          |

## `pup i18n`
Pulls in translations from a GlotPress instance.

### Usage
```bash
pup i18n
# or
composer -- pup i18n
```

### Arguments
| Argument | Description                                                                |
|----------|----------------------------------------------------------------------------|
| `--root` | **Optional.** Run the command from a different directory from the current. |

### Specifying i18n options

To enable fetching language files from a GlotPress instance, you must specify `i18n` options in your `.puprc` file. At
a bare minimum, you must specify the following:

```json
"i18n": {
    "slug": "the-slug-used-in-glotpress",
    "textdomain": "my-textdomain",
    "url": "https://translate.wordpress.org/api/projects/wp-plugins/{slug}/stable"
}
```

By default, the config settings for `i18n` inherit defaults from the `i18n_defaults` values in the
[`.puprc-defaults`](https://github.com/stellarwp/pup/blob/main/.puprc-defaults) found within `pup`.

For more information on the available options, see the [i18n documentation](https://github.com/stellarwp/pup/blob/main/docs/i18n.md).

## `pup info`
Gets `pup` details for the current project.

### Usage
```bash
pup info
# or
composer -- pup info
```

## `pup package`
Packages your project into a zip file with the passed in version number.

This command uses the provided version number and builds a zip file with the appropriate name. You can adjust what files
get included and excluded from zipping in a couple of ways by adding files to your project:

* `.distfiles` - If present, the file patterns included here dictate which files/directories matching that pattern to be included. **Note:** Exclusions in `.distignore` and `.gitattributes` supercede these patterns.
* `.distignore` - Any file pattern included here will cause files/directories matching that pattern to be excluded.
* `.gitattributes` - Any file pattern with `export-ignore` after it will be treated similar to files within `.distignore`.

Patterns in these files support wildcard matching. Use `*` to match any number of characters and use `/**/` to match any number of directories. Examples:

```bash
# Match any file ending in .md
*.md

# Match an explicit file in the root of the project
/license.txt

# Match any .min.js file in any directory.
/**/*.min.js

# Match an CSS file in the styles directory.
src/styles/*.css
```

By default, `pup` will use its own `.distignore-defaults` file to exclude a number of common patterns. You can turn the
default exclusion rules off by adding `"zip_use_default_ignore": false` to your `.puprc` file.

The zip that is generated will be placed in your project's root directory.

### Usage
```bash
pup package <version>
# or
composer -- pup package <version>
```

### Arguments
| Argument  | Description                                                                                                                                            |
|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `version` | **Required.** The version number to use when packaging. You can generate this using [`pup get-version`](/docs/commands.md#pup-get-version) if desired. |                                                |
| `--root`  | **Optional.** Run the command from a different directory from the current.                                                                             |


## `pup workflow`
Run a command workflow.

### Usage
```bash
pup workflow <workflow>
# or
pup do <workflow>
# or
composer -- pup workflow <workflow>
# or
composer -- pup do <workflow>
```

### Arguments
| Argument | Description                                                                                                                                        |
|----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `workflow` | **Required.** The workflow you would like to run.                                                                                                 |
| `--root` | **Optional.** Run the command from a different directory from the current.                                                                         |


## `pup zip`
Runs the full `pup` set of commands to create a zip file.

This command is a wrapper command for the whole zipping process. You can see its [flow of commands](https://github.com/stellarwp/pup/blob/main/docs/flow.md) for 
more information on which commands it runs and when.

### Usage
```bash
pup zip <branch> [--dev] [--no-clone]
# or
composer -- pup zip <branch> [--dev] [--no-clone]
```

### Arguments
| Argument       | Description                                                                                                                               |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `branch`       | **Optional.** The branch to package.                                                                                                      |
| `--dev`        | **Optional.** Whether or not this is a dev build. If passed, it will be added to all sub commands that `pup zip` executes                 |
| `--no-build`   | **Optional.** Don't run the `pup build` command for packaging.                                                                            |
| `--no-check`   | **Optional.** Don't run the `pup check` command that runs all of the checks.                                                              |
| `--no-clean`   | **Optional.** Don't run the `pup clean` command after packaging.                                                                          |
| `--no-clone`   | **Optional.** Don't clone the repo. By default, the `pup zip` clones the repo into a directory where it will perform all of its commands. |
| `--no-i18n`    | **Optional.** Don't run the `pup i18n` command.                                                                                           |
| `--no-package` | **Optional.** Don't run the `pup package` command that actually packages things up.                                                       |

## `pup zip-name`
Gets your project's zip name (sans the `.zip` extension).

This command will build a zip name based on data provided by `.puprc` and optionally from arguments passed to the command.

### Usage
```bash
pup zip-name <version> [--dev]
# or
composer -- pup zip-name <version> [--dev]
```

### Arguments
| Argument | Description                                                                                                                 |
|--- |-----------------------------------------------------------------------------------------------------------------------------|
| `version` | **Optional.** The version number to use for naming the zip. If not provided, it will use the output from `pup get-version`. |
| `--dev` | **Optional.** Whether or not this is a dev build. Using this option will result in a dev version number.                    |
