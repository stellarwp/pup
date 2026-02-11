import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getDefaultsDir } from '../config.js';
import * as output from '../utils/output.js';

/**
 * Registers the `help` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerHelpCommand(program: Command): void {
  program
    .command('help [topic]')
    .description('Shows help for pup.')
    .action(async (topic?: string) => {
      const docsDir = path.resolve(getDefaultsDir(), '..', 'docs');
      const commandsPath = path.join(docsDir, 'commands.md');

      if (!await fs.pathExists(commandsPath)) {
        output.log('Help documentation not found.');
        return;
      }

      const contents = await fs.readFile(commandsPath, 'utf-8');

      if (!topic) {
        // Show command list
        output.title('PUP - Project Utilities & Packager');
        output.log('Available commands:\n');

        const lines = contents.split('\n');
        for (const line of lines) {
          const match = line.match(/^\* \[`(.+?)`\]/);
          if (match) {
            output.log(`  ${match[1]}`);
          }
        }

        output.newline();
        output.log('Run "pup help <command>" for more information on a specific command.');
        return;
      }

      // Show specific topic
      const sections = contents.split(/^## /m);
      const normalizedTopic = topic.replace('pup ', '').replace('pup-', '');

      for (const section of sections) {
        const headerMatch = section.match(/^`pup (.+?)`/);
        if (!headerMatch) continue;

        const sectionName = headerMatch[1];
        if (
          sectionName === normalizedTopic ||
          sectionName === `pup ${normalizedTopic}` ||
          sectionName.includes(normalizedTopic)
        ) {
          output.title(`pup ${sectionName}`);
          // Strip markdown formatting for console
          const body = section
            .replace(/^`pup .+?`\n/, '')
            .replace(/```[a-z]*\n/g, '')
            .replace(/```\n?/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .trim();

          output.log(body);
          return;
        }
      }

      output.error(`Unknown topic: ${topic}`);
    });
}
