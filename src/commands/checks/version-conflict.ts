import fs from 'fs-extra';
import path from 'node:path';
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
  if (versionFiles.length === 0) {
    return { success: true, output: 'No version files configured.' };
  }

  const versions: { file: string; version: string; regex: string }[] = [];

  for (const vf of versionFiles) {
    const filePath = path.resolve(workingDir, vf.file);
    if (!(await fs.pathExists(filePath))) {
      return {
        success: false,
        output: `Version file not found: ${vf.file}`,
      };
    }

    const contents = await fs.readFile(filePath, 'utf-8');
    const regex = new RegExp(vf.regex);
    const matches = contents.match(regex);

    if (!matches || !matches[2]) {
      return {
        success: false,
        output: `Could not extract version from ${vf.file} using regex /${vf.regex}/`,
      };
    }

    versions.push({ file: vf.file, version: matches[2], regex: vf.regex });
  }

  // Normalize versions for comparison (package.json only supports major.minor.patch)
  const normalizedVersions = versions.map((v) => {
    const parts = v.version.split('.');
    // Reduce to first 3 parts for comparison
    const normalized = parts.slice(0, 3).join('.');
    return { ...v, normalized };
  });

  const uniqueVersions = new Set(normalizedVersions.map((v) => v.normalized));

  if (uniqueVersions.size <= 1) {
    return { success: true, output: 'No version conflicts found.' };
  }

  let output = 'Version conflicts found!\n\n';
  for (const v of normalizedVersions) {
    output += `  ${v.file}: ${v.version} (regex: /${v.regex}/)\n`;
  }

  return { success: false, output };
}
