import { Command } from 'commander';
import { Config, getConfig, resetConfig } from './config.ts';
import { version } from '../package.json';

export const PUP_VERSION = version;

/**
 * Creates and configures the Commander program instance.
 *
 * @since TBD
 *
 * @returns {Command} The configured Commander program.
 */
export function createApp(): Command {
  resetConfig();

  getConfig();

  const program = new Command();
  program
    .name('pup')
    .version(PUP_VERSION)
    .description("StellarWP's Project Utilities & Packager");

  return program;
}

export { Config, getConfig, resetConfig };
