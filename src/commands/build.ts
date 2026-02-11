import type { Command } from 'commander';
import { getConfig } from '../config.js';
import { runCommand } from '../utils/process.js';
import * as output from '../utils/output.js';

/**
 * Registers the `build` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Run the build commands.')
    .option('--dev', 'Run the dev build commands.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(async (options: { dev?: boolean; root?: string }) => {
      const config = getConfig(options.root);
      const buildSteps = config.getBuildCommands(options.dev);
      const cwd = options.root ?? config.getWorkingDir();

      output.log('Running build steps...');

      for (const step of buildSteps) {
        let cmd = step;
        let bailOnFailure = true;

        if (cmd.startsWith('@')) {
          bailOnFailure = false;
          cmd = cmd.slice(1);
        }

        output.section(`> ${cmd}`);

        const result = await runCommand(cmd, {
          cwd,
          envVarNames: config.getEnvVarNames(),
        });

        if (result.exitCode !== 0) {
          output.error(`[FAIL] Build step failed: ${cmd}`);
          if (bailOnFailure) {
            output.error('Exiting...');
            process.exit(result.exitCode);
          }
        }
      }

      output.success('Build complete.');
    });
}
