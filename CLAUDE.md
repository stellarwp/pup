# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PUP (Project Utilities & Packager) is a PHP CLI utility built by StellarWP for automating WordPress plugin/theme builds, packaging, and deployment processes. It's distributed as a PHP archive (phar) and uses Symfony Console components.

## Key Technologies

- **PHP 7.2+ / 8.0+**: Primary language
- **Symfony Components**: Console, Process, Filesystem (v5.4)
- **Testing**: Codeception 4.2 with CLI module
- **Static Analysis**: PHPStan level 8 (highest strictness)
- **Build Tool**: Box for creating phar archives

## Essential Commands

### Development Commands
```bash
# Run all tests
composer run cr

# Run static analysis
composer run test:analysis

# Build the phar file
composer run build-phar

# Run a specific test
vendor/bin/codecept run cli <TestName>
```

### PUP Commands (when testing locally)
```bash
# Build the project
./pup build [--dev]

# Run all checks
./pup check

# Create a zip package
./pup zip

# Run a workflow
./pup workflow <workflow-name>
# or
./pup do <workflow-name>
```

## Architecture & Structure

### Core Application Flow
1. **Entry Point**: `pup` script instantiates `App` (extends Symfony Application)
2. **Configuration**: Loaded from `.puprc` file via `Config` class
3. **Commands**: Located in `src/Commands/`, each extending `Command` base class
4. **Workflows**: Custom command sequences defined in `.puprc` under `workflows` key
5. **Checks**: Validation system in `src/Check/` with built-in and custom checks

### Key Directories
- `src/Commands/`: All CLI commands (Build, Check, Clean, Package, Zip, etc.)
- `src/Check/`: Check system for validation (TBD finder, version conflicts)
- `src/Filesystem/`: File sync operations and utilities
- `src/Workflow/`: Workflow management system
- `tests/cli/`: Codeception CLI tests
- `tests/_data/`: Test fixtures and fake projects for testing

### Important Design Patterns
1. **Command Pattern**: Each command is a separate class implementing execute()
2. **Collection Pattern**: Used for managing checks (`Check\Collection`)
3. **Process Execution**: Uses Symfony Process for running external commands
4. **Configuration Merging**: `.puprc` files merge with defaults from `.puprc-defaults`

### Testing Approach
- **CLI Tests**: Test commands against fake projects in `tests/_data/`
- **Snapshot Testing**: Uses codeception-snapshot-assertions for output validation
- **Test Isolation**: Each test uses temporary directories to avoid conflicts

### Build and Packaging Flow
1. **Build Phase**: Runs commands from `.puprc` `build` array
2. **Check Phase**: Validates code (TBD comments, version conflicts)
3. **Package Phase**: Copies files based on `.distfiles` patterns
4. **Zip Phase**: Creates final archive excluding `.distignore` patterns

## Critical Implementation Notes

1. **Phar Context**: Code must work both as phar and regular files. Check `App::$is_phar` when needed.

2. **Process Execution**: Always use Symfony Process component for external commands, never shell_exec().

3. **Configuration Priority**: CLI arguments > `.puprc` > `.puprc-defaults`

4. **Error Handling**: Commands should throw exceptions for errors, not exit directly.

5. **Output Formatting**: Use Symfony Console helpers (Table, ProgressBar) for consistent UI.

6. **Path Resolution**: Always resolve paths relative to the project root, not the phar location.

7. **Check System**: Checks can be simple (command-based) or complex (PHP classes implementing CheckInterface).

8. **Workflow System**: Workflows support argument passthrough using `--` separator.