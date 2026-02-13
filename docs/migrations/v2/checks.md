# Migrating Custom Checks from PHP to JavaScript

PUP v2 replaces PHP with Node.js. Custom checks that were previously written as PHP scripts or classes must be
converted to JavaScript modules (`.mjs`) or shell commands.

This guide walks through converting each type of PHP check.

## Quick reference

| PHP (v1) | JavaScript (v2) |
|---|---|
| `return 0;` (success) | `return { success: true, output: 'message' };` |
| `return 1;` (failure) | `return { success: false, output: 'message' };` |
| `$output->success('...')` | Include the message in the `output` field |
| `$output->error('...')` | Include the message in the `output` field |
| `$output->warning('...')` | Include the message in the `output` field |
| `$output->writeln('...')` | Include the message in the `output` field |
| `exec('command')` | `execSync('command', { encoding: 'utf-8' })` |
| `file_get_contents($path)` | `fs.readFileSync(path, 'utf-8')` |
| `file_get_contents($url)` | `await fetch(url)` |
| `preg_match($regex, $str, $m)` | `str.match(regex)` |
| `$input->getOption('name')` | `config.args['name']` |
| `getenv('VAR')` | `process.env.VAR` |

## `.puprc` changes

For **simple** checks, only the `file` path changes:

```diff
 "my-check": {
     "type": "simple",
-    "file": "checks/my-check.php"
+    "file": "checks/my-check.mjs"
 }
```

For **class-based** checks, change `type` to `"simple"` and update the file path:

```diff
 "my-check": {
-    "type": "class",
-    "file": "checks/MyCheck.php"
+    "type": "simple",
+    "file": "checks/my-check.mjs"
 }
```

Class-based checks that used `--option` style args should move them to the `args` object:

```diff
 "my-check": {
-    "type": "class",
-    "file": "checks/MyCheck.php",
-    "args": {
-        "--color": "cyan"
-    }
+    "type": "simple",
+    "file": "checks/my-check.mjs",
+    "args": {
+        "color": "cyan"
+    }
 }
```

## Converting simple checks

Simple checks were PHP scripts that returned `0` for success or `1` for failure, with `$output` available for
console output.

### Before (PHP)

```php
<?php
// checks/is-synced.php

$main_branch = 'origin/main';

if ( ! exec( "git rev-parse --verify $main_branch" ) ) {
    $output->warning( "Skipping: $main_branch not available." );
    return 0;
}

$diff_count = exec( "git rev-list --right-only --count @..$main_branch" );

if ( $diff_count > 0 ) {
    $output->error( "Not in sync with $main_branch. Behind: $diff_count" );
    return 1;
}

$output->success( "In sync with $main_branch." );
return 0;
```

### After (JavaScript)

```javascript
// checks/is-synced.mjs
import { execSync } from 'node:child_process';

export async function execute({ workingDir }) {
  const mainBranch = 'origin/main';

  try {
    execSync(`git rev-parse --verify ${mainBranch}`, {
      cwd: workingDir,
      stdio: 'pipe',
    });
  } catch {
    return { success: true, output: `Skipping: ${mainBranch} not available.` };
  }

  const diffCount = execSync(
    `git rev-list --right-only --count @..${mainBranch}`,
    { cwd: workingDir, encoding: 'utf-8', stdio: 'pipe' }
  ).trim();

  if (parseInt(diffCount, 10) > 0) {
    return {
      success: false,
      output: `Not in sync with ${mainBranch}. Behind: ${diffCount}`,
    };
  }

  return { success: true, output: `In sync with ${mainBranch}.` };
}
```

### Key differences

1. **Return value**: Instead of `return 0` / `return 1`, return an object with `success` (boolean) and `output`
   (string). The `output` string is what gets displayed to the user.

2. **Output**: There is no `$output` object. All user-facing output goes into the `output` field of the return value.
   PUP handles the formatting (success messages are shown normally, failure messages are shown as errors).

3. **Shell commands**: Replace `exec()` with `execSync()` from `node:child_process`. Always pass
   `{ encoding: 'utf-8' }` to get string output instead of a Buffer.

4. **Working directory**: Use `workingDir` from the context parameter instead of assuming the current directory.

5. **File extension**: Use `.mjs` so the file is always treated as an ES module, regardless of the consuming
   project's `package.json` settings.

## Converting class-based checks

Class-based checks extended `AbstractCheck` and had `checkConfigure()` / `checkExecute()` methods. In v2, these
become module exports.

### Before (PHP)

```php
<?php
// checks/ExpectedVersion.php
namespace MyProject\Checks;

use StellarWP\Pup\App;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use StellarWP\Pup\Command\Io;
use StellarWP\Pup\Commands\Checks\AbstractCheck;

class ExpectedVersion extends AbstractCheck {
    protected function checkConfigure(): void {
        $this->addOption( 'expected-version', null, InputOption::VALUE_REQUIRED, 'The version to check for.' );
    }

    protected function checkExecute( InputInterface $input, Io $output ) {
        $expected_version = $input->getOption( 'expected-version' );

        if ( ! $expected_version ) {
            $output->writeln( 'Expected version not set. Skipping.' );
            return 0;
        }

        $config        = App::getConfig();
        $version_files = $config->getVersionFiles();

        foreach ( $version_files as $version_file ) {
            $contents = file_get_contents( $version_file->getPath() );
            preg_match( '/' . $version_file->getRegex() . '/', $contents, $matches );
            $version = $matches[2] ?? 'unknown';

            if ( $version !== $expected_version ) {
                $output->writeln( "Mismatch in {$version_file->getPath()}: expected $expected_version, found $version" );
                return 1;
            }
        }

        $output->writeln( 'Version check passed: ' . $expected_version );
        return 0;
    }
}
```

