import type { Command as CommanderCommand } from 'commander';
import { simpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'node:path';
import archiver from 'archiver';
import { getConfig, resetConfig } from '../config.js';
import { getVersion } from './get-version.js';
import { runCommand } from '../utils/process.js';
import { runChecks } from './check.js';
import { rmdir, trailingSlashIt } from '../utils/directory.js';
import { globToRegex } from '../utils/glob.js';
import {
  getIgnorePatterns,
  getIncludePatterns,
  getDistfilesPatterns,
} from '../filesystem/sync-files.js';
import * as output from '../utils/output.js';

interface ZipOptions {
  dev?: boolean;
  build: boolean;
  check: boolean;
  clone: boolean;
  clean: boolean;
  i18n: boolean;
  package: boolean;
}

/**
 * Registers the `zip` command. This orchestrates the full pipeline.
 *
 * @since TBD
 *
 * @param {CommanderCommand} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerZipCommand(program: CommanderCommand): void {
  program
    .command('zip [branch]')
    .description(
      'Run through the whole pup workflow with a resulting zip at the end.'
    )
    .option('--dev', 'Run the dev build commands.')
    .option('--no-build', "Don't run the build.")
    .option('--no-check', "Don't run the checks.")
    .option('--no-clone', "Don't clone the repo.")
    .option('--no-clean', "Don't clean up after packaging.")
    .option('--no-i18n', "Don't fetch language files.")
    .option('--no-package', "Don't run the packaging.")
    .action(async (branch: string | undefined, options: ZipOptions) => {
      const config = getConfig();

      // Step 1: Clone
      if (options.clone) {
        output.section('Cloning...');
        try {
          const repo = config.getRepo();
          const buildDir = config.getBuildDir();

          if (await fs.pathExists(buildDir)) {
            await fs.remove(buildDir);
          }

          const git = simpleGit();
          const cloneOptions = [
            '--quiet',
            '--recurse-submodules',
            '-j8',
            '--shallow-submodules',
            '--depth',
            '1',
          ];
          if (branch) {
            cloneOptions.push('--branch', branch);
          }
          await git.clone(repo, buildDir, cloneOptions);
          output.success('Clone complete.');
        } catch (err) {
          output.error(`The clone step of \`pup zip\` failed: ${err}`);
          process.exit(1);
        }
      } else if (branch) {
        await runCommand(`git checkout --quiet ${branch}`, { silent: true });
      }

      const rootDir = options.clone ? config.getBuildDir() : undefined;

      // Step 2: Build
      if (options.build) {
        output.section('Building...');
        const buildConfig = getConfig(rootDir);
        const buildSteps = buildConfig.getBuildCommands(options.dev);
        const cwd = rootDir ?? config.getWorkingDir();

        for (const step of buildSteps) {
          let cmd = step;
          let bailOnFailure = true;
          if (cmd.startsWith('@')) {
            bailOnFailure = false;
            cmd = cmd.slice(1);
          }

          output.log(`> ${cmd}`);
          const result = await runCommand(cmd, {
            cwd,
            envVarNames: config.getEnvVarNames(),
          });

          if (result.exitCode !== 0) {
            output.error(`[FAIL] Build step failed: ${cmd}`);
            if (bailOnFailure) {
              output.error('The build step of `pup zip` failed.');
              process.exit(result.exitCode);
            }
          }
        }
        output.success('Build complete.');
      }

      // Step 3: Check
      if (options.check) {
        const checks = config.getChecks();
        if (checks.size > 0) {
          output.section('Running checks...');
          const checkResult = await runChecks({
            dev: options.dev,
            root: rootDir,
          });
          if (checkResult !== 0) {
            process.exit(checkResult);
          }
          output.success('Checks complete.');
        }
      }

      // Step 4: I18n
      if (options.i18n) {
        const i18nConfigs = config.getI18n();
        if (i18nConfigs.length > 0) {
          output.section('Fetching translations...');
          // Import dynamically to avoid circular deps
          const { registerI18nCommand: _ } = await import('./i18n.js');
          // Run i18n inline - simplified
          output.log('i18n step: use `pup i18n` separately for full translation support.');
        }
      }

      // Step 5: Get Version
      const version = await getVersion({ dev: options.dev, root: rootDir });
      output.log(`Version: ${version}`);

      // Step 6: Package
      if (options.package) {
        output.section('Packaging...');
        const zipName = config.getZipName();
        const workingDir = config.getWorkingDir();

        let fullZipName: string;
        if (version && version !== 'unknown') {
          fullZipName = `${zipName}.${version}`;
        } else {
          fullZipName = zipName;
        }
        const zipFilename = `${fullZipName}.zip`;

        // Update version files
        if (version !== 'unknown') {
          const versionFiles = config.getVersionFiles();
          const prefix = rootDir ? trailingSlashIt(rootDir) : '';

          for (const vf of versionFiles) {
            const filePath = prefix
              ? path.join(prefix, vf.file)
              : path.resolve(workingDir, vf.file);
            let contents = fs.readFileSync(filePath, 'utf-8');
            const regex = new RegExp(vf.regex);
            contents = contents.replace(regex, `$1${version}`);
            fs.writeFileSync(filePath, contents);
          }
        }

        // Sync files
        const sourceDir = rootDir ?? workingDir;
        const zipDir = config.getZipDir();

        if (await fs.pathExists(zipDir)) {
          await rmdir(zipDir, workingDir);
        }
        await fs.mkdirp(zipDir);

        const distfiles = getDistfilesPatterns(sourceDir);
        const includePatterns = getIncludePatterns(sourceDir);

        let ignorePatterns: string[];
        const zipDirRelative = config.getZipDir(false);
        const defaultIgnore = ['.puprc', '.pup-*', zipDirRelative];

        if (distfiles !== null) {
          ignorePatterns = defaultIgnore;
        } else {
          ignorePatterns = [
            ...defaultIgnore,
            ...getIgnorePatterns(
              sourceDir,
              config.getZipUseDefaultIgnore()
            ),
          ];
        }

        // Migrate negated lines
        const allInclude = [...(distfiles ?? []), ...includePatterns];
        const finalInclude: string[] = [];
        const finalIgnore: string[] = [];

        for (const line of allInclude) {
          if (line.startsWith('!')) finalIgnore.push(line.slice(1));
          else finalInclude.push(line);
        }
        for (const line of ignorePatterns) {
          if (line.startsWith('!')) finalInclude.push(line.slice(1));
          else finalIgnore.push(line);
        }

        // Walk and sync files
        const files = await walkDir(sourceDir);
        for (const file of files) {
          const relativePath = path.relative(sourceDir, file);

          if (finalInclude.length > 0 && !isMatch(relativePath, finalInclude))
            continue;
          if (isMatch(relativePath, finalIgnore)) continue;

          const destPath = path.join(zipDir, relativePath);
          await fs.mkdirp(path.dirname(destPath));
          await fs.copy(file, destPath);
        }

        // Create zip
        await new Promise<void>((resolve, reject) => {
          const out = fs.createWriteStream(zipFilename);
          const archive = archiver('zip', { zlib: { level: 9 } });
          out.on('close', () => resolve());
          archive.on('error', (err: Error) => reject(err));
          archive.pipe(out);
          archive.directory(zipDir, zipName);
          archive.finalize();
        });

        // Undo version changes
        const versionFiles = config.getVersionFiles();
        for (const vf of versionFiles) {
          try {
            await runCommand(`git checkout -- ${vf.file}`, {
              cwd: workingDir,
              silent: true,
            });
          } catch {
            // Ignore
          }
        }

        output.success(`Zip ${zipFilename} created!`);
      }

      // Step 7: Clean
      if (options.clean) {
        output.section('Cleaning up...');
        const workingDir = config.getWorkingDir();
        const zipDir = config.getZipDir();
        const buildDir = config.getBuildDir();

        if (await fs.pathExists(zipDir)) {
          await rmdir(zipDir, workingDir);
        }
        if (await fs.pathExists(buildDir)) {
          await rmdir(buildDir, workingDir);
        }

        const pupFiles = [
          '.pup-distfiles',
          '.pup-distignore',
          '.pup-distinclude',
        ];
        for (const f of pupFiles) {
          const fp = path.join(workingDir, f);
          if (await fs.pathExists(fp)) await fs.remove(fp);
        }

        output.success('Clean complete.');
      }
    });
}

/**
 * Tests whether a file path matches any of the given glob patterns.
 *
 * @since TBD
 *
 * @param {string} filePath - The file path to test.
 * @param {string[]} patterns - An array of glob patterns to match against.
 *
 * @returns {boolean} True if the file matches any pattern, false otherwise.
 */
function isMatch(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (!pattern || pattern.startsWith('#') || pattern.trim() === '') continue;
    const regex = globToRegex(pattern);
    if (regex.test(filePath)) return true;
  }
  return false;
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
async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}
