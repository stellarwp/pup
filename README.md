# **P**roject **U**tilities &amp; **P**ackager (`pup`)

This is a CLI utility built by [StellarWP](https://stellarwp.com) for running project build processes, sanity checks, and packaging into zips.

[![Static Analysis](https://github.com/stellarwp/pup/actions/workflows/static-analysis.yml/badge.svg)](https://github.com/stellarwp/pup/actions/workflows/static-analysis.yml) [![Tests](https://github.com/stellarwp/pup/workflows/Tests/badge.svg)](https://github.com/stellarwp/pup/actions?query=branch%3Amain)

## Docs

* [Installation](/docs/installation.md)
  * [Install as a composer dependency](#install-as-a-composer-dependency)
  * [Install in a project as a phar](#install-in-a-project-as-a-phar)
  * [Install globally as a phar](#install-globally-as-a-phar)
  * [Install globally as a git clone](#install-globally-as-a-git-clone)
* [Configuration](/docs/configuration.md)
* [Commands](/docs/commands.md)
  * [`pup build`](/docs/commands.md#pup-build)
  * [`pup check`](/docs/commands.md#pup-check)
    * [`pup check:tbd`](/docs/commands.md#pup-checktbd)
    * [`pup check:version-conflict`](/docs/commands.md#pup-checkversion-conflict)
  * [`pup clean`](/docs/commands.md#pup-clean)
  * [`pup get-version`](/docs/commands.md#pup-get-version)
  * [`pup help`](/docs/commands.md#pup-help)
  * [`pup package`](/docs/commands.md#pup-package)
  * [`pup zip`](/docs/commands.md#pup-zip)
* [Command flow for `pup zip`](/docs/flow.md)
* [Checks](/docs/checks.md)
  * [Default checks](#default-checks)
  * [Running all checks](#running-all-checks)
  * [Running specific checks](#running-specific-checks)
  * [Creating custom checks](#creating-custom-checks)
    * [Simple checks](#simple-checks)
    * [Class-based checks](#class-based-checks)
