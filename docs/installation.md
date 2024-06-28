# Installation

* [Install in a project as a phar](#install-in-a-project-as-a-phar) - recommended for most projects.
* [Other installation methods](#other-installation-methods)
  * [Install as a composer dependency](#install-as-a-composer-dependency) - super easy, but might be annoying to use when building a dist version of your project.
  * [Install globally as a phar](#install-globally-as-a-phar) - Puts the benefits of pup on your system (this is handy!).
  * [Install globally as a git clone](#install-globally-as-a-git-clone) - Same as the global phar approach, but you get the benefit of switching versions with git.


## Install in a project as a phar

This adds `pup` to your project for use in `composer` in such a way that it can be run regardless of whether you have
run `composer install` or `composer install --no-dev`. There are a couple of steps:

1. Create a `bin/` directory in your project
2. Add `pup.phar` to your `.gitignore`
3. Add `pup.phar` to your `composer.json` scripts

### 1. Create a `bin/` directory

You will need a place for `composer` to place the `phar` file. Create a `bin/` directory in your project root and commit a `.gitkeep` file into it:

```bash
mkdir bin
touch bin/.gitkeep
git commit bin/.gitkeep -m "Adding bin directory"
```

### 2. Add `pup.phar` to your `.gitignore`

Edit your `.gitignore` file (create that file if you don't have one) and add the following line:

```bash
pup.phar
```

### 3. Edit your `composer.json`

Now we tell `composer` to download the `pup.phar` file into the `bin/` directory if it is missing when we run `composer pup`.

```json
"scripts": {
      "pup": [
              "sh -c 'test -f ./bin/pup.phar || curl -o bin/pup.phar -L -C - https://github.com/stellarwp/pup/releases/download/VERSION/pup.phar'",
              "@php ./bin/pup.phar"
      ]
}
```

## Other installation methods

### Install as a composer dependency

If you want to install `pup` as a composer dependency, simply:

```bash
composer require stellarwp/pup
```

When packaging zips, `pup` will exclude `vendor/stellarwp/pup` by default. It does this by using its
`.distignore-defaults` file, which has `vendor/stellarwp/pup` in it. It is likely that there are other packages that
come with `pup` via `Symfony` that you may want to exclude as well. You can add a `.distignore` file to your project to
do so.

If you don't want the hassle of managing a `.distignore` for the `pup` dependencies, we suggest installing into your
project as a `phar` instead.

### Install globally as a phar

Head to [releases](https://github.com/stellarwp/pup/releases) and download the `pup.phar` and place it in a directory that is in your `$PATH` (e.g. `/usr/local/bin`).

```bash
cd /usr/local/bin
# Replace VERSION with the version you want to download
wget https://github.com/stellarwp/pup/releases/download/VERSION/pup.phar
mv pup.phar pup
chmod +x pup
```

### Install globally as a git clone

This is easy peasy! Just clone the repo and run `composer install`:

```bash
git clone git@github.com:stellarwp/pup.git
cd pup
composer install
```

Optionally, you can add the `pup` directory to your `$PATH`.
