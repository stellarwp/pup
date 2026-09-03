# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PUP (Project Utilities & Packager) is a TypeScript CLI tool built by StellarWP for automating WordPress plugin/theme builds, packaging, and deployment processes. It is distributed via npm (`@stellarwp/pup`) and can also be used as a reusable GitHub Action.

## Key Technologies

- **TypeScript** (ES2022, NodeNext modules): Primary language
- **Node.js 18+**: Runtime
- **Commander**: CLI framework
- **execa**: Process execution
- **archiver**: Zip creation
- **simple-git**: Git operations
- **picomatch**: Glob matching
- **chalk**: Styled console output
- **Testing**: Jest with ts-jest
- **Build**: tsup (bundler)

## Essential Commands

### Development Commands
```bash
# Build the project
npm run build

# Watch mode
npm run dev

# Run all tests
npm test

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### PUP Commands (when testing locally)
```bash
# Build the project
node dist/cli.js build [--dev]

# Run all checks
node dist/cli.js check

# Create a zip package
node dist/cli.js zip

# Run a workflow
node dist/cli.js workflow <workflow-name>
# or
node dist/cli.js do <workflow-name>
```

## Architecture & Structure

### Core Application Flow
1. **Entry Point**: `src/cli.ts` — `#!/usr/bin/env node`, sets up Commander program
2. **App Setup**: `src/app.ts` — registers all commands with Commander
3. **Configuration**: Loaded from `.puprc` file via `src/config.ts`
4. **Commands**: Located in `src/commands/`, each exports a `register*Command()` function
5. **Workflows**: Custom command sequences defined in `.puprc` under `workflows` key
6. **Checks**: Validation system in `src/commands/checks/` with built-in and custom checks

### Key Directories
- `src/commands/`: All CLI commands (build, check, clean, package, zip, etc.)
- `src/commands/checks/`: Built-in checks (tbd, version-conflict)
- `src/filesystem/`: File sync operations (.distfiles, .distinclude, .distignore parsing)
- `src/utils/`: Utility modules (process, output, glob, directory, env)
- `tests/commands/`: Jest command tests
- `tests/utils/`: Jest utility tests
- `tests/fixtures/`: Test fixtures and fake projects
- `tests/helpers/`: Test setup helpers
- `defaults/`: Default config files (.puprc-defaults, .distignore-defaults)

### Important Design Patterns
1. **Command Registration**: Each command exports a function that registers with Commander
2. **Process Execution**: Uses `execa` for running external commands via `src/utils/process.ts`
3. **Configuration Merging**: `.puprc` files merge with defaults from `defaults/.puprc-defaults`
4. **Glob Matching**: Custom glob-to-regex converter in `src/utils/glob.ts` with extglob support

### Testing Approach
- **CLI Tests**: Test commands by running built CLI as subprocess via `tests/helpers/setup.ts`
- **Test Isolation**: Each test resets fixtures between runs
- **Sequential Execution**: Tests run with `--runInBand` to avoid fixture conflicts
- **Jest Config**: Uses `tsconfig.test.json` (CJS mode) for test environment

### Build and Packaging Flow
1. **Build Phase**: Runs commands from `.puprc` `build` array
2. **Check Phase**: Validates code (TBD comments, version conflicts)
3. **Package Phase**: Copies files based on `.distfiles`/`.distinclude`/`.distignore` patterns
4. **Zip Phase**: Creates final archive using `archiver`

## Critical Implementation Notes

1. **ESM Source, CJS Tests**: Source code uses ESM (`"type": "module"`), but tests run under CJS via `tsconfig.test.json` with `module: "commonjs"`.

2. **Process Execution**: Always use the `runCommand()` wrapper from `src/utils/process.ts`, which wraps `execa`.

3. **Configuration Priority**: CLI arguments > `.puprc` > `defaults/.puprc-defaults`

4. **Error Handling**: Commands call `process.exit()` on fatal errors.

5. **Output System**: Use `src/utils/output.ts` helpers (`success()`, `error()`, `warning()`, `section()`, `log()`) for consistent console output with chalk styling.

6. **Path Resolution**: Paths resolve relative to the project root (working directory).

7. **Check System**: Checks can be shell commands (run via execa) or JS/TS modules (dynamically imported). Built-in checks (tbd, version-conflict) are in `src/commands/checks/`.

8. **Workflow System**: Workflows support argument passthrough using `--` separator.

9. **GitHub Action**: `action.yml` provides a composite action that runs `npx @stellarwp/pup@latest`.
