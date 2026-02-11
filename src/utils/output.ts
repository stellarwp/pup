import chalk from 'chalk';

let prefix = '';

/**
 * Sets a prefix string that will be prepended to all output messages.
 *
 * @since TBD
 *
 * @param {string} p - The prefix string.
 *
 * @returns {void}
 */
export function setPrefix(p: string): void {
  prefix = p;
}

/**
 * Returns the current output prefix.
 *
 * @since TBD
 *
 * @returns {string} The current prefix string.
 */
export function getPrefix(): string {
  return prefix;
}

/**
 * Formats a message with the current prefix, if one is set.
 *
 * @since TBD
 *
 * @param {string} message - The message to format.
 *
 * @returns {string} The formatted message with prefix prepended if set.
 */
function formatMessage(message: string): string {
  if (prefix) {
    return `[${prefix}] ${message}`;
  }
  return message;
}

/**
 * Prints a green success message to stdout.
 *
 * @since TBD
 *
 * @param {string} message - The success message to display.
 *
 * @returns {void}
 */
export function success(message: string): void {
  console.log(formatMessage(chalk.green(message)));
}

/**
 * Prints a red error message to stderr.
 *
 * @since TBD
 *
 * @param {string} message - The error message to display.
 *
 * @returns {void}
 */
export function error(message: string): void {
  console.error(formatMessage(chalk.red(message)));
}

/**
 * Prints a yellow warning message to stdout.
 *
 * @since TBD
 *
 * @param {string} message - The warning message to display.
 *
 * @returns {void}
 */
export function warning(message: string): void {
  console.log(formatMessage(chalk.yellow(message)));
}

/**
 * Prints a blue informational message to stdout.
 *
 * @since TBD
 *
 * @param {string} message - The informational message to display.
 *
 * @returns {void}
 */
export function info(message: string): void {
  console.log(formatMessage(chalk.blue(message)));
}

/**
 * Prints a bold title with an underline rule.
 *
 * @since TBD
 *
 * @param {string} message - The title text to display.
 *
 * @returns {void}
 */
export function title(message: string): void {
  console.log('');
  console.log(formatMessage(chalk.bold(message)));
  console.log(formatMessage(chalk.bold('='.repeat(message.length))));
  console.log('');
}

/**
 * Prints a bold yellow section header.
 *
 * @since TBD
 *
 * @param {string} message - The section header text to display.
 *
 * @returns {void}
 */
export function section(message: string): void {
  console.log('');
  console.log(formatMessage(chalk.bold.yellow(message)));
  console.log(formatMessage(chalk.bold.yellow('-'.repeat(message.length))));
  console.log('');
}

/**
 * Prints a plain message to stdout with the current prefix.
 *
 * @since TBD
 *
 * @param {string} message - The message to print.
 *
 * @returns {void}
 */
export function log(message: string): void {
  console.log(formatMessage(message));
}

/**
 * Prints a message to stdout without any prefix.
 *
 * @since TBD
 *
 * @param {string} message - The message to print.
 *
 * @returns {void}
 */
export function writeln(message: string): void {
  console.log(message);
}

/**
 * Prints an empty line to stdout.
 *
 * @since TBD
 *
 * @returns {void}
 */
export function newline(): void {
  console.log('');
}

/**
 * Strips ANSI escape codes from a string for accurate length calculation.
 *
 * @since TBD
 *
 * @param {string} str - The string potentially containing ANSI codes.
 *
 * @returns {string} The string with ANSI codes removed.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Renders a formatted ASCII table to stdout.
 *
 * @since TBD
 *
 * @param {string[]} headers - Column header labels.
 * @param {string[][]} rows - Array of row data, each row being an array of cell strings.
 *
 * @returns {void}
 */
export function table(headers: string[], rows: string[][]): void {
  const colWidths: number[] = headers.map((h) => stripAnsi(h).length);

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const len = stripAnsi(row[i] || '').length;
      if (len > (colWidths[i] || 0)) {
        colWidths[i] = len;
      }
    }
  }

  const separator = '|' + colWidths.map((w) => '-'.repeat(w + 2)).join('|') + '|';
  const formatRow = (cells: string[]): string => {
    return '| ' + cells.map((cell, i) => {
      const padding = (colWidths[i] || 0) - stripAnsi(cell || '').length;
      return (cell || '') + ' '.repeat(Math.max(0, padding));
    }).join(' | ') + ' |';
  };

  console.log(formatRow(headers));
  console.log(separator);
  for (const row of rows) {
    console.log(formatRow(row));
  }
}
