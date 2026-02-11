# Checks

Checks are used to gatekeep your builds and flag issues before release. The `pup` command provides a couple of helpful
checks out of the box, but also provides a simple way to add your own!

* [Default checks](#default-checks)
  * [`tbd`](#tbd)
  * [`version-conflict`](#version-conflict)
* [Running all checks](#running-all-checks)
* [Running specific checks](#running-specific-checks)
* [Creating custom checks](#creating-custom-checks)
  * [Shell command checks](#shell-command-checks)
  * [Module checks](#module-checks)

## Default checks

If you do not include the `checks` property within your `.puprc` file, the default checks will be run for your project.

Those defaults can be found in [`.puprc-defaults`](/defaults/.puprc-defaults) and here are some docs on them:

* [`tbd`](/docs/commands.md#pup-checktbd)
* [`version-conflict`](/docs/commands.md#pup-checkversion-conflict)

## Running all checks

You can run all checks specified by your `.puprc` file (or the `.puprc-defaults` file if your `.puprc` file hasn't
declared any checks) by running the following command:

```bash
pup check
```

## Running specific checks

You can run any of the default checks (regardless of whether they are in your `.puprc` file or not) or any [custom
checks](#creating-custom-checks) you've added by running the following command:

```bash
pup check:<check>
```

For example, to run the `tbd` check:

```bash
pup check:tbd
```

## Creating custom checks

In addition to the provided checks within `pup`, you can create your own! They can either be shell commands or
JavaScript/TypeScript modules.

### Shell command checks

Shell command checks run a shell command and use the exit code to determine success or failure. An exit code of `0`
means the check passed, and any non-zero exit code means it failed.

#### Here's an example

Let's say that our project has some JS files that get minified during the build process and we want to check to see if
they were successfully minified.

We add the check to our `.puprc` file:

```json
{
  "checks": {
    "has-min-js": {
      "type": "command",
      "command": "test $(find src/js -type f -name '*.min.js' | wc -l) -gt 0"
    }
  }
}
```

The `has-min-js` will become the check slug (which we would use in order to run our check individually). The `type`
property tells `pup` that this is a shell command check, and the `command` property is the shell command to execute.

We should now be able to run the check!

```bash
pup check:has-min-js
```

You can also control how failures are handled by setting `fail_method` and `fail_method_dev`:

```json
{
  "checks": {
    "has-min-js": {
      "type": "command",
      "command": "test $(find src/js -type f -name '*.min.js' | wc -l) -gt 0",
      "fail_method": "error",
      "fail_method_dev": "warn"
    }
  }
}
```

### Module checks

Module checks use JavaScript (or compiled TypeScript) modules to run more complex check logic. The module must export
an `execute()` function that returns a `CheckResult` object.

#### The module interface

Your module file must export an `execute` function. It can optionally export a `configure` function:

```typescript
interface CheckResult {
  success: boolean;
  output: string;
}

interface CheckConfig {
  slug: string;
  fail_method: 'error' | 'warn';
  fail_method_dev: 'error' | 'warn';
  type: 'simple' | 'class' | 'pup' | 'command';
  file?: string;
  command?: string;
  args: Record<string, string>;
  dirs?: string[];
  skip_directories?: string;
  skip_files?: string;
}

// Optional - called before execute() to allow setup
export function configure(config: CheckConfig): void;

// Required - runs the check and returns the result
export async function execute(context: {
  config: CheckConfig;
  workingDir: string;
}): Promise<CheckResult>;
```

#### Here's an example

Let's say that our project has some JS files that get minified during the build process and we want to check to see if
they were successfully minified.

First, let's create our check file. Let's put it in a `checks` directory within our project:

```bash
mkdir checks
```

We then create `checks/has-min-js.mjs` (using `.mjs` so it's always treated as an ES module):

```javascript
import { execSync } from 'node:child_process';
import path from 'node:path';

export async function execute({ config, workingDir }) {
  const jsDir = path.join(workingDir, 'src/js');

  try {
    const result = execSync(`find ${jsDir} -type f -name "*.min.js" | wc -l`, {
      encoding: 'utf-8',
    }).trim();

    const count = parseInt(result, 10);

    if (count === 0) {
      return {
        success: false,
        output: 'No minified JS files found!',
      };
    }

    return {
      success: true,
      output: `${count} minified JS file(s) found.`,
    };
  } catch (err) {
    return {
      success: false,
      output: `Error checking for minified JS files: ${err}`,
    };
  }
}
```

Now we have to tell `pup` about our new check. We do that by adding it to our `.puprc` file:

```json
{
  "checks": {
    "has-min-js": {
      "type": "simple",
      "file": "checks/has-min-js.mjs"
    }
  }
}
```

The `has-min-js` will become the check slug (which we would use in order to run our check). The `type` property tells
`pup` that this check gets its logic from a module file. And that file comes from the `file` property - which is a
relative path from the root of the project.

We should now be able to run the check!

```bash
pup check:has-min-js
```

#### Using `configure()`

If you need to set up your check based on the config provided in `.puprc`, you can export a `configure` function.
This is called before `execute()` and receives the full check config object, including any custom `args`:

```json
{
  "checks": {
    "has-min-js": {
      "type": "simple",
      "file": "checks/has-min-js.mjs",
      "args": {
        "directory": "dist/js"
      }
    }
  }
}
```

```javascript
let searchDir = 'src/js';

export function configure(config) {
  if (config.args.directory) {
    searchDir = config.args.directory;
  }
}

export async function execute({ config, workingDir }) {
  // searchDir is now 'dist/js' based on the .puprc config
  // ... check logic here
}
```
