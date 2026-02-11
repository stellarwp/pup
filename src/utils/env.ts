/**
 * Builds an environment object from configured env var names.
 * Reads the current process.env values for the listed variable names.
 *
 * @since TBD
 *
 * @param {string[]} envVarNames - The list of environment variable names to include.
 *
 * @returns {Record<string, string>} An object mapping variable names to their values.
 */
export function buildEnv(envVarNames: string[]): Record<string, string> {
  const env: Record<string, string> = {};

  for (const name of envVarNames) {
    const value = process.env[name];
    if (value !== undefined) {
      env[name] = value;
    }
  }

  return env;
}
