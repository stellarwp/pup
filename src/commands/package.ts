import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import archiver from 'archiver';
import { getConfig } from '../config.ts';
import { globToRegex } from '../utils/glob.ts';
import { rmdir, trailingSlashIt } from '../utils/directory.ts';
import {
  getIgnorePatterns,
  getIncludePatterns,
  getDistfilesPatterns,
} from '../filesystem/sync-files.ts';
import { runCommand } from '../utils/process.ts';
import * as output from '../utils/output.ts';

/**
 * Registers the `package` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerPackageCommand(program: Command): void {
  program
    .command('package <version>')
    .description('Packages the project for distribution.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(async (version: string, options: { root?: string }) => {
      const config = getConfig(options.root);
      const zipName = config.getZipName();
      const workingDir = config.getWorkingDir();

      output.section('Packaging zip...');

      // Build zip filename
      let fullZipName: string;
      if (version && version !== 'unknown') {
        fullZipName = `${zipName}.${version}`;
      } else {
        fullZipName = zipName;
      }
      const zipFilename = `${fullZipName}.zip`;

      // Update version files
      output.log('- Updating version files...');
      if (version !== 'unknown') {
        updateVersionsInFiles(version, config, options.root);
      }
      output.log('Updating version files...Complete.');

      // Sync files to zip directory
      output.log('- Synchronizing files to zip directory...');

      const sourceDir = getSourceDir(options.root, workingDir);
      const zipDir = config.getZipDir();

      // Clean zip dir
      if (await fs.pathExists(zipDir)) {
        await rmdir(zipDir, workingDir);
      }
      await fs.mkdirp(zipDir);

      // Get file patterns
      const distfiles = getDistfilesPatterns(sourceDir);
      if (distfiles !== null) {
        output.log(
          '>>> Your project has a .distfiles file, so .distignore and pup\'s default ignore rules will not be used.'
        );
      }

      const includePatterns = getIncludePatterns(sourceDir);

      // Only observe .distignore if there is no .distfiles
      let ignorePatterns: string[];
      if (distfiles !== null) {
        ignorePatterns = getDefaultIgnoreLines(config);
      } else {
        ignorePatterns = [
          ...getDefaultIgnoreLines(config),
          ...getIgnorePatterns(sourceDir, config.getZipUseDefaultIgnore()),
        ];
      }

      // Migrate negated lines
      const migrated = migrateNegatedLines(
        [...(distfiles ?? []), ...includePatterns],
        ignorePatterns
      );

      // Sync files
      await syncFiles(sourceDir, zipDir, migrated.include, migrated.ignore);
      output.log('Synchronizing files to zip directory...Complete.');

      // Create zip
      output.log('- Zipping...');
      await createZip(zipDir, zipFilename, zipName);
      output.log('Zipping...Complete.');

      // Undo version file changes
      undoChanges(config);

      output.success(`\nZip ${zipFilename} created!\n`);
    });
}

/**
 * Returns the default ignore patterns.
 *
 * @since TBD
 *
 * @param {ReturnType<typeof getConfig>} config - The resolved pup configuration.
 *
 * @returns {string[]} An array of default ignore glob patterns.
 */
