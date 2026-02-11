import fs from 'fs-extra';
import path from 'node:path';
import type { CheckConfig, CheckResult } from '../../types.js';

const DEFAULT_SKIP_DIRS = 'bin|build|vendor|node_modules|.git|.github|tests';
const DEFAULT_SKIP_FILES = '.min.css|.min.js|.map.js|.css|.png|.jpg|.jpeg|.svg|.gif|.ico';
const DEFAULT_DIRS = ['src'];

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
  const skipDirs = (config.skip_directories ?? DEFAULT_SKIP_DIRS).split('|');
  const skipFiles = (config.skip_files ?? DEFAULT_SKIP_FILES).split('|');
  const dirs = config.dirs ?? DEFAULT_DIRS;

  const matches: TbdMatch[] = [];

  for (const dir of dirs) {
    const dirPath = path.resolve(workingDir, dir);
    if (!(await fs.pathExists(dirPath))) continue;
    await scanDirectory(dirPath, workingDir, skipDirs, skipFiles, matches);
  }

  if (matches.length === 0) {
    return { success: true, output: 'Success! No TBDs found.' };
  }

  // Group by file
  const grouped = new Map<string, TbdMatch[]>();
  for (const match of matches) {
    const existing = grouped.get(match.file) ?? [];
    existing.push(match);
    grouped.set(match.file, existing);
  }

  let output = 'TBDs have been found!\n\n';
  for (const [file, fileMatches] of grouped) {
    const relPath = path.relative(workingDir, file);
    output += `${relPath}\n`;
    for (const m of fileMatches) {
      output += `  Line ${m.line}: ${m.content.trim()}\n`;
    }
    output += '\n';
  }

  return { success: false, output };
}

/**
 * Recursively scans a directory for files containing TBD markers.
 *
 * @since TBD
 *
 * @param {string} dir - The directory to scan.
 * @param {string} workingDir - The working directory used for relative path calculations.
 * @param {string[]} skipDirs - Array of directory names to skip during scanning.
 * @param {string[]} skipFiles - Array of file extensions/patterns to skip during scanning.
 * @param {TbdMatch[]} matches - Array to accumulate TBD matches found during the scan.
 *
 * @returns {Promise<void>}
 */
async function scanDirectory(
  dir: string,
  workingDir: string,
  skipDirs: string[],
  skipFiles: string[],
  matches: TbdMatch[]
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.some((skip) => entry.name === skip)) continue;
      await scanDirectory(fullPath, workingDir, skipDirs, skipFiles, matches);
    } else if (entry.isFile()) {
      if (skipFiles.some((skip) => entry.name.endsWith(skip))) continue;
      await scanFile(fullPath, matches);
    }
  }
}

/**
 * Scans a single file for lines containing TBD markers.
 *
 * @since TBD
 *
 * @param {string} filePath - The full path to the file to scan.
 * @param {TbdMatch[]} matches - Array to accumulate TBD matches found in the file.
 *
 * @returns {Promise<void>}
 */
async function scanFile(filePath: string, matches: TbdMatch[]): Promise<void> {
  const contents = await fs.readFile(filePath, 'utf-8');
  const lines = contents.split('\n');

  const tbdPattern = /\btbd\b/i;

  for (let i = 0; i < lines.length; i++) {
    if (tbdPattern.test(lines[i])) {
      matches.push({
        file: filePath,
        line: i + 1,
        content: lines[i],
      });
    }
  }
}
