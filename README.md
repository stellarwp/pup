# pup

StellarWP's **P**roject **U**tilities &amp; **P**ackager (`pup`)

## Installation

### Install in a project as a phar (recommended)

This adds `pup` to your project for use in `composer` without actually setting it as a hard depenency. Edit your `composer.json`
to have the following:

```json

```

### Install as a composer dependency

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

## Configuration

At a bare minimum, add the following to your `.puprc` file:

## Docs

* [Commands](/docs/commands.md)
* [Command flow for `pup zip`](/docs/flow.md)
* [Checks](/docs/checks.md)


```bash
pup zip [branch] [--dev] [--no-clone]
  pup build [--dev]
  pup check [name]
  pup get-version [--dev]
  pup package {version}
  pup clean
``` 