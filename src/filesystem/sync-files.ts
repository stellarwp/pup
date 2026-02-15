import fs from 'fs-extra';
import path from 'node:path';
import { getDefaultsDir } from '../config.ts';
import type { Config } from '../config.ts';
import { isGlobMatch } from '../utils/glob.ts';
import { trailingSlashIt } from '../utils/directory.ts';

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
function getIgnorePatterns(
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
function getIncludePatterns(root: string): string[] {
  const distincludePath = path.join(root, '.distinclude');
  return readPatterns(distincludePath);
}

/**
 * Gets allowlist patterns from .distfiles.
 * If .distfiles exists, only matched files are included.
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 *
 * @returns {string[] | null} An array of allowlist patterns, or null if .distfiles does not exist.
 */
function getDistfilesPatterns(root: string): string[] | null {
  const distfilesPath = path.join(root, '.distfiles');
  if (!fs.existsSync(distfilesPath)) return null;
  return readPatterns(distfilesPath);
}

/**
 * Determines whether a file should be included in the package.
 *
 * Distfiles and distinclude patterns are merged into a single allowlist.
 * Negated patterns (`!pattern`) in the include list are moved to the ignore
 * list, and vice versa. A file must pass both the include allowlist (if
 * non-empty) and the ignore check to be included.
 *
 * @since TBD
 *
 * @param {string} relativePath - The relative path of the file to check.
 * @param {string[] | null} distfiles - Allowlist patterns from .distfiles, or null if not present.
 * @param {string[]} ignorePatterns - Ignore patterns from .distignore, .gitattributes, and defaults.
 * @param {string[]} includePatterns - Include patterns from .distinclude.
 * @param {(filePath: string, pattern: string) => boolean} matchFn - A function that tests whether a file path matches a pattern.
 *
 * @returns {boolean} True if the file should be included, false otherwise.
 */
function shouldIncludeFile(
  relativePath: string,
  distfiles: string[] | null,
  ignorePatterns: string[],
  includePatterns: string[],
  matchFn: (filePath: string, pattern: string) => boolean
): boolean {
  const allInclude = [...(distfiles ?? []), ...includePatterns];

  // Migrate negated lines between include and ignore
  const effectiveInclude: string[] = [];
  const effectiveIgnore: string[] = [];

  for (const line of allInclude) {
    if (line.startsWith('!')) {
      effectiveIgnore.push(line.slice(1));
    } else {
      effectiveInclude.push(line);
    }
  }

  for (const line of ignorePatterns) {
    if (line.startsWith('!')) {
      effectiveInclude.push(line.slice(1));
    } else {
      effectiveIgnore.push(line);
    }
  }

  // Include allowlist: if non-empty, file must match at least one pattern
  if (effectiveInclude.length > 0) {
    let matched = false;
    for (const pattern of effectiveInclude) {
      if (pattern && !pattern.startsWith('#') && pattern.trim() !== '') {
        if (matchFn(relativePath, pattern)) {
          matched = true;
          break;
        }
      }
    }
    if (!matched) return false;
  }

  // Ignore check: if file matches any ignore pattern, exclude it
  for (const pattern of effectiveIgnore) {
    if (pattern && !pattern.startsWith('#') && pattern.trim() !== '') {
      if (matchFn(relativePath, pattern)) return false;
    }
  }

  return true;
}

/**
 * Resolves all file patterns needed for syncing based on the source directory and config.
 *
 * When `.distfiles` is present, `.distignore` is not used — only default
 * ignore patterns apply. Otherwise, `.distignore`, `.gitattributes`
 * export-ignore, and default ignore patterns are all used.
 *
 * @since TBD
 *
 * @param {string} sourceDir - The source directory to resolve patterns from.
 * @param {Config} config - The resolved pup configuration.
 *
 * @returns {{ distfiles: string[] | null; ignorePatterns: string[]; includePatterns: string[] }}
 */
export function resolveFilePatterns(
  sourceDir: string,
  config: Config
): { distfiles: string[] | null; ignorePatterns: string[]; includePatterns: string[] } {
  const distfiles = getDistfilesPatterns(sourceDir);
  const includePatterns = getIncludePatterns(sourceDir);

  let ignorePatterns: string[];
  if (distfiles !== null) {
    ignorePatterns = getDefaultIgnoreLines(config);
  } else {
    ignorePatterns = [
      ...getDefaultIgnoreLines(config),
      ...getIgnorePatterns(sourceDir, config.getZipUseDefaultIgnore()),
    ];
  }

  return { distfiles, ignorePatterns, includePatterns };
}

/**
 * Returns the default ignore patterns.
 *
 * @since TBD
 *
 * @param {Config} config - The resolved pup configuration.
 *
 * @returns {string[]} An array of default ignore glob patterns.
 */
function getDefaultIgnoreLines(config: Config): string[] {
  const zipDirRelative = config.getZipDir(false);
  return ['.puprc', '.pup-*', zipDirRelative];
}

/**
 * Determines the source directory for file syncing.
 *
 * @since TBD
 *
 * @param {string | undefined} root - The root directory override, if provided.
 * @param {string} workingDir - The default working directory.
 *
 * @returns {string} The resolved source directory path.
 */
export function getSourceDir(root: string | undefined, workingDir: string): string {
  if (!root || root === '.') {
    return workingDir;
  }

  if (root.includes(workingDir)) {
    return trailingSlashIt(root);
  }

  return trailingSlashIt(root);
}

/**
 * Recursively lists all files in a directory.
 *
 * @since TBD
 *
 * @param {string} dir - The directory to walk.
 *
 * @returns {Promise<string[]>} An array of absolute file paths.
 */
async function walkDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Copies files from source to destination, applying include, ignore, and distfiles rules.
 *
 * @since TBD
 *
 * @param {string} source - The source directory to copy files from.
 * @param {string} destination - The destination directory to copy files to.
 * @param {string[] | null} distfiles - Allowlist patterns from .distfiles, or null if not present.
 * @param {string[]} ignorePatterns - Glob patterns for files to ignore.
 * @param {string[]} includePatterns - Glob patterns for files to include.
 *
 * @returns {Promise<void>}
 */
export async function syncFiles(
  source: string,
  destination: string,
  distfiles: string[] | null,
  ignorePatterns: string[],
  includePatterns: string[]
): Promise<void> {
  const entries = await walkDirectory(source);

  for (const entry of entries) {
    const relativePath = path.relative(source, entry);

    if (!shouldIncludeFile(relativePath, distfiles, ignorePatterns, includePatterns, isGlobMatch)) {
      continue;
    }

    const destPath = path.join(destination, relativePath);
    await fs.mkdirp(path.dirname(destPath));
    await fs.copy(entry, destPath);
  }
}
