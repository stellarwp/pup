/**
 * Port of PHP StellarWP\Pup\Utils\Glob::toRegex(). Converts a glob pattern to a regular expression.
 * Supports: **, *, ?, [...], !(...), +(...), *(...), ?(...), @(...) and POSIX classes.
 *
 * @since TBD
 *
 * @param {string} originalPattern - The glob pattern to convert.
 *
 * @returns {RegExp} The compiled regular expression.
 */
export function globToRegex(originalPattern: string): RegExp {
  let pattern = originalPattern.replace(/^\//, '');

  // Prevent escaping of desired patterns. Capture and adjust supported patterns.
  pattern = pattern.replaceAll('**/', '&glob;');
  pattern = pattern.replaceAll(']*', ']&squareast;');
  pattern = pattern.replaceAll('[:upper:]', '&posixupper;');
  pattern = pattern.replaceAll('[:lower:]', '&posixlower;');
  pattern = pattern.replaceAll('[:alpha:]', '&posixalpha;');
  pattern = pattern.replaceAll('[:digit:]', '&posixdigit;');
  pattern = pattern.replaceAll('[:xdigit:]', '&posixxdigit;');
  pattern = pattern.replaceAll('[:alnum:]', '&posixalnum;');
  pattern = pattern.replaceAll('[:blank:]', '&posixblank;');
  pattern = pattern.replaceAll('[:space:]', '&posixspace;');
  pattern = pattern.replaceAll('[:word:]', '&posixword;');
  pattern = pattern.replace(/\+\(([^)\/]+)\)/g, '($1)&pluscapture;');
  pattern = pattern.replace(/\*\(([^)\/]+)\)/g, '($1)&astcapture;');
  pattern = pattern.replace(/\?\(([^)\/]+)\)/g, '($1)&questcapture;');
  pattern = pattern.replace(/@\(([^)\/]+)\)/g, '($1)&atcapture;');
  pattern = pattern.replaceAll('?', '&question;');
  pattern = pattern.replaceAll('(', '&openparen;');
  pattern = pattern.replaceAll(')', '&closeparen;');
  pattern = pattern.replaceAll('[', '&openbracket;');
  pattern = pattern.replaceAll(']', '&closebracket;');
  pattern = pattern.replaceAll('|', '&pipe;');
  pattern = pattern.replaceAll('+', '&plus;');
  pattern = pattern.replaceAll('*', '&ast;');

  // Escape the regex
  pattern = escapeRegex(pattern);

  // Convert placeholders back into supported patterns.
  pattern = pattern.replaceAll('&glob;', '(.+\\/)?');
  pattern = pattern.replaceAll('&question;', '?');
  pattern = pattern.replaceAll('&openparen;', '(');
  pattern = pattern.replaceAll('&closeparen;', ')');
  pattern = pattern.replaceAll('&openbracket;', '[');
  pattern = pattern.replaceAll('&closebracket;', ']');
  pattern = pattern.replaceAll('&pipe;', '|');
  pattern = pattern.replaceAll('&plus;', '+');
  pattern = pattern.replaceAll('&pluscapture;', '+');
  pattern = pattern.replaceAll('&astcapture;', '*');
  pattern = pattern.replaceAll('&questcapture;', '?');
  pattern = pattern.replaceAll('&atcapture;', '{1}');
  pattern = pattern.replaceAll('&ast;', '[^\\/]*');
  pattern = pattern.replaceAll('&posixupper;', '[A-Z]');
  pattern = pattern.replaceAll('&posixlower;', '[a-z]');
  pattern = pattern.replaceAll('&posixalpha;', '[a-zA-Z]');
  pattern = pattern.replaceAll('&posixdigit;', '[\\d]');
  pattern = pattern.replaceAll('&posixxdigit;', '[\\dA-Fa-f]');
  pattern = pattern.replaceAll('&posixalnum;', '[a-zA-Z\\d]');
  pattern = pattern.replaceAll('&posixblank;', '[ \\t]');
  pattern = pattern.replaceAll('&posixspace;', '\\s');
  pattern = pattern.replaceAll('&posixword;', '\\w+');
  pattern = pattern.replaceAll('&squareast;', '*');

  // If the entry is tied to the beginning of the path, add the `^` regex symbol.
  if (originalPattern.startsWith('/')) {
    pattern = '^' + pattern;
  } else if (originalPattern.startsWith('.')) {
    pattern = '(^|\\/)' + pattern;
  }

  return new RegExp(pattern);
}

/**
 * Escapes special regex characters in a string.
 *
 * @since TBD
 *
 * @param {string} str - The string to escape.
 *
 * @returns {string} The escaped string safe for use in a regular expression.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\\/\-]/g, '\\$&');
}
