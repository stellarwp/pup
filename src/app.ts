import { Command } from 'commander';
import { Config, getConfig, resetConfig } from './config.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads the pup version from the nearest package.json.
 *
 * @since TBD
 *
 * @returns {string} The version string from package.json, or '2.0.0' as a fallback.
 */
function getVersion(): string {
  // Try to read from package.json
  const candidates = [
    path.resolve(__dirname, '..', 'package.json'),
    path.resolve(__dirname, '..', '..', 'package.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf-8')) as { version: string };
      return pkg.version;
    }
  }

  return '2.0.0';
}

export const PUP_VERSION = getVersion();

/**
 * Creates and configures the Commander program instance.
 *
 * @since TBD
 *
 * @returns {Command} The configured Commander program.
 */
export function createApp(): Command {
  resetConfig();

  const program = new Command();
  program
    .name('pup')
    .version(PUP_VERSION)
    .description("StellarWP's Project Utilities & Packager");

  return program;
}

export { Config, getConfig, resetConfig };
