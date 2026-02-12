import fs from 'fs-extra';
import path from 'node:path';
import { getDefaultsDir } from '../config.js';
import type { Config } from '../config.js';

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
export function writePupFile(
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
  writePupFile(root, distfilesPaths, '.pup-distfiles', '.distfiles');

  // Build .pup-distinclude
  const distincludePaths = filterSyncFiles(allSyncFiles, '.distinclude');
  writePupFile(root, distincludePaths, '.pup-distinclude', '.distinclude');

  // Build .pup-distignore from .distignore sources
  const distignorePaths = filterSyncFiles(allSyncFiles, '.distignore');
  writePupFile(root, distignorePaths, '.pup-distignore', '.distignore');

  // Merge .gitattributes export-ignore patterns into .pup-distignore
  const gitattributesPaths = filterSyncFiles(allSyncFiles, '.gitattributes');
  writePupFile(
    root,
    gitattributesPaths,
    '.pup-distignore',
    '.gitattributes',
    extractExportIgnorePatterns
  );

  // Append .distignore-defaults if configured
  if (config.getZipUseDefaultIgnore()) {
    const defaultIgnorePath = path.join(defaultsDir, '.distignore-defaults');
    writePupFile(
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
 * Gets whitelist patterns from the generated .pup-distfiles file.
 * If .pup-distfiles exists, only matched files are included.
 * Must be called after buildSyncFiles().
 *
 * @since TBD
 *
 * @param {string} root - The project root directory path.
 *
 * @returns {string[] | null} An array of whitelist patterns, or null if .pup-distfiles does not exist.
 */
export function getDistfilesPatterns(root: string): string[] | null {
  const pupPath = path.join(root, '.pup-distfiles');
  if (!fs.existsSync(pupPath)) return null;
  return readPatterns(pupPath);
}
