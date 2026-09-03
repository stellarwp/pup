import type { Command } from 'commander';
import { getConfig } from '../config.ts';
import { runCommand } from '../utils/process.ts';
import type { BuildStep, RunCommandResult } from '../types.ts';
import * as output from '../utils/output.ts';

/**
 * Runs a single build command, handling the `@` soft-fail prefix.
 *
 * @since TBD
 *
 * @param {string} step - The command string to execute.
 * @param {string} cwd - The working directory for the command.
 *
 * @returns {Promise<{ cmd: string; bailOnFailure: boolean; result: RunCommandResult }>} The command, bail flag, and result.
 */
async function runBuildStep(
  step: string,
  cwd: string
): Promise<{ cmd: string; bailOnFailure: boolean; result: RunCommandResult }> {
  let cmd = step;
  let bailOnFailure = true;

  if (cmd.startsWith('@')) {
    bailOnFailure = false;
    cmd = cmd.slice(1);
  }

  output.section(`> ${cmd}`);

  const result = await runCommand(cmd, { cwd });

  return { cmd, bailOnFailure, result };
}

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
      const config = getConfig();
      const buildSteps: BuildStep[] = config.getBuildCommands(options.dev);
      const cwd = options.root ?? config.getWorkingDir();

      output.log('Running build steps...');

      for (const step of buildSteps) {
        if (Array.isArray(step)) {
          // Parallel group: run all commands concurrently
          const results = await Promise.all(
            step.map((cmd) => runBuildStep(cmd, cwd))
          );

          // Check for failures after all parallel commands complete
          for (const { cmd, bailOnFailure, result } of results) {
            if (result.exitCode !== 0) {
              output.error(`[FAIL] Build step failed: ${cmd}`);
              if (bailOnFailure) {
                output.error('Exiting...');
                process.exit(result.exitCode);
              }
            }
          }
        } else {
          // Sequential: run single command
          const { cmd, bailOnFailure, result } = await runBuildStep(
            step,
            cwd
          );

          if (result.exitCode !== 0) {
            output.error(`[FAIL] Build step failed: ${cmd}`);
            if (bailOnFailure) {
              output.error('Exiting...');
              process.exit(result.exitCode);
            }
          }
        }
      }

      output.success('Build complete.');
    });
}
