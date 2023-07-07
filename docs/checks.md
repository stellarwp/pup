# Checks

Checks are used to gatekeep your builds and flag issues before release. The `pup` command provides a couple of helpful
checks out of the box, but also provides a simple way to add your own!

* [Default checks](#default-checks)
  * [`tbd`](#tbd)
  * [`version-conflict`](#version-conflict)
* [Running all checks](#running-all-checks)
* [Running specific checks](#running-specific-checks)
* [Creating custom checks](#creating-custom-checks)
  * [Simple checks](#simple-checks)
  * [Class-based checks](#class-based-checks) 

## Default checks

If you do not include the `checks` property within your `.puprc` file, the default checks will be run for your project.

Those defaults can be found in [`.puprc-defaults`](/.puprc-defaults) and here are some docs on them:

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

In addition to the provided checks within `pup`, you can create your own! They can either be simple PHP scripts or classes
that extend `StellarWP\Pup\Commands\Checks\AbstractCheck`.

### Simple checks

Simple checks are simply PHP scripts that get included and executed as a check. There is **one main requirement**, and that
is that the PHP file must return an integer. If the check is considered valid, it should return `0`. If the check fails,
it should return `1` (or any number greater than `0`).

#### Here's an example

Let's say that our project has some JS files that get minified during the build process and we want to check to see if
they were successfully minified.

First, let's create our check file. Let's put it in a `checks` directory within our project:

```bash
mkdir checks
touch checks/has-min-js.php
```

We then edit `checks/has-min-js.php`:

```php
<?php
/**
 * These variables are available to us!
 * 
 * @var Symfony\Component\Console\Input\InputInterface $input
 * @var \StellarWP\Pup\Command\Io $output
 * @var \StellarWP\Pup\Commands\Checks\SimpleCheck $this
 */

// Count the number of minified JS files in a directory.
$num_min_js_files = exec( 'find src/js -type f -name "*.min.js" | wc -l' );

// If there are no minified JS files, consider it a failure.
if ( $num_min_js_files === 0 ) {
    return 1;
}

// Successful!
return 0;
```

Now we have to tell `pup` about our new check. We do that by adding it to our `.puprc` file:

```json
{
  "checks": {
      "has-min-js": {
          "type": "simple",
          "file": "checks/has-min-js.php"
      }
  }
}
```

The `has-min-js` will become the check slug (which we would use in order to run our check). The `type` property tells `pup`
that this is a simple check that gets its check logic from a file. And that file comes from the `file` property - which
is a relative path from the root of the project.

We should now be able to run the check!

```bash
pup check:has-min-js
```

The output isn't very exciting or informative. But! We can change that! Up above, there are 3 variables in the doc block
of the PHP file that we created. One of those, `$output`, is an instance of `StellarWP\Pup\Command\Io` which is a wrapper
for the [`SymfonyStyle`](https://symfony.com/doc/current/console/style.html) class. We can use that to provide some cool
output. Read up on those docs to see everything that can be done.

But here's a quick example. We'll take our `checks/has-min-js.php` file and update it with some output:

```php
<?php
/**
 * These variables are available to us!
 * 
 * @var Symfony\Component\Console\Input\InputInterface $input
 * @var \StellarWP\Pup\Command\Io $output
 * @var \StellarWP\Pup\Commands\Checks\SimpleCheck $this
 */
 
$output->writeln( '<comment>Checking for minified JS files...</comment>' );

// Count the number of minified JS files in a directory.
$num_min_js_files = exec( 'find src/js -type f -name "*.min.js" | wc -l' );

// If there are no minified JS files, consider it a failure.
if ( $num_min_js_files === 0 ) {
  $output->error( 'No minified JS files found!' );
  return 1;
}

$output->writeln( "<fg=green>Success!</> {$num_min_js_files} JS file(s) found." );

// Successful!
return 0;
```

The above example shows a couple of different types of output. Play around with it and make your output look the way
you want!

### Class-based checks

If you have a more complicated check that you want to build and you need all of the power of a class, you can extend
the `StellarWP\Pup\Commands\Checks\AbstractCheck` class. Let's walk through an example:

#### Here's an example

First, let's create our check file. Let's put it in a `checks` directory within our project:

```bash
mkdir checks
touch checks/HasMinJs.php
```

Next, we'll create our class file:

```php
<?php
namespace MyProject\Checks;

use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use StellarWP\Pup\Command\Io;
use StellarWP\Pup\Commands\Checks\AbstractCheck;

class HasMinJS extends AbstractCheck {
  /**
   * @inheritdoc
   */
  protected function checkConfigure(): void {
    // Let's accept in a color argument.
    $this->addOption( 'color', null, InputOption::VALUE_REQUIRED, 'The color to use for output.', 'yellow' );
  }
  
  /**
   * @inheritdoc
   */
  protected function checkExecute( InputInterface $input, Io $output ) {
    $color = $input->getOption( 'color' );
    
    $output->writeln( "<fg={$color}>Checking for minified JS files...</>" );
  
    // Count the number of minified JS files in a directory.
    $num_min_js_files = exec( 'find src/js -type f -name "*.min.js" | wc -l' );
  
    // If there are no minified JS files, consider it a failure.
    if ( $num_min_js_files === 0 ) {
      $output->error( 'No minified JS files found!' );
      return 1;
    }
  
    $output->writeln( "<fg=green>Success!</> <fg={$color}>{$num_min_js_files} JS file(s) found.</>" );
  
    // Successful!
    return 0;
  }
}
```

Now we have to tell `pup` about our new check. We do that by adding it to our `.puprc` file:

```json
{
  "checks": {
      "has-min-js-class": {
          "type": "class",
          "file": "checks/HasMinJs.php"
      }
  }
}
```

If we were to run this with `pup check:has-min-js-class`, we would output that has the default color of `yellow` in the 
places that we put `<fg={$color}>`. If we wanted a specific color, we could do: `pup check:has-min-js-class --color=cyan`.

If we want to pass in a different `color` option when running `pup check`, we can do that by adding it to our `.puprc` file:

```bash
{
    "checks": {
        "has-min-js-class": {
            "type": "class",
            "file": "checks/HasMinJs.php",
            "args": {
                  "--color": "cyan"
            }
        }
    }
}
```