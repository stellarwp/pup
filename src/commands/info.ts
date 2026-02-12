import type { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.js';
import { PUP_VERSION } from '../app.js';
import * as output from '../utils/output.js';

/**
 * Registers the `info` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('Gets pup details for the current project.')
    .action(async () => {
      const config = getConfig();
      const workingDir = config.getWorkingDir();

      output.title('CLI Info');
      output.log(`pup ${PUP_VERSION}`);

      // Node.js version
      output.log(`Using: Node.js ${process.version}`);

      output.section('Working Directory');
      output.log(workingDir);

      output.section('File info');

      const files = ['.distignore', '.distinclude', '.gitattributes', '.puprc'];

      const filesError: string[] = [];
      const filesExist: string[] = [];
      const filesAbsent: string[] = [];

      for (const file of files) {
        const filePath = path.join(workingDir, file);
        const exists = await fs.pathExists(filePath);
        const styledFile = chalk.cyan(file);

        if (exists && file === '.puprc') {
          try {
            const contents = await fs.readFile(filePath, 'utf-8');
            JSON.parse(contents);
            filesExist.push(`✅ ${styledFile} - ${chalk.green('exists')}`);
          } catch (e) {
            const reason = e instanceof SyntaxError ? e.message : String(e);
            filesError.push(`❌ ${styledFile} - ${chalk.green('exists')} but could not be parsed: ${reason}`);
          }
        } else if (exists) {
          filesExist.push(`✅ ${styledFile} - ${chalk.green('exists')}`);
        } else {
          filesAbsent.push(`⚫ ${styledFile} - does not exist`);
        }
      }

      for (const line of filesError) output.log(line);
      for (const line of filesExist) output.log(line);
      for (const line of filesAbsent) output.log(line);

      output.section('Config');
      output.log(JSON.stringify(config.toJSON(), null, 2));
    });
}
