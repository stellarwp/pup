import { execa } from 'execa';
import type { RunCommandResult } from '../types.ts';

export interface RunOptions {
  cwd?: string;
  softFail?: boolean;
  silent?: boolean;
}

/**
 * Runs a shell command, streaming output to console.
 * Commands prefixed with `@` are treated as soft-fail (errors are ignored).
 *
 * @since TBD
 *
 * @param {string} command - The shell command to execute.
 * @param {RunOptions} options - Optional configuration for the command execution.
 *
 * @returns {Promise<RunCommandResult>} The command result with stdout, stderr, and exit code.
 */
export async function runCommand(
  command: string,
  options: RunOptions = {}
): Promise<RunCommandResult> {
  let cmd = command;
  let softFail = options.softFail ?? false;

  // Handle @ prefix for soft-fail
  if (cmd.startsWith('@')) {
    cmd = cmd.slice(1);
    softFail = true;
  }

  try {
    const result = await execa(cmd, {
      cwd: options.cwd,
      shell: true,
      stdout: options.silent ? 'pipe' : 'inherit',
      stderr: options.silent ? 'pipe' : 'inherit',
      reject: false,
    });

    if (result.exitCode !== 0 && !softFail) {
      return {
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
        exitCode: result.exitCode ?? 1,
      };
    }

    return {
      stdout: String(result.stdout ?? ''),
      stderr: String(result.stderr ?? ''),
      exitCode: softFail ? 0 : (result.exitCode ?? 0),
    };
  } catch (err: unknown) {
    if (softFail) {
      return { stdout: '', stderr: String(err), exitCode: 0 };
    }
    throw err;
  }
}

/**
 * Runs a command and captures the output silently.
 *
 * @since TBD
 *
 * @param {string} command - The shell command to execute.
 * @param {Omit<RunOptions, 'silent'>} options - Optional configuration for the command execution.
 *
 * @returns {Promise<RunCommandResult>} The command result with stdout, stderr, and exit code.
 */
export async function runCommandSilent(
  command: string,
  options: Omit<RunOptions, 'silent'> = {}
): Promise<RunCommandResult> {
  return runCommand(command, { ...options, silent: true });
}
