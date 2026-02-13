import type { CheckConfig } from '../types.ts';

/**
 * Manages a collection of registered checks.
 *
 * @since TBD
 */
export class CheckCollection {
  private checks: Map<string, CheckConfig> = new Map();

  /**
   * Registers a check configuration.
   *
   * @since TBD
   *
   * @param {CheckConfig} config - The check configuration to add.
   *
   * @returns {void}
   */
  add(config: CheckConfig): void {
    this.checks.set(config.slug, config);
  }

  /**
   * Retrieves a check configuration by its slug.
   *
   * @since TBD
   *
   * @param {string} slug - The slug of the check to retrieve.
   *
   * @returns {CheckConfig | undefined} The check configuration, or undefined if not found.
   */
  get(slug: string): CheckConfig | undefined {
    return this.checks.get(slug);
  }

  /**
   * Checks whether a check with the given slug is registered.
   *
   * @since TBD
   *
   * @param {string} slug - The slug to check for.
   *
   * @returns {boolean} True if a check with the given slug is registered, false otherwise.
   */
  has(slug: string): boolean {
    return this.checks.has(slug);
  }

  /**
   * Removes a check by its slug.
   *
   * @since TBD
   *
   * @param {string} slug - The slug of the check to remove.
   *
   * @returns {void}
   */
  remove(slug: string): void {
    this.checks.delete(slug);
  }

  /**
   * Returns all registered checks as an array.
   *
   * @since TBD
   *
   * @returns {CheckConfig[]} An array of all registered check configurations.
   */
  getAll(): CheckConfig[] {
    return Array.from(this.checks.values());
  }

  /**
   * Returns the number of registered checks.
   *
   * @since TBD
   *
   * @returns {number} The number of registered checks.
   */
  get size(): number {
    return this.checks.size;
  }

  /**
   * Allows iterating over all registered checks.
   *
   * @since TBD
   *
   * @returns {Iterator<CheckConfig>} An iterator over all registered check configurations.
   */
  [Symbol.iterator](): Iterator<CheckConfig> {
    return this.checks.values();
  }
}