function getDefaultIgnoreLines(
  config: ReturnType<typeof getConfig>
): string[] {
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
function getSourceDir(root: string | undefined, workingDir: string): string {
  if (!root || root === '.') {
    return workingDir;
  }

  if (root.includes(workingDir)) {
    return trailingSlashIt(root);
  }

  return trailingSlashIt(root);
}

/**
 * Tests whether a relative file path matches any of the given glob patterns.
 *
 * @since TBD
 *
 * @param {string} relativePath - The relative path of the file to test.
 * @param {string[]} rules - An array of glob patterns to match against.
 *
 * @returns {boolean} True if the file matches any pattern, false otherwise.
 */
function isFileInGroup(relativePath: string, rules: string[]): boolean {
  for (const entry of rules) {
    if (!entry || entry.startsWith('#') || entry.trim() === '') continue;

    const regex = globToRegex(entry);
    if (regex.test(relativePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Separates negated patterns into the opposite group.
 *
 * @since TBD
 *
 * @param {string[]} include - The include patterns (negated entries move to ignore).
 * @param {string[]} ignore - The ignore patterns (negated entries move to include).
 *
 * @returns {{ include: string[]; ignore: string[] }} The migrated include and ignore pattern arrays.
 */
function migrateNegatedLines(
  include: string[],
  ignore: string[]
): { include: string[]; ignore: string[] } {
  const finalInclude: string[] = [];
  const finalIgnore: string[] = [];

  for (const line of include) {
    if (line.startsWith('!')) {
      finalIgnore.push(line.slice(1));
    } else {
      finalInclude.push(line);
    }
  }

  for (const line of ignore) {
    if (line.startsWith('!')) {
      finalInclude.push(line.slice(1));
    } else {
      finalIgnore.push(line);
    }
  }

  return { include: finalInclude, ignore: finalIgnore };
}

/**
 * Copies files from source to destination, applying include and ignore rules.
 *
 * @since TBD
 *
 * @param {string} source - The source directory to copy files from.
 * @param {string} destination - The destination directory to copy files to.
 * @param {string[]} include - Glob patterns for files to include.
 * @param {string[]} ignore - Glob patterns for files to ignore.
 *
 * @returns {Promise<void>}
 */
async function syncFiles(
  source: string,
  destination: string,
  include: string[],
  ignore: string[]
): Promise<void> {
  const entries = await walkDirectory(source);

  for (const entry of entries) {
    const relativePath = path.relative(source, entry);

    // Check include rules
    if (include.length > 0 && !isFileInGroup(relativePath, include)) {
      continue;
    }

    // Check ignore rules
    if (isFileInGroup(relativePath, ignore)) {
      continue;
    }

    const destPath = path.join(destination, relativePath);
    await fs.mkdirp(path.dirname(destPath));
    await fs.copy(entry, destPath);
  }
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
 * Creates a zip archive from a directory.
 *
 * @since TBD
 *
 * @param {string} dirToZip - The directory whose contents will be archived.
 * @param {string} zipFilename - The output zip file name.
 * @param {string} rootDir - The root directory name inside the zip archive.
 *
 * @returns {Promise<void>}
 */
async function createZip(
  dirToZip: string,
  zipFilename: string,
  rootDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(zipFilename);
    const archive = archiver('zip', { zlib: { level: 9 } });

    outputStream.on('close', () => resolve());
    archive.on('error', (err: Error) => reject(err));

    archive.pipe(outputStream);

    // Add directory contents under the root dir name
    archive.directory(dirToZip, rootDir);

    archive.finalize();
  });
}

/**
 * Replaces version strings in configured version files.
 *
 * @since TBD
 *
 * @param {string} version - The version string to write into the files.
 * @param {ReturnType<typeof getConfig>} config - The resolved pup configuration.
 * @param {string} [root] - Optional root directory override for resolving file paths.
 *
 * @returns {void}
 */
function updateVersionsInFiles(
  version: string,
  config: ReturnType<typeof getConfig>,
  root?: string
): void {
  const versionFiles = config.getVersionFiles();
  const prefix = root ? trailingSlashIt(root) : '';

  for (const vf of versionFiles) {
    const filePath = prefix ? path.join(prefix, vf.file) : vf.file;
    let contents = fs.readFileSync(filePath, 'utf-8');
    const regex = new RegExp(vf.regex);
    contents = contents.replace(regex, `$1${version}`);
    fs.writeFileSync(filePath, contents);
  }
}

/**
 * Reverts version file changes using git checkout.
 *
 * @since TBD
 *
 * @param {ReturnType<typeof getConfig>} config - The resolved pup configuration.
 *
 * @returns {void}
 */
function undoChanges(config: ReturnType<typeof getConfig>): void {
  const versionFiles = config.getVersionFiles();
  for (const vf of versionFiles) {
    try {
      runCommand(`git checkout -- ${vf.file}`, {
        cwd: config.getWorkingDir(),
        silent: true,
      });
    } catch {
      // Ignore errors during undo
    }
  }
}
