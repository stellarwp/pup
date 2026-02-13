import type { I18nResolvedConfig } from '../types.js';

/**
 * Creates a resolved i18n configuration object.
 *
 * @since TBD
 *
 * @param {I18nResolvedConfig} config - The i18n configuration to clone.
 *
 * @returns {I18nResolvedConfig} A new copy of the i18n configuration object.
 */
export function createI18nConfig(config: I18nResolvedConfig): I18nResolvedConfig {
  return { ...config };
}
