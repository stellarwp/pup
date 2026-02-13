import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.ts';
import { runCommandSilent } from '../utils/process.ts';
import * as output from '../utils/output.ts';

/**
 * Extracts the project version from the first configured version file. Appends a dev suffix
 * with git timestamp and hash when the dev option is set.
 *
 * @since TBD
 *
 * @param {object} options - The options object.
 * @param {boolean} [options.dev] - Whether to append a dev suffix to the version.
 * @param {string} [options.root] - The root directory for resolving version files.
 *
 * @returns {Promise<string>} The resolved version string, or 'unknown' if not found.
 */
export async function getVersion(options: {
  dev?: boolean;
  root?: string;
}): Promise<string> {
  const config = getConfig();
  const versionFiles = config.getVersionFiles();
  const cwd = options.root ?? config.getWorkingDir();

  if (versionFiles.length === 0) {
    return 'unknown';
  }

  const versionFile = versionFiles[0];
  const filePath = path.resolve(cwd, versionFile.file);
  const contents = await fs.readFile(filePath, 'utf-8');
  const regex = new RegExp(versionFile.regex);
  const matches = contents.match(regex);

  let version: string;
  if (!matches || !matches[2]) {
    version = 'unknown';
  } else {
    version = matches[2];
  }

  if (options.dev) {
    const timestampResult = await runCommandSilent(
      'git show -s --format=%ct HEAD',
      { cwd }
    );
    const hashResult = await runCommandSilent(
      'git rev-parse --short=8 HEAD',
      { cwd }
    );
    const timestamp = timestampResult.stdout.trim();
    const hash = hashResult.stdout.trim();
    version += `-dev-${timestamp}-${hash}`;
  }

  return version;
}

/**
 * Registers the `get-version` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerGetVersionCommand(program: Command): void {
  program
    .command('get-version')
    .description('Gets the version for the product.')
    .option('--dev', 'Get the dev version.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(async (options: { dev?: boolean; root?: string }) => {
      const version = await getVersion(options);
      output.writeln(version);
    });
}
