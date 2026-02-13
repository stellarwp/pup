import fs from 'fs-extra';
import path from 'node:path';
import { getDefaultsDir } from '../config.ts';

export interface SyncFileResult {
  patterns: string[];
}

/**
 * Reads patterns from a sync file.
 *
 * @since TBD
 *
 * @param {string} filePath - The path to the sync file to read.
 *
 * @returns {string[]} An array of glob patterns parsed from the file.
 */
function readPatterns(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];

  const contents = fs.readFileSync(filePath, 'utf-8');
  if (!contents) return [];

  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * Reads .gitattributes and extracts export-ignore patterns.
 *
 * @since TBD
 *
 * @param {string} filePath - The path to the .gitattributes file.
 *
 * @returns {string[]} An array of export-ignore patterns.
 */
function readGitAttributesPatterns(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];

  const contents = fs.readFileSync(filePath, 'utf-8');
  if (!contents || !contents.includes('export-ignore')) return [];

  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('export-ignore'))
    .map((line) => line.replace(/\s+export-ignore.*$/, '').trim())
    .filter((line) => line.length > 0);
}

/**
 * Gets all ignore patterns from .distignore, .gitattributes, and defaults.
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 * @param {boolean} useDefaultIgnore - Whether to include default ignore patterns.
 *
 * @returns {string[]} A deduplicated array of ignore patterns.
 */
export function getIgnorePatterns(
  root: string,
  useDefaultIgnore: boolean
): string[] {
  const patterns: string[] = [];

  // .distignore
  const distignorePath = path.join(root, '.distignore');
  patterns.push(...readPatterns(distignorePath));

  // .gitattributes export-ignore
  const gitattrsPath = path.join(root, '.gitattributes');
  patterns.push(...readGitAttributesPatterns(gitattrsPath));

  // Default ignores
  if (useDefaultIgnore) {
    const defaultIgnorePath = path.join(
      getDefaultsDir(),
      '.distignore-defaults'
    );
    patterns.push(...readPatterns(defaultIgnorePath));
  }

  return [...new Set(patterns)];
}

/**
 * Gets include patterns from .distinclude.
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 *
 * @returns {string[]} An array of include patterns.
 */
export function getIncludePatterns(root: string): string[] {
  const distincludePath = path.join(root, '.distinclude');
  return readPatterns(distincludePath);
}

/**
 * Gets whitelist patterns from .distfiles.
 * If .distfiles exists, only matched files are included.
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 *
 * @returns {string[] | null} An array of whitelist patterns, or null if .distfiles does not exist.
 */
export function getDistfilesPatterns(root: string): string[] | null {
  const distfilesPath = path.join(root, '.distfiles');
  if (!fs.existsSync(distfilesPath)) return null;
  return readPatterns(distfilesPath);
}

/**
 * Determines whether a file should be included in the package.
 *
 * @since TBD
 *
 * @param {string} relativePath - The relative path of the file to check.
 * @param {string[] | null} distfiles - Whitelist patterns from .distfiles, or null if not present.
 * @param {string[]} ignorePatterns - Ignore patterns from .distignore, .gitattributes, and defaults.
 * @param {string[]} includePatterns - Include patterns from .distinclude.
 * @param {(pattern: string, filePath: string) => boolean} matchFn - A function that tests whether a pattern matches a file path.
 *
 * @returns {boolean} True if the file should be included, false otherwise.
 */
export function shouldIncludeFile(
  relativePath: string,
  distfiles: string[] | null,
  ignorePatterns: string[],
  includePatterns: string[],
  matchFn: (pattern: string, filePath: string) => boolean
): boolean {
  // .distinclude overrides everything
  for (const pattern of includePatterns) {
    if (pattern.startsWith('!')) {
      if (matchFn(pattern.slice(1), relativePath)) return false;
    } else {
      if (matchFn(pattern, relativePath)) return true;
    }
  }

  // If .distfiles exists, only include matching files
  if (distfiles !== null) {
    let included = false;
    for (const pattern of distfiles) {
      if (pattern.startsWith('!')) {
        if (matchFn(pattern.slice(1), relativePath)) {
          included = false;
        }
      } else {
        if (matchFn(pattern, relativePath)) {
          included = true;
        }
      }
    }
    if (!included) return false;
  }

  // Check ignore patterns
  for (const pattern of ignorePatterns) {
    if (pattern.startsWith('!')) {
      // Negated: if matches, un-ignore
      if (matchFn(pattern.slice(1), relativePath)) return true;
    } else {
      if (matchFn(pattern, relativePath)) return false;
    }
  }

  return true;
}
