import fs from 'fs-extra';
import path from 'node:path';
import { getDefaultsDir } from '../config.ts';
import type { Config } from '../config.ts';
import { isGlobMatch } from '../utils/glob.ts';
import { trailingSlashIt } from '../utils/directory.ts';

/**
 * The generated .pup-* filenames.
 *
 * @since TBD
 */
const PUP_FILES = ['.pup-distfiles', '.pup-distinclude', '.pup-distignore'];

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
 * Filters the config sync files list to entries containing the given filename.
 *
 * @since TBD
 *
 * @param {string[]} syncFiles - The full list of sync file paths from config.
 * @param {string} filename - The filename to filter for (e.g., '.distfiles').
 *
 * @returns {string[]} Filtered list of sync file paths containing the filename.
 */
export function filterSyncFiles(
  syncFiles: string[],
  filename: string
): string[] {
  return syncFiles.filter((f) => f.includes(filename));
}

/**
 * Transforms .gitattributes content to extract only export-ignore patterns.
 *
 * @since TBD
 *
 * @param {string} contents - The raw .gitattributes file content.
 *
 * @returns {string} Newline-separated export-ignore patterns, or empty string if none found.
 */
export function extractExportIgnorePatterns(contents: string): string {
  if (!contents || !contents.includes('export-ignore')) return '';

  const lines = contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('export-ignore'))
    .map((line) => line.replace(/\s+export-ignore.*$/, '').trim())
    .filter((line) => line.length > 0);

  return lines.join('\n');
}

/**
 * Resolves, reads, and optionally transforms a sync file's content, appending
 * it to the target .pup-* file. Handles subdirectory path prefixing for files
 * specified via paths.sync_files config.
 *
 * @since TBD
 *
 * @param {string} root - The project root directory.
 * @param {string[]} filePaths - The list of sync file paths to process.
 * @param {string} targetFile - The target .pup-* filename (e.g., '.pup-distfiles').
 * @param {string} sourceFilename - The base source filename (e.g., '.distfiles').
 * @param {((content: string) => string) | null} transformFn - Optional content transformer.
 *
 * @returns {void}
 */
export function writeSyncFile(
  root: string,
  filePaths: string[],
  targetFile: string,
  sourceFilename: string,
  transformFn: ((content: string) => string) | null = null
): void {
  const targetPath = path.join(root, targetFile);

  for (const file of filePaths) {
    let contents: string;
    let isDefault = false;

    // Try root + file first
    const rootPath = path.join(root, file);
    if (fs.existsSync(rootPath)) {
      contents = fs.readFileSync(rootPath, 'utf-8');
    } else if (fs.existsSync(file)) {
      // Absolute path (e.g., PUP defaults directory)
      contents = fs.readFileSync(file, 'utf-8');
      isDefault = true;
    } else {
      continue;
    }

    // Apply transform (e.g., gitattributes export-ignore extraction)
    if (transformFn) {
      contents = transformFn(contents);
    }
    if (!contents) continue;

    // Root-level files or defaults: raw append
    if (!file.includes('/') || isDefault) {
      fs.appendFileSync(targetPath, contents + '\n');
      continue;
    }

    // Subdirectory files: prefix each line with the directory path
    const lines = contents
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const uniqueLines = [...new Set(lines)];
    const relativePath = file.replace('/' + sourceFilename, '');

    for (const line of uniqueLines) {
      const prefixed = line.startsWith('/')
        ? relativePath + line
        : relativePath + '/' + line;
      fs.appendFileSync(targetPath, prefixed + '\n');
    }
  }
}

/**
 * Generates .pup-distfiles, .pup-distinclude, and .pup-distignore in the
 * project root by aggregating content from all configured sync file sources.
 *
 * @since TBD
 *
 * @param {string} root - The project root directory.
 * @param {Config} config - The resolved pup configuration instance.
 *
 * @returns {void}
 */
