import type { Command } from 'commander';
import { getConfig } from '../config.ts';
import { getVersion } from './get-version.ts';
import * as output from '../utils/output.ts';

/**
 * Registers the `zip-name` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerZipNameCommand(program: Command): void {
  program
    .command('zip-name')
    .description('Gets the zip name for the project.')
    .argument('[version]', 'The version number to use.')
    .option('--dev', 'Get the dev version.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(
      async (
        versionArg: string | undefined,
        options: { dev?: boolean; root?: string }
      ) => {
        const config = getConfig();
        const zipName = config.getZipName();

        let version = versionArg;
        if (!version) {
          version = await getVersion(options);
        }

        if (version && version !== 'unknown') {
          output.writeln(`${zipName}.${version}`);
        } else {
          output.writeln(zipName);
        }
      }
    );
}
