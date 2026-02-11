import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.js';
import { rmdir } from '../utils/directory.js';
import { runCommand } from '../utils/process.js';
import * as output from '../utils/output.js';

/**
 * Registers the `clean` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerCleanCommand(program: Command): void {
  program
    .command('clean')
    .description('Clean up after pup.')
    .action(async () => {
      const config = getConfig();
      const zipDir = config.getZipDir();
      const buildDir = config.getBuildDir();
      const cleanSteps = config.getCleanCommands();
      const workingDir = config.getWorkingDir();

      output.section('Cleaning up...');

      // Remove zip dir
      if (await fs.pathExists(zipDir)) {
        await rmdir(zipDir, workingDir);
        output.log('Removing zip dir...Complete.');
      }

      // Remove build dir
      if (await fs.pathExists(buildDir)) {
        await rmdir(buildDir, workingDir);
        output.log('Removing build dir...Complete.');
      }

      // Remove temp pup files
      const pupFiles = ['.pup-distfiles', '.pup-distignore', '.pup-distinclude'];
      for (const file of pupFiles) {
        const filePath = path.join(workingDir, file);
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          output.log(`Removing ${file}...Complete.`);
        }
      }

      // Run clean commands
      for (const step of cleanSteps) {
        let cmd = step;
        let notifyOnFailure = true;

        if (cmd.startsWith('@')) {
          notifyOnFailure = false;
          cmd = cmd.slice(1);
        }

        output.section(`> ${cmd}`);

        const result = await runCommand(cmd, { cwd: workingDir });

        if (result.exitCode !== 0 && notifyOnFailure) {
          output.error(`[FAIL] Clean step failed: ${cmd}`);
        }
      }
    });
}
