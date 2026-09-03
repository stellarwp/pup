import type { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.ts';
import {
  replaceInLine,
  scannerOptionsFromConfig,
  walkConfiguredDirs,
} from '../checks/tbd-scanner.ts';
import * as output from '../utils/output.ts';
import type { CheckConfig } from '../types.ts';

export interface ReplaceTbdOptions {
  /**
   * The version to write in place of each TBD placeholder.
   */
  version: string;

  /**
   * Whether to report the changes without writing them.
   */
  dryRun?: boolean;

  /**
   * Root directory to scan instead of the working directory.
   */
  root?: string;
}

/**
 * Replaces TBD version placeholders across the directories the tbd check scans.
 *
 * The changes are written in place and are not reverted, so `--dry-run` is the
 * way to preview them.
 *
 * @since TBD
 *
 * @param {ReplaceTbdOptions} options - The replacement options.
 *
 * @throws {Error} If a file cannot be written.
 *
 * @returns {Promise<number>} The exit code.
 */
export async function replaceTbd(options: ReplaceTbdOptions): Promise<number> {
  const config = getConfig();
  const cwd = options.root ?? config.getWorkingDir();

  // Mirrors how check:tbd resolves its configuration, including the empty
  // fallback for a built-in check absent from .puprc, so this command resolves
  // exactly the placeholders the check reports.
  const tbdConfig = config.getChecks().get('tbd') ?? ({} as CheckConfig);
  const scannerOptions = scannerOptionsFromConfig(tbdConfig);

  if (options.dryRun) {
    output.log(`${chalk.yellow('[dry-run]')} No files will be modified.`);
  }

  let totalFiles = 0;
  let totalCount = 0;

  for await (const file of walkConfiguredDirs(cwd, scannerOptions)) {
    const contents = await fs.readFile(file, 'utf-8');
    const lines = contents.split('\n');

    let fileCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const { line, count } = replaceInLine(lines[i], options.version);
      lines[i] = line;
      fileCount += count;
    }

    if (fileCount === 0) {
      continue;
    }

    totalFiles++;
    totalCount += fileCount;

    const relPath = path.relative(cwd, file);
    output.log(
      `${chalk.green('✓')} ${chalk.cyan(relPath)} (${fileCount} replaced)`
    );

    if (!options.dryRun) {
      try {
        await fs.writeFile(file, lines.join('\n'));
      } catch {
        throw new Error(`Could not write to file: ${relPath}`);
      }
    }
  }

  output.log('');

  if (totalCount === 0) {
    output.success('No TBDs found to replace.');
  } else if (options.dryRun) {
    output.log(
      `${chalk.yellow('[dry-run]')} Would replace ${totalCount} TBD occurrence(s) across ${totalFiles} file(s).`
    );
  } else {
    output.success(
      `Replaced ${totalCount} TBD occurrence(s) across ${totalFiles} file(s) with ${options.version}.`
    );
  }

  return 0;
}

/**
 * Registers the `replace-tbd` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerReplaceTbdCommand(program: Command): void {
  program
    .command('replace-tbd <version>')
    .description(
      'Replaces TBD version placeholders with the provided version.'
    )
    .option('--dry-run', 'Preview the changes without writing to files.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(
      async (version: string, options: { dryRun?: boolean; root?: string }) => {
        const exitCode = await replaceTbd({
          version,
          dryRun: options.dryRun,
          root: options.root,
        });

        if (exitCode !== 0) {
          process.exit(exitCode);
        }
      }
    );
}
