# Commands

* [`pup build`](/docs/commands.md#pup-build)
* [`pup check`](/docs/commands.md#pup-check)
  * [`pup check:tbd`](/docs/commands.md#pup-checktbd)
  * [`pup check:version-conflict`](/docs/commands.md#pup-checkversion-conflict)
* [`pup clean`](/docs/commands.md#pup-clean)
* [`pup get-version`](/docs/commands.md#pup-get-version)
* [`pup help`](/docs/commands.md#pup-help)
* [`pup package`](/docs/commands.md#pup-package)
* [`pup zip`](/docs/commands.md#pup-zip)

## `pup build`

Runs the `build` commands from the `puprc` file.

If you want your dev builds to build differently, you can add a `build_dev` property to your `.puprc` file.

```bash
pup build [--dev]
# or
composer pup build [--dev]
```

### Arguments
| Argument | Description                                                                                                                                                                          |
|--- |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--dev` | **Optional.** Whether or not this is a dev build. Using this option will run the `build_dev` commands from your `.puprc` file if they exist, otherwise it will run `build` commands. |

## `pup check`

Runs all registered check commands.

You can run all checks specified by your `.puprc` file (or the `.puprc-defaults` file if your `.puprc` file hasn't
declared any checks) by running the following command:

```bash
pup check
# or
composer pup check
```

### `pup check:tbd`

Scans your files for `tbd` (case-insensitive) and tells you where to find them.

The `tbd` check will scan your files in relevant locations (`@since`, `@todo`, `@version`, etc) and display the files
and line numbers where they appear.

```bash
pup check:tbd
# or
composer pup check:tbd
```

#### `.puprc` options

| Option                | Description                                                                                                                |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------|
| `bail_on_failure`     | **Optional.** Whether or not to bail on failure. Defaults to `true`.                                                       |
| `bail_on_failure_dev` | **Optional.** Whether or not to bail on failure when running with `--dev`. Defaults to `false`.                            |
| `dirs`                | **Optional.** An array of directories to scan. Defaults to `['src']`.                                                      |
| `skip_directories`    | **Optional.** A pipe delimited list of directories to skip. Defaults can be seen in [`.puprc-defaults`](/.puprc-defaults). |
| `skip_files`          | **Optional.** A pipe delimited list of files to skip. Defaults can be seen in [`.puprc-defaults`](/.puprc-defaults).       |


### `pup check:version-conflict`

Verifies that all of your version numbers match.

The `version-conflict` check looks at all of the version files you've declared in your `.puprc` file and ensures that
they all match. If they do not, it will display the version numbers, file, and associated regex.

_Note:_ If you track your version numbers within `package.json`, that file only allows versions with two dots (`.`). For
the purposes of validation, `pup` will consider `major.minor.patch` versions within `package.json` to match with
`major.minor.patch.whatever` versions in other files.


```bash
pup check:version-conflict
# or
composer pup check:version-conflict
```

#### `.puprc` options

| Option                | Description                                                                                                                |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------|
| `bail_on_failure`     | **Optional.** Whether or not to bail on failure. Defaults to `true`.                                                       |
| `bail_on_failure_dev` | **Optional.** Whether or not to bail on failure when running with `--dev`. Defaults to `false`.                            |

## `pup clean`

This command cleans up any directories that `pup` creates.

```bash
pup clean
# or
composer pup clean
```

## `pup get-version`

Gets your project's version number.

This command will use the first [version file](/docs/configuration.md#paths-versions) declared in your `.puprc` file to get the version number.
If you haven't provided a version file, the version will be `unknown`.

```bash
pup get-version [--dev]
# or
composer pup get-version [--dev]
```

### Arguments
| Argument | Description                                                                                              |
|--- |----------------------------------------------------------------------------------------------------------|
| `--dev` | **Optional.** Whether or not this is a dev build. Using this option will result in a dev version number. |

## `pup help`

Shows the help menu.

```bash
pup help [command]
# or
composer pup help [command]
```

### Arguments
| Argument | Description                                                                                              |
|--- |----------------------------------------------------------------------------------------------------------|
| `command` | **Optional.** The command to get help for. If omitted, the general help menu will be displayed.          |

## `pup package`

Packages your project into a zip file with the passed in version number.

This command uses the provided version number and builds a zip file with the appropriate name. While packaging, this
command will exclude any file or directory declared in `.distignore`, in `pup`'s own `.distignore-defaults` file, or as
`export-ignore` within `.gitattributes`.

The zip that is generated will be placed in your project's root directory.

```bash
pup package <version> [--dev]
# or
composer pup package <version> [--dev]
```

### Arguments

| Argument | Description                                                                                              |
|--- |----------------------------------------------------------------------------------------------------------|
| `version` | **Required.** The version number to use when packaging.                                                  |
| `--dev` | **Optional.** Whether or not this is a dev build. Using this option will result in a dev version number. |

## `pup zip`

Runs the full `pup` set of commands to create a zip file.

This command is a wrapper command for the whole zipping process. You can see its [flow of commands](/docs/flow.md) for 
more information on which commands it runs and when.

```bash
pup zip <branch> [--dev] [--no-clone]
# or
composer pup zip <branch> [--dev] [--no-clone]
```

### Arguments
| Argument | Description                                                                                                                               |
|----------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `branch` | **Optional.** The branch to package.                                                                                                      |
| `--dev`  | **Optional.** Whether or not this is a dev build. If passed, it will be added to all sub commands that `pup zip` executes                 |
| `--no-clone` | **Optional.** Don't clone the repo. By default, the `pup zip` clones the repo into a directory where it will perform all of its commands. |