export function buildSyncFiles(root: string, config: Config): void {
  const allSyncFiles = config.getSyncFiles();
  const defaultsDir = getDefaultsDir();

  // Clean existing .pup-* files
  for (const pupFile of PUP_FILES) {
    const pupPath = path.join(root, pupFile);
    if (fs.existsSync(pupPath)) {
      fs.removeSync(pupPath);
    }
  }

  // Build .pup-distfiles
  const distfilesPaths = filterSyncFiles(allSyncFiles, '.distfiles');
  writeSyncFile(root, distfilesPaths, '.pup-distfiles', '.distfiles');

  // Build .pup-distinclude
  const distincludePaths = filterSyncFiles(allSyncFiles, '.distinclude');
  writeSyncFile(root, distincludePaths, '.pup-distinclude', '.distinclude');

  // Build .pup-distignore from .distignore sources
  const distignorePaths = filterSyncFiles(allSyncFiles, '.distignore');
  writeSyncFile(root, distignorePaths, '.pup-distignore', '.distignore');

  // Merge .gitattributes export-ignore patterns into .pup-distignore
  const gitattributesPaths = filterSyncFiles(allSyncFiles, '.gitattributes');
  writeSyncFile(
    root,
    gitattributesPaths,
    '.pup-distignore',
    '.gitattributes',
    extractExportIgnorePatterns
  );

  // Append .distignore-defaults if configured
  if (config.getZipUseDefaultIgnore()) {
    const defaultIgnorePath = path.join(defaultsDir, '.distignore-defaults');
    writeSyncFile(
      root,
      [defaultIgnorePath],
      '.pup-distignore',
      '.distignore-defaults'
    );
  }
}

/**
 * Removes generated .pup-* sync files from the project root.
 *
 * @since TBD
 *
 * @param {string} root - The project root directory.
 *
 * @returns {void}
 */
export function cleanSyncFiles(root: string): void {
  for (const pupFile of PUP_FILES) {
    const pupPath = path.join(root, pupFile);
    if (fs.existsSync(pupPath)) {
      fs.removeSync(pupPath);
    }
  }
}

/**
 * Gets all ignore patterns from the generated .pup-distignore file.
 * Must be called after buildSyncFiles().
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 *
 * @returns {string[]} A deduplicated array of ignore patterns.
 */
export function getIgnorePatterns(root: string): string[] {
  const pupPath = path.join(root, '.pup-distignore');
  return [...new Set(readPatterns(pupPath))];
}

/**
 * Gets include patterns from the generated .pup-distinclude file.
 * Must be called after buildSyncFiles().
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 *
 * @returns {string[]} An array of include patterns.
 */
export function getIncludePatterns(root: string): string[] {
  const pupPath = path.join(root, '.pup-distinclude');
  return readPatterns(pupPath);
}

/**
 * Gets allowlist patterns from the generated .pup-distfiles file.
 * If .pup-distfiles exists, only matched files are included.
 * Must be called after buildSyncFiles().
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 *
 * @returns {string[] | null} An array of allowlist patterns, or null if .pup-distfiles does not exist.
 */
export function getDistfilesPatterns(root: string): string[] | null {
  const pupPath = path.join(root, '.pup-distfiles');
  if (!fs.existsSync(pupPath)) return null;
  return readPatterns(pupPath);
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
 * Resolves all file patterns needed for syncing based on the source directory and config.
 *
 * Generates .pup-* intermediate files via buildSyncFiles(), then reads the
 * resolved patterns. When `.distfiles` is present, `.distignore` is not
 * used — only default ignore patterns apply. Otherwise, `.distignore`,
 * `.gitattributes` export-ignore, and default ignore patterns are all used.
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
  buildSyncFiles(sourceDir, config);

  const distfiles = getDistfilesPatterns(sourceDir);
  const includePatterns = getIncludePatterns(sourceDir);

  let ignorePatterns: string[];
  if (distfiles !== null) {
    ignorePatterns = getDefaultIgnoreLines(config);
  } else {
    ignorePatterns = [
      ...getDefaultIgnoreLines(config),
      ...getIgnorePatterns(sourceDir),
    ];
  }

  return { distfiles, ignorePatterns, includePatterns };
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
