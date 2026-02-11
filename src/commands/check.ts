import type { Command } from 'commander';
import { getConfig } from '../config.js';
import { executeTbdCheck } from './checks/tbd.js';
import { executeVersionConflictCheck } from './checks/version-conflict.js';
import { runCommand } from '../utils/process.js';
import * as output from '../utils/output.js';
import type { CheckConfig, CheckResult } from '../types.js';

/**
 * Runs all configured checks and returns an exit code.
 *
 * @since TBD
 *
 * @param {object} options - The options object.
 * @param {boolean} [options.dev] - Whether to use dev failure methods.
 * @param {string} [options.root] - The root directory for running commands.
 *
 * @returns {Promise<number>} The exit code: 0 for success, 1 if any error-level check failed.
 */
export async function runChecks(options: {
  dev?: boolean;
  root?: string;
}): Promise<number> {
  const config = getConfig(options.root);
  const checks = config.getChecks();
  const cwd = options.root ?? config.getWorkingDir();

  if (checks.size === 0) {
    output.log('No checks configured.');
    return 0;
  }

  let shouldBail = false;

  for (const [slug, checkConfig] of checks) {
    const failMethod = options.dev
      ? checkConfig.fail_method_dev
      : checkConfig.fail_method;
    const bailOnFailure = failMethod === 'error';

    let result: CheckResult;

    if (checkConfig.type === 'pup' || !checkConfig.type) {
      result = await runBuiltinCheck(slug, checkConfig, cwd, config);
    } else if (checkConfig.type === 'command' && checkConfig.command) {
      result = await runShellCheck(checkConfig.command, cwd);
    } else if (
      (checkConfig.type === 'simple' || checkConfig.type === 'class') &&
      checkConfig.file
    ) {
      result = await runModuleCheck(checkConfig.file, checkConfig, cwd);
    } else {
      output.warning(`[${slug}] Unknown check type: ${checkConfig.type}`);
      continue;
    }

    if (result.success) {
      output.log(`[${slug}] ${result.output}`);
    } else {
      output.error(`[${slug}] ${result.output}`);
      if (bailOnFailure) {
        shouldBail = true;
      }
    }
  }

  if (shouldBail) {
    return 1;
  }

  return 0;
}

/**
 * Dispatches a built-in pup check by slug.
 *
 * @since TBD
 *
 * @param {string} slug - The identifier for the built-in check.
 * @param {CheckConfig} checkConfig - The configuration for this check.
 * @param {string} cwd - The current working directory.
 * @param {ReturnType<typeof getConfig>} config - The resolved pup configuration.
 *
 * @returns {Promise<CheckResult>} The result of the check.
 */
async function runBuiltinCheck(
  slug: string,
  checkConfig: CheckConfig,
  cwd: string,
  config: ReturnType<typeof getConfig>
): Promise<CheckResult> {
  switch (slug) {
    case 'tbd':
      return executeTbdCheck(checkConfig, cwd);
    case 'version-conflict':
      return executeVersionConflictCheck(config.getVersionFiles(), cwd);
    default:
      return { success: false, output: `Unknown built-in check: ${slug}` };
  }
}

/**
 * Runs a shell command check.
 *
 * @since TBD
 *
 * @param {string} command - The shell command to execute.
 * @param {string} cwd - The current working directory.
 *
 * @returns {Promise<CheckResult>} The result of the shell check.
 */
async function runShellCheck(
  command: string,
  cwd: string
): Promise<CheckResult> {
  const result = await runCommand(command, { cwd, silent: true });
  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr || (result.exitCode === 0 ? 'Success!' : 'Failed.'),
  };
}

/**
 * Dynamically imports and executes a JS/TS module check.
 *
 * @since TBD
 *
 * @param {string} file - The path to the module file relative to the working directory.
 * @param {CheckConfig} checkConfig - The configuration for this check.
 * @param {string} cwd - The current working directory.
 *
 * @returns {Promise<CheckResult>} The result of the module check.
 */
async function runModuleCheck(
  file: string,
  checkConfig: CheckConfig,
  cwd: string
): Promise<CheckResult> {
  try {
    const modulePath = new URL(`file://${cwd}/${file}`).href;
    const mod = (await import(modulePath)) as {
      configure?: (config: CheckConfig) => void;
      execute: (context: {
        config: CheckConfig;
        workingDir: string;
      }) => Promise<CheckResult>;
    };

    if (mod.configure) {
      mod.configure(checkConfig);
    }

    return await mod.execute({ config: checkConfig, workingDir: cwd });
  } catch (err) {
    return {
      success: false,
      output: `Failed to load check module ${file}: ${err}`,
    };
  }
}

/**
 * Registers the `check` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerCheckCommand(program: Command): void {
  program
    .command('check')
    .description('Run checks against the codebase.')
    .option('--dev', 'Run with dev failure methods.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(async (options: { dev?: boolean; root?: string }) => {
      const exitCode = await runChecks(options);
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });
}
