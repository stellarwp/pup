import picomatch from 'picomatch';

/**
 * Tests whether a file path matches a glob pattern using picomatch.
 *
 * Normalizes trailing-slash directory patterns (e.g. `src/`) to match
 * their contents (`src/**`). A leading `/` anchors the pattern to the
 * root so `/license.txt` matches only `license.txt`, not `src/license.txt`.
 * Patterns without slashes use basename matching so that `*.php` matches
 * `src/Plugin.php`.
 *
 * @since TBD
 *
 * @param {string} filePath - The file path to test.
 * @param {string} pattern - The glob pattern to match against.
 *
 * @returns {boolean} True if the file path matches the pattern.
 */
export function isGlobMatch(filePath: string, pattern: string): boolean {
  let normalized = pattern;

  // Leading `/` anchors to root — strip it and force full-path matching.
  let anchored = false;
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
    anchored = true;
  }

  if (normalized.endsWith('/')) {
    normalized += '**';
  }

  return picomatch.isMatch(filePath, normalized, {
    dot: true,
    matchBase: !anchored && !normalized.includes('/'),
    posix: true,
  });
}
