import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import {
  lineMatches,
  scannerOptionsFromConfig,
  walkConfiguredDirs,
} from '../../checks/tbd-scanner.ts';
import * as output from '../../utils/output.ts';
import type { CheckConfig, CheckResult } from '../../types.ts';

interface TbdMatch {
  file: string;
  line: number;
  content: string;
}

/**
 * Scans configured directories for TBD markers.
 *
 * @since TBD
 *
 * @param {CheckConfig} config - The check configuration containing directories and skip patterns.
 * @param {string} workingDir - The working directory to scan relative to.
 *
 * @returns {Promise<CheckResult>} A CheckResult indicating success or failure with details about found TBDs.
 */
export async function executeTbdCheck(
  config: CheckConfig,
  workingDir: string
): Promise<CheckResult> {
  const scannerOptions = scannerOptionsFromConfig(config);

  output.section('Checking for TBDs...');

  const matches: TbdMatch[] = [];

  for await (const file of walkConfiguredDirs(workingDir, scannerOptions)) {
    const contents = await fs.readFile(file, 'utf-8');
    const lines = contents.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lineMatches(lines[i])) {
        matches.push({ file, line: i + 1, content: lines[i] });
      }
    }
  }

  if (matches.length === 0) {
    output.success('No TBDs found!');
    output.log('');
    output.log('');
    output.success('Success! No TBDs found.');
    return { success: true, output: '' };
  }

  // Group by file
  const grouped = new Map<string, TbdMatch[]>();
  for (const match of matches) {
    const existing = grouped.get(match.file) ?? [];
    existing.push(match);
    grouped.set(match.file, existing);
  }

  for (const [file, fileMatches] of grouped) {
    const relPath = path.relative(workingDir, file);
    output.log(chalk.cyan(relPath));
    for (const m of fileMatches) {
      output.log(`${chalk.yellow(`${m.line}:`)} ${m.content.trim()}`);
    }
    output.log('');
  }

  output.log('');
  output.error('TBDs have been found!');

  return { success: false, output: '' };
}
