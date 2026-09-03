import type { VersionFile } from '../types.js';

/**
 * Creates a VersionFile object from a file path and regex pattern.
 *
 * @since TBD
 *
 * @param {string} file - The file path.
 * @param {string} regex - The regex pattern.
 *
 * @returns {VersionFile} A VersionFile object with the provided file path and regex pattern.
 */
export function createVersionFile(file: string, regex: string): VersionFile {
  return { file, regex };
}
