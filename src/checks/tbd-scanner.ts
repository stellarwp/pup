import fs from 'fs-extra';
import path from 'node:path';
import type { CheckConfig } from '../types.ts';

/**
 * Directories skipped when no `skip_directories` is configured.
 *
 * @since TBD
 */
export const DEFAULT_SKIP_DIRS =
  'bin|build|vendor|node_modules|.git|.github|tests';

/**
 * File patterns skipped when no `skip_files` is configured.
 *
 * @since TBD
 */
export const DEFAULT_SKIP_FILES =
  '.min.css|.min.js|.map.js|.css|.png|.jpg|.jpeg|.svg|.gif|.ico';

/**
 * Directories scanned when no `dirs` is configured.
 *
 * @since TBD
 */
export const DEFAULT_DIRS = ['src'];

export interface TbdScannerOptions {
  /**
   * Directories to scan, relative to the working directory.
   */
  dirs: string[];

  /**
   * Directory names to skip.
   */
  skipDirs: string[];

  /**
   * File suffixes to skip.
   */
  skipFiles: string[];
}

/**
 * The TBD placeholders this module recognizes, paired with how each one is
 * rewritten. Detection and replacement both derive from this list, so
 * `check:tbd` flags exactly the placeholders `replace-tbd` can resolve.
 *
 * Patterns are deliberately non-global: a global regex carries `lastIndex`
 * state between `test()` calls and would report alternating results when
 * reused across lines. Global copies are built on demand for replacement.
 *
 * @since TBD
 */
const REPLACEMENTS: ReadonlyArray<{
  pattern: RegExp;
  build: (captured: string, version: string) => string;
}> = [
  {
    // Docblock tag value: @since / @deprecated / @version followed by TBD.
    pattern: /(@(?:since|deprecated|version)\s+)tbd\b/i,
    build: (captured, version) => `${captured}${version}`,
  },
  {
    // Quoted placeholder, e.g. _deprecated_function( __METHOD__, 'TBD' ).
    pattern: /(['"])tbd\1/i,
    build: (quote, version) => `${quote}${version}${quote}`,
  },
];

/**
 * Builds scanner options from a check configuration, falling back to defaults.
 *
 * @since TBD
 *
 * @param {CheckConfig} config - The tbd check configuration, if any.
 *
 * @returns {TbdScannerOptions} The resolved scanner options.
 */
export function scannerOptionsFromConfig(
  config?: CheckConfig
): TbdScannerOptions {
  return {
    dirs: config?.dirs ?? DEFAULT_DIRS,
    skipDirs: (config?.skip_directories ?? DEFAULT_SKIP_DIRS).split('|'),
    skipFiles: (config?.skip_files ?? DEFAULT_SKIP_FILES).split('|'),
  };
}

/**
 * Reports whether a line contains a TBD version placeholder.
 *
 * @since TBD
 *
 * @param {string} line - The line to inspect.
 *
 * @returns {boolean} True when the line contains a placeholder.
 */
export function lineMatches(line: string): boolean {
  return REPLACEMENTS.some(({ pattern }) => pattern.test(line));
}

/**
 * Replaces every TBD version placeholder on a line with the given version.
 *
 * Only placeholders are rewritten. A `tbd` appearing elsewhere on the line, such
 * as a word in prose, is left intact.
 *
 * @since TBD
 *
 * @param {string} line - The line to process.
 * @param {string} version - The version to write in place of each placeholder.
 *
 * @returns {{ line: string; count: number }} The processed line and how many replacements were made.
 */
export function replaceInLine(
  line: string,
  version: string
): { line: string; count: number } {
  let result = line;
  let count = 0;

  for (const { pattern, build } of REPLACEMENTS) {
    const globalPattern = new RegExp(pattern.source, `${pattern.flags}g`);

    // A function replacer writes the version literally, so a version containing
    // $1 or $& is not expanded as a backreference.
    result = result.replace(globalPattern, (_match: string, captured: string) => {
      count++;
      return build(captured, version);
    });
  }

  return { line: result, count };
}

/**
 * Yields every eligible file under the configured directories.
 *
 * @since TBD
 *
 * @param {string} cwd - The working directory the configured dirs are relative to.
 * @param {TbdScannerOptions} options - The resolved scanner options.
 *
 * @returns {AsyncGenerator<string>} Absolute paths of the files to inspect.
 */
export async function* walkConfiguredDirs(
  cwd: string,
  options: TbdScannerOptions
): AsyncGenerator<string> {
  for (const dir of options.dirs) {
    const dirPath = path.resolve(cwd, dir);

    if (!(await fs.pathExists(dirPath))) {
      continue;
    }

    yield* walkDir(dirPath, options);
  }
}

/**
 * Recursively yields eligible files beneath a directory.
 *
 * @since TBD
 *
 * @param {string} dir - The directory to walk.
 * @param {TbdScannerOptions} options - The resolved scanner options.
 *
 * @returns {AsyncGenerator<string>} Absolute paths of the files to inspect.
 */
async function* walkDir(
  dir: string,
  options: TbdScannerOptions
): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (options.skipDirs.some((skip) => entry.name === skip)) continue;
      yield* walkDir(fullPath, options);
    } else if (entry.isFile()) {
      if (options.skipFiles.some((skip) => entry.name.endsWith(skip))) continue;
      if (entry.name.startsWith('.pup-') || entry.name === '.puprc') continue;
      yield fullPath;
    }
  }
}
