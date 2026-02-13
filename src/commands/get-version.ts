import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.ts';
import { runCommandSilent } from '../utils/process.ts';
import * as output from '../utils/output.ts';

/**
 * Extracts the project version by trying each configured version file in order
 * and returning the first successful match. Appends a dev suffix with git
 * timestamp and hash when the dev option is set.
 *
 * @since TBD
 *
 * @param {object} options - The options object.
 * @param {boolean} [options.dev] - Whether to append a dev suffix to the version.
 * @param {string} [options.root] - The root directory for resolving version files.
 *
 * @returns {Promise<string>} The resolved version string.
 *
 * @throws {Error} If no version files are configured or none produce a match.
 */
export async function getVersion(options: {
  dev?: boolean;
  root?: string;
}): Promise<string> {
  const config = getConfig();
  const versionFiles = config.getVersionFiles();
  const cwd = options.root ?? config.getWorkingDir();

  if (versionFiles.length === 0) {
    throw new Error(
      'No version files configured. Add entries to .puprc paths.versions.'
    );
  }

  let version: string | undefined;

  for (const vf of versionFiles) {
    const filePath = path.resolve(cwd, vf.file);
    try {
      const contents = await fs.readFile(filePath, 'utf-8');
      const regex = new RegExp(vf.regex);
      const matches = contents.match(regex);
      const matched = matches?.groups?.version ?? matches?.[2];
      if (matched) {
        version = matched;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!version) {
    const tried = versionFiles.map((vf) => `${vf.file} (/${vf.regex}/)`).join(', ');
    throw new Error(
      `Could not find a version in any configured version file. Tried: ${tried}`
    );
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
