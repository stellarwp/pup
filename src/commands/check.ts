import type { Command } from 'commander';
import chalk from 'chalk';
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
    output.writeln('📣 The .puprc does not have any checks configured.');
    output.writeln(`💡 If you would like to use the defaults, simply remove the ${chalk.yellow('"checks"')} property in ${chalk.yellow('.puprc')}.`);
    output.writeln('');
    output.writeln(`If you would like to use one of the default checks, add one or more of the following to the ${chalk.yellow('"checks"')} property in your ${chalk.yellow('.puprc')}:`);
    output.writeln('      "tbd": {}');
    output.writeln('      "version-conflict": {}');
    output.writeln('');
    output.writeln('If you would like to create your own check, take a look at the pup docs to learn how:');
    output.writeln('      https://github.com/stellarwp/pup');
    return 0;
  }

  const failures: string[] = [];

  for (const [slug, checkConfig] of checks) {
    const failMethod = options.dev
      ? checkConfig.fail_method_dev
      : checkConfig.fail_method;
    const bailOnFailure = failMethod === 'error';

    output.setPrefix(slug);

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
      output.warning(`Unknown check type: ${checkConfig.type}`);
      output.setPrefix('');
      continue;
    }

    if (result.output) {
      for (const line of result.output.split('\n')) {
        output.log(line);
      }
    }

    output.setPrefix('');

    if (!result.success) {
      failures.push(slug);

      if (bailOnFailure) {
        output.writeln(chalk.yellow(`${slug}'s fail_method in ${chalk.cyan('.puprc')} is set to "${chalk.red('error')}". Exiting...`));
        return 1;
      }
    }
  }

  if (failures.length > 0) {
    output.error(`The following checks failed:\n* ${failures.join('\n* ')}`);
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
 * Runs a single check by slug, handling prefix, output, and exit code.
 *
 * @since TBD
 *
 * @param {string} slug - The check slug to run.
 * @param {object} options - The options object.
 * @param {boolean} [options.dev] - Whether to use dev failure methods.
 * @param {string} [options.root] - The root directory for running commands.
 *
 * @returns {Promise<number>} The exit code: 0 for success, 1 if the check failed.
 */
async function runSingleCheck(
  slug: string,
  options: { dev?: boolean; root?: string }
): Promise<number> {
  const config = getConfig(options.root);
  const checks = config.getChecks();
  const cwd = options.root ?? config.getWorkingDir();
  const checkConfig = checks.get(slug);

  if (!checkConfig) {
    output.error(`Check "${slug}" is not configured.`);
    return 1;
  }

  output.setPrefix(slug);

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
    output.warning(`Unknown check type: ${checkConfig.type}`);
    output.setPrefix('');
    return 1;
  }

  if (result.output) {
    for (const line of result.output.split('\n')) {
      output.log(line);
    }
  }

  output.setPrefix('');
  return result.success ? 0 : 1;
}

/**
 * Registers the `check` command and individual `check:{slug}` subcommands
 * for each check configured in `.puprc`.
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

  try {
    const config = getConfig();
    for (const [slug] of config.getChecks()) {
      program
        .command(`check:${slug}`)
        .description(`Run the ${slug} check.`)
        .option('--dev', 'Run with dev failure methods.')
        .option('--root <dir>', 'Set the root directory for running commands.')
        .action(async (options: { dev?: boolean; root?: string }) => {
          const exitCode = await runSingleCheck(slug, options);
          if (exitCode !== 0) {
            process.exit(exitCode);
          }
        });
    }
  } catch {
    // Config may not be loadable (e.g., no .puprc). Subcommands will not be
    // registered, but the main `check` command still works.
  }
}
