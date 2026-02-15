import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import archiver from 'archiver';
import { getConfig } from '../config.ts';
import { rmdir, trailingSlashIt } from '../utils/directory.ts';
import {
  resolveFilePatterns,
  getSourceDir,
  syncFiles,
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
    .option('--root <dir>', 'Override the source directory used for syncing files and resolving version file paths.')
    .action(async (version: string, options: { root?: string }) => {
      const config = getConfig();
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

      // Resolve file patterns
      const { distfiles, ignorePatterns, includePatterns } = resolveFilePatterns(sourceDir, config);
      if (distfiles !== null) {
        output.log(
          '>>> Your project has a .distfiles file, so .distignore will not be used.'
        );
      }

      // Sync files
      await syncFiles(sourceDir, zipDir, distfiles, ignorePatterns, includePatterns);
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
