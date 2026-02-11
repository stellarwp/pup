import path from 'node:path';
import fs from 'fs-extra';

/**
 * Normalizes a directory path by replacing backslashes with forward slashes.
 *
 * @since TBD
 *
 * @param {string} dir - The directory path to normalize.
 *
 * @returns {string} The normalized path with forward slashes.
 */
export function normalizeDir(dir: string): string {
  return dir.replace(/\\/g, '/');
}

/**
 * Ensures a path ends with a trailing forward slash.
 *
 * @since TBD
 *
 * @param {string} p - The path to ensure has a trailing slash.
 *
 * @returns {string} The path with a trailing forward slash.
 */
export function trailingSlashIt(p: string): string {
  if (p.endsWith('/')) {
    return p;
  }
  return p + '/';
}

/**
 * Removes a directory, but only if it is within the given working directory.
 *
 * @since TBD
 *
 * @param {string} dir - The directory path to remove.
 * @param {string} workingDir - The working directory that the target must be within.
 *
 * @returns {void}
 *
 * @throws {Error} If the directory is outside the working directory.
 */
export async function rmdir(dir: string, workingDir: string): Promise<void> {
  const normalized = normalizeDir(dir);
  const normalizedWorking = normalizeDir(workingDir);

  // Safety check: only remove directories within the working directory
  if (!normalized.startsWith(normalizedWorking)) {
    throw new Error(
      `Refusing to remove directory outside working directory: ${dir}`
    );
  }

  if (await fs.pathExists(dir)) {
    await fs.remove(dir);
  }
}

/**
 * Resolves a relative path against a working directory.
 * Strips any existing prefix and rejects absolute paths unless a default is provided.
 *
 * @since TBD
 *
 * @param {string} relativePath - The relative path to resolve.
 * @param {string} workingDir - The working directory to resolve against.
 * @param {string} [defaultPath] - Optional default path to use if an absolute path is given.
 *
 * @returns {string} The resolved absolute path.
 *
 * @throws {Error} If an absolute path is given without a default fallback.
 */
export function resolveRelativePath(
  relativePath: string,
  workingDir: string,
  defaultPath?: string
): string {
  const prefix = trailingSlashIt(workingDir);
  let normalized = normalizeDir(relativePath);

  // Strip the prefix if it's already there
  normalized = normalized.replace(prefix, '');

  // Don't allow absolute paths
  if (normalized.startsWith('/')) {
    if (defaultPath) {
      return path.join(prefix, defaultPath);
    }
    throw new Error('Absolute paths are not allowed in the .puprc file.');
  }

  return path.join(prefix, normalized);
}
