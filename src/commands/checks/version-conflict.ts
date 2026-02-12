import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import * as output from '../../utils/output.js';
import type { CheckResult, VersionFile } from '../../types.js';

/**
 * Checks that all configured version files contain the same version number.
 *
 * @since TBD
 *
 * @param {VersionFile[]} versionFiles - Array of version files to check with their regex patterns.
 * @param {string} workingDir - The working directory to resolve file paths relative to.
 *
 * @returns {Promise<CheckResult>} A CheckResult indicating success or failure with details about version conflicts.
 */
export async function executeVersionConflictCheck(
  versionFiles: VersionFile[],
  workingDir: string
): Promise<CheckResult> {
  output.section('Checking for version conflicts...');

  if (versionFiles.length === 0) {
    output.log(`${chalk.yellow('Skipping!')} There are no ${chalk.cyan('.paths.versions')} set in ${chalk.cyan('.puprc')}.`);
    return { success: true, output: '' };
  }

  const versions: Map<string, string[]> = new Map();
  const normalizedVersions: Map<string, string[]> = new Map();
  let foundProblem = false;

  for (const vf of versionFiles) {
    const filePath = path.resolve(workingDir, vf.file);
    const location = `${vf.file} :: ${vf.regex}`;

    let version = 'unknown';
    let normalizedVersion = 'unknown';

    if (!(await fs.pathExists(filePath))) {
      foundProblem = true;
    }

    if (!foundProblem) {
      const contents = await fs.readFile(filePath, 'utf-8');
      const regex = new RegExp(vf.regex);
      const matches = contents.match(regex);

      if (!matches || !matches[1] || !matches[2]) {
        foundProblem = true;
      } else {
        version = matches[2].trim();
        normalizedVersion = matches[2].trim();

        const parts = version.split('.');
        if (parts.length > 3) {
          normalizedVersion = parts.slice(0, 3).join('.');
        }
      }
    }

    if (!versions.has(version)) {
      versions.set(version, []);
    }
    versions.get(version)!.push(location);

    if (!normalizedVersions.has(normalizedVersion)) {
      normalizedVersions.set(normalizedVersion, []);
    }
    normalizedVersions.get(normalizedVersion)!.push(location);
  }

  if (normalizedVersions.size !== 1) {
    foundProblem = true;
    output.error('Found more than one version within the version files.');
  }

  if (foundProblem) {
    output.log('Versions found:');
    for (const [version, locations] of versions) {
      for (const location of locations) {
        output.log(` - ${version} in ${location}`);
      }
    }

    return { success: false, output: '' };
  }

  output.success('No version conflicts found.');
  return { success: true, output: '' };
}