### After (JavaScript)

```javascript
// checks/expected-version.mjs
import fs from 'node:fs';
import path from 'node:path';

export async function execute({ config, workingDir }) {
  let expectedVersion = config.args?.['expected-version'] ?? null;

  if (expectedVersion?.startsWith('v')) {
    expectedVersion = expectedVersion.slice(1);
  }

  if (!expectedVersion) {
    return { success: true, output: 'Expected version not set. Skipping.' };
  }

  // Read version files from .puprc.
  const puprc = JSON.parse(fs.readFileSync(path.join(workingDir, '.puprc'), 'utf-8'));
  const versionFiles = puprc?.paths?.versions ?? [];

  if (versionFiles.length === 0) {
    return { success: false, output: 'No version files found.' };
  }

  for (const vf of versionFiles) {
    const contents = fs.readFileSync(path.join(workingDir, vf.file), 'utf-8');
    const match = contents.match(new RegExp(vf.regex));
    const version = match?.[2] ?? 'unknown';

    if (version !== expectedVersion) {
      return {
        success: false,
        output: `Mismatch in ${vf.file}: expected ${expectedVersion}, found ${version}`,
      };
    }
  }

  return { success: true, output: `Version check passed: ${expectedVersion}` };
}
```

### Key differences

1. **No class**: Export functions directly instead of extending `AbstractCheck`.

2. **`checkConfigure()` → `configure()` (optional)**: If you used `checkConfigure()` to define options, you can
   export a `configure(config)` function. But in most cases you can just read from `config.args` directly in
   `execute()`.

3. **`checkExecute()` → `execute()`**: The execute function receives `{ config, workingDir }` instead of Symfony's
   `InputInterface` and `Io`.

4. **Options/arguments**: Instead of `$input->getOption('name')`, read from `config.args['name']`. In `.puprc`,
   drop the `--` prefix from arg keys:
   ```diff
   - "--expected-version": "1.0.0"
   + "expected-version": "1.0.0"
   ```
   Args defined in `.puprc` are static values passed through as-is on every run. To pass dynamic values, use
   CLI arguments when running the check subcommand — these are merged into `config.args` and override `.puprc`
   values with the same key:
   ```bash
   pup check:expected-version --expected-version 5.0.1
   ```

5. **Config access**: Instead of `App::getConfig()`, read `.puprc` directly with `fs.readFileSync` or use the
   `config` parameter passed to your function.

## Converting simple checks to shell commands

Some simple PHP checks are thin wrappers around shell commands. These can be converted to `type: "command"` checks
instead of module files, eliminating the need for a separate file entirely.

### Before (PHP)

```php
<?php
// checks/tbd-extended.php
exec( 'bash ./dev_scripts/set-numeric-version.sh dry-run true', $output_lines, $result_code );

if ( $result_code ) {
    $output->error( "TBDs found" );
    return 1;
}

$output->success( 'No TBDs found' );
return 0;
```

### After (shell command in `.puprc`)

```json
{
  "checks": {
    "tbd-extended": {
      "type": "command",
      "command": "bash ./dev_scripts/set-numeric-version.sh dry-run true"
    }
  }
}
```

No file needed at all. If the command exits `0`, the check passes. If it exits non-zero, it fails.

Use this approach when your PHP check was essentially just running a shell command and checking the exit code.

## Common patterns

### Reading files

```diff
- $contents = file_get_contents( 'path/to/file.txt' );
+ import fs from 'node:fs';
+ const contents = fs.readFileSync('path/to/file.txt', 'utf-8');
```

### HTTP requests

```diff
- $response = file_get_contents( 'https://api.example.com/data' );
- $data = json_decode( $response );
+ const response = await fetch('https://api.example.com/data');
+ const data = await response.json();
```

### Environment variables

```diff
- $value = getenv( 'GITHUB_BASE_REF' );
+ const value = process.env.GITHUB_BASE_REF;
```

### Regex matching

```diff
- preg_match( '/Version: ([0-9.]+)/', $contents, $matches );
- $version = $matches[1];
+ const match = contents.match(/Version: ([0-9.]+)/);
+ const version = match?.[1];
```

### Running shell commands

```diff
- $result = exec( 'git status --porcelain', $output_lines, $return_var );
- if ( $return_var !== 0 ) { ... }
+ import { execSync } from 'node:child_process';
+ try {
+   const result = execSync('git status --porcelain', {
+     cwd: workingDir,
+     encoding: 'utf-8',
+     stdio: 'pipe',
+   });
+ } catch (err) {
+   // command failed
+ }
```
