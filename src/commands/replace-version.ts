import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.ts';
import type { Config } from '../config.ts';
import { trailingSlashIt } from '../utils/directory.ts';
import { getDevSuffix } from '../utils/version.ts';
import * as output from '../utils/output.ts';

export interface ReplaceVersionOptions {
  /**
   * The version to write into the version files.
   */
  version: string;

  /**
   * Whether to append the dev suffix to the version.
   */
  dev?: boolean;

  /**
   * Root directory to resolve version file paths against.
   */
  root?: string;

  /**
   * An already-resolved config, so callers do not pay for a second lookup.
   */
  config?: Config;

  /**
   * Whether to suppress the per-file success lines.
   */
  quiet?: boolean;
}

/**
 * Writes a version into every file configured under .puprc paths.versions.
 *
 * Unlike `pup package`, the changes are left in place; reverting them is the
 * caller's responsibility.
 *
 * @since TBD
 *
 * @param {ReplaceVersionOptions} options - The replacement options.
 *
 * @throws {Error} If a version file cannot be read or written.
 *
 * @returns {Promise<number>} 0 on success, 1 when no version files are configured.
 */
export async function replaceVersion(
  options: ReplaceVersionOptions
): Promise<number> {
  const config = options.config ?? getConfig();
  const versionFiles = config.getVersionFiles();

  if (versionFiles.length === 0) {
    output.warning('No version files found in .puprc paths.versions.');
    return 1;
  }

  let version = options.version;

  if (options.dev) {
    version += await getDevSuffix(config.getWorkingDir());
  }

  const prefix = options.root ? trailingSlashIt(options.root) : '';

  for (const vf of versionFiles) {
    const filePath = prefix
      ? path.join(prefix, vf.file)
      : path.resolve(config.getWorkingDir(), vf.file);

    let contents: string;

    try {
      contents = await fs.readFile(filePath, 'utf-8');
    } catch {
      throw new Error(`Could not read file: ${vf.file}`);
    }

    const regex = new RegExp(vf.regex);

    if (!regex.test(contents)) {
      output.warning(
        `! No version found in ${vf.file} matching its regex. Skipping.`
      );
      continue;
    }

    // A function replacer keeps the version literal. A replacement string would
    // interpret $1, $& and friends inside the version itself.
    const replaced = contents.replace(
      regex,
      (_match, captured: string) => `${captured}${version}`
    );

    try {
      await fs.writeFile(filePath, replaced);
    } catch {
      throw new Error(`Could not write to file: ${vf.file}`);
    }

    if (!options.quiet) {
      output.log(`✓ Updated version in ${vf.file} to ${version}.`);
    }
  }

  return 0;
}

/**
 * Registers the `replace-version` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerReplaceVersionCommand(program: Command): void {
  program
    .command('replace-version <version>')
    .description(
      'Replaces the version in the files defined in .puprc paths.versions.'
    )
    .option('--dev', 'Append the dev suffix to the version.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(async (version: string, options: { dev?: boolean; root?: string }) => {
      const exitCode = await replaceVersion({
        version,
        dev: options.dev,
        root: options.root,
      });

      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });
}
