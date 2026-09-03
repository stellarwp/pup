import { runCommandSilent } from './process.ts';

/**
 * Builds the dev version suffix from the current git HEAD.
 *
 * The suffix takes the form `-dev-<committer-timestamp>-<short-hash>` and is
 * appended to a version by the commands that support a `--dev` flag.
 *
 * @since TBD
 *
 * @param {string} cwd - The directory to run the git commands in.
 *
 * @returns {Promise<string>} The dev suffix, including its leading dash.
 */
export async function getDevSuffix(cwd: string): Promise<string> {
  const timestampResult = await runCommandSilent(
    'git show -s --format=%ct HEAD',
    { cwd }
  );
  const hashResult = await runCommandSilent(
    'git rev-parse --short=8 HEAD',
    { cwd }
  );

  const timestamp = timestampResult.stdout.trim();
  const hash = hashResult.stdout.trim();

  return `-dev-${timestamp}-${hash}`;
}
