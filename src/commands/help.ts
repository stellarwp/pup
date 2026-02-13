import type { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import { getDefaultsDir } from '../config.ts';
import * as output from '../utils/output.ts';

/**
 * Prints the decorated banner and command list.
 *
 * @since TBD
 *
 * @param {string} contents - The raw markdown contents of commands.md.
 *
 * @returns {void}
 */
function printCommandList(contents: string): void {
  const border = '*'.repeat(80);

  output.writeln(border);
  output.writeln('*');
  output.writeln(`* ${chalk.blue(`${chalk.magenta('P')}roduct ${chalk.magenta('U')}tility & ${chalk.magenta('P')}ackager`)}`);
  output.writeln('* ' + '-'.repeat(78));
  output.writeln('* A CLI utility by StellarWP');
  output.writeln('*');
  output.writeln(border);

  output.newline();
  output.writeln(`Run ${chalk.cyan('pup help <topic>')} for more information on a specific command.`);
  output.newline();

  const lines = contents.split('\n');
  const commands: [string, string][] = [];
  let currentCommand: string | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/##+\s+`pup ([^`]+)`/);
    if (headerMatch) {
      currentCommand = headerMatch[1];
      continue;
    }

    if (currentCommand && !commands.find(([cmd]) => cmd === currentCommand)) {
      const trimmed = line.trim();
      if (trimmed) {
        const description = trimmed.replace(/`([^`]+)`/g, (_, code: string) => chalk.cyan(code));
        commands.push([currentCommand, description]);
        currentCommand = null;
      }
    }
  }

  commands.sort((a, b) => a[0].localeCompare(b[0]));

  output.table(
    ['Command', 'Description'],
    commands.map(([cmd, desc]) => [chalk.yellow(cmd), desc]),
  );

  output.newline();
  output.writeln(`For more documentation, head over to ${chalk.yellow('https://github.com/stellarwp/pup')}`);
}

/**
 * Prints styled help for a specific command topic.
 *
 * @since TBD
 *
 * @param {string} topic - The command topic to show help for.
 * @param {string} contents - The raw markdown contents of commands.md.
 *
 * @returns {boolean} Whether the topic was found.
 */
function printCommandHelp(topic: string, contents: string): boolean {
  const lines = contents.split('\n');
  let started = false;
  let didFirstLine = false;
  let inCodeBlock = false;
  let inArgTable = false;
  let argHeaders: string[] = [];
  let argRows: string[][] = [];

  for (const line of lines) {
    if (started) {
      // Stop when we hit the next ## command section
      if (/^##+\s+`pup /.test(line)) {
        break;
      }

      // Code block toggle
      if (/^```/.test(line)) {
        inCodeBlock = !inCodeBlock;
        output.writeln(chalk.green('.'.repeat(50)));
        continue;
      }

      // Inside code block
      if (inCodeBlock) {
        if (/^#/.test(line)) {
          output.writeln(chalk.green(line));
        } else {
          output.writeln(chalk.cyan(line));
        }
        continue;
      }

      // Apply inline formatting (strip links first so ANSI codes from chalk
      // don't contain `[` characters that confuse the link regex)
      let formatted = line;
      formatted = formatted.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      formatted = formatted.replace(/`([^`]+)`/g, (_, code: string) => chalk.cyan(code));
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (_, bold: string) => chalk.red(bold));

      // Argument/option table handling
      if (inArgTable) {
        if (/^\| (Arg|Opt)/.test(formatted)) {
          argHeaders = formatted.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
          continue;
        }

        if (/^\|--/.test(line)) {
          continue;
        }

        if (/^\|/.test(line)) {
          argRows.push(formatted.replace(/^\||\|$/g, '').split('|').map((s) => s.trim()));
          continue;
        }

        // End of table
        if (argHeaders.length > 0) {
          inArgTable = false;
          output.table(argHeaders, argRows);
          argHeaders = [];
          argRows = [];
        }
      }

      // Sub-section headers (### or ####)
      const sectionMatch = formatted.match(/^##(#+) (.+)/);
      if (sectionMatch) {
        const depth = sectionMatch[1].length;
        const label = sectionMatch[2];
        output.section(`${'>'.repeat(depth)} ${label}:`);

        if (/^##(#+ )(Arguments|`\.puprc` options)/.test(line)) {
          inArgTable = true;
          argHeaders = [];
          argRows = [];
        }
        continue;
      }

      output.writeln(formatted);

      if (!didFirstLine) {
        didFirstLine = true;
        output.newline();
      }
    } else {
      const topicPattern = new RegExp(`^##+\\s+\`pup ${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``);
      if (topicPattern.test(line)) {
        output.title(`Help: ${chalk.cyan('pup ' + topic)}`);
        started = true;
      }
    }
  }

  // Flush any remaining argument table
  if (inArgTable && argHeaders.length > 0) {
    output.table(argHeaders, argRows);
  }

  return started;
}

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
    .command('help [topic]', { isDefault: true })
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
        printCommandList(contents);
        return;
      }

      const normalizedTopic = topic.replace('pup ', '').replace('pup-', '');

      if (!printCommandHelp(normalizedTopic, contents)) {
        output.error(`Unknown topic: ${topic}`);
      }
    });
}
