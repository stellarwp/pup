import type { Command } from 'commander';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
import { getConfig } from '../config.ts';
import * as output from '../utils/output.ts';

/**
 * Registers the `clone` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerCloneCommand(program: Command): void {
  program
    .command('clone')
    .description('Clone a git repository.')
    .option('--branch <branch>', 'The branch to clone.')
    .action(async (options: { branch?: string }) => {
      const config = getConfig();
      const repo = config.getRepo();
      const buildDir = config.getBuildDir();

      output.section('Cloning repository...');

      // Remove existing build dir
      if (await fs.pathExists(buildDir)) {
        await fs.remove(buildDir);
      }

      const git = simpleGit();
      const cloneOptions = [
        '--quiet',
        '--recurse-submodules',
        '-j8',
        '--shallow-submodules',
        '--depth',
        '1',
      ];

      if (options.branch) {
        cloneOptions.push('--branch', options.branch);
      }

      await git.clone(repo, buildDir, cloneOptions);

      output.success(`Cloned ${repo} to ${buildDir}`);
    });
}
