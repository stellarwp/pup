import type { Command as CommanderCommand } from 'commander';
import { getConfig } from '../config.ts';
import { getVersion } from './get-version.ts';
import { runChecks } from './check.ts';
import { executeClone } from './clone.ts';
import { executeBuild } from './build.ts';
import { executeI18n } from './i18n.ts';
import { executePackage } from './package.ts';
import { executeClean } from './clean.ts';
import { runCommand } from '../utils/process.ts';
import * as output from '../utils/output.ts';

interface ZipOptions {
  dev?: boolean;
  build: boolean;
  check: boolean;
  clone: boolean;
  clean: boolean;
  i18n: boolean;
  package: boolean;
}

/**
 * Registers the `zip` command. This orchestrates the full pipeline
 * by delegating to the other pup commands.
 *
 * @since TBD
 *
 * @param {CommanderCommand} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerZipCommand(program: CommanderCommand): void {
  program
    .command('zip [branch]')
    .description(
      'Run through the whole pup workflow with a resulting zip at the end.'
    )
    .option('--dev', 'Run the dev build commands.')
    .option('--no-build', "Don't run the build.")
    .option('--no-check', "Don't run the checks.")
    .option('--no-clone', "Don't clone the repo.")
    .option('--no-clean', "Don't clean up after packaging.")
    .option('--no-i18n', "Don't fetch language files.")
    .option('--no-package', "Don't run the packaging.")
    .action(async (branch: string | undefined, options: ZipOptions) => {
      const config = getConfig();

      // Step 1: Clone
      if (options.clone) {
        const result = await executeClone({ branch });
        if (result !== 0) {
          output.error('The clone step of `pup zip` failed.');
          process.exit(result);
        }
      } else if (branch) {
        await runCommand(`git checkout --quiet ${branch}`, { silent: true });
      }

      const rootDir = options.clone ? config.getBuildDir() : undefined;

      // Step 2: Build
      if (options.build) {
        const result = await executeBuild({ dev: options.dev, root: rootDir });
        if (result !== 0) {
          output.error('The build step of `pup zip` failed.');
          output.log('Note: if you have a .nvmrc file, you may need to run "nvm use" before running "pup".');
          process.exit(result);
        }
      }

      // Step 3: Check
      if (options.check) {
        const checks = config.getChecks();
        if (checks.size > 0) {
          const result = await runChecks({ dev: options.dev, root: rootDir });
          if (result !== 0) {
            process.exit(result);
          }
        }
      }

      // Step 4: I18n
      if (options.i18n) {
        const result = await executeI18n({ root: rootDir });
        if (result !== 0) {
          output.error('The i18n step of `pup zip` failed.');
          process.exit(result);
        }
      }

      // Step 5: Get Version
      const version = await getVersion({ dev: options.dev, root: rootDir });

      // Step 6: Package
      if (options.package) {
        const result = await executePackage(version, { root: rootDir });
        if (result !== 0) {
          output.error('The package step of `pup zip` failed.');
          process.exit(result);
        }
      }

      // Step 7: Clean
      if (options.clean) {
        const result = await executeClean();
        if (result !== 0) {
          output.error('The clean step of `pup zip` failed.');
          process.exit(result);
        }
      }
    });
}
