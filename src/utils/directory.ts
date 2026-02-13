import path from 'node:path';
import fs from 'fs-extra';

/**
 * Checks whether a child directory is inside a parent directory.
 *
 * @since TBD
 *
 * @param {string} parentDir - The parent directory path.
 * @param {string} childDir - The child directory path.
 *
 * @returns {boolean} True if childDir is inside parentDir.
 */
export function isInside(parentDir: string, childDir: string): boolean {
  const relative = path.relative(parentDir, childDir);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Ensures a directory path ends with a trailing separator.
 *
 * @since TBD
 *
 * @param {string} p - The path to ensure has a trailing separator.
 *
 * @returns {string} The path with a trailing separator.
 *
 * @throws {Error} If the path appears to be a file (has an extension).
 */
export function trailingSlashIt(p: string): string {
  const { dir, base, ext } = path.parse(p);

  if (ext.length > 0) {
    throw new Error('Could not add trailing slash to file path.');
  }

  return path.join(dir, base, path.sep);
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
  const relative = path.relative(workingDir, dir);
  const inside = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  // Safety check: only remove directories within the working directory
  if (!inside) {
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
 * Rejects absolute paths unless a default is provided.
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
  if (path.isAbsolute(relativePath)) {
    if (!defaultPath) {
      throw new Error('Absolute paths are not allowed in the .puprc file.');
    }

    relativePath = defaultPath;
  }

  if (isInside(workingDir, relativePath)) {
    return relativePath;
  }

  return path.join(workingDir, relativePath);
}
