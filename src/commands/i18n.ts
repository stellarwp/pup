import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.js';
import * as output from '../utils/output.js';
import type { I18nResolvedConfig } from '../types.js';

/**
 * Registers the `i18n` command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerI18nCommand(program: Command): void {
  program
    .command('i18n')
    .description('Fetches language files from a translation API.')
    .option('--retries <number>', 'Number of retries for failed downloads.', '3')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .action(async (options: { retries?: string; root?: string }) => {
      const config = getConfig(options.root);
      const i18nConfigs = config.getI18n();
      const cwd = options.root ?? config.getWorkingDir();
      const maxRetries = parseInt(options.retries ?? '3', 10);

      if (i18nConfigs.length === 0) {
        output.log('No i18n configuration found. Skipping.');
        return;
      }

      for (const i18nConfig of i18nConfigs) {
        await fetchTranslations(i18nConfig, cwd, maxRetries);
      }
    });
}

/**
 * Fetches and downloads translation files from a GlotPress-compatible API.
 *
 * @since TBD
 *
 * @param {I18nResolvedConfig} config - The resolved i18n configuration for this translation source.
 * @param {string} cwd - The current working directory.
 * @param {number} maxRetries - The maximum number of retry attempts for failed downloads.
 *
 * @returns {Promise<void>}
 */
async function fetchTranslations(
  config: I18nResolvedConfig,
  cwd: string,
  maxRetries: number
): Promise<void> {
  const url = config.url
    .replace('{slug}', config.slug)
    .replace('%slug%', config.slug);

  output.section(`Fetching translations from ${url}...`);

  let data: TranslationApiResponse;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      output.error(`Failed to fetch translations: HTTP ${response.status}`);
      return;
    }
    data = (await response.json()) as TranslationApiResponse;
  } catch (err) {
    output.error(`Failed to fetch translation data: ${err}`);
    return;
  }

  if (!data.translation_sets || !Array.isArray(data.translation_sets)) {
    output.error('Invalid translation API response.');
    return;
  }

  const minimumPercentage = config.filter.minimum_percentage;
  const filteredSets = data.translation_sets.filter(
    (set: TranslationSet) =>
      set.percent_translated >= minimumPercentage
  );

  output.log(
    `Found ${filteredSets.length} translations meeting ${minimumPercentage}% threshold.`
  );

  const langDir = path.resolve(cwd, config.path);
  await fs.mkdirp(langDir);

  for (const set of filteredSets) {
    for (const format of config.formats) {
      const filename = config.file_format
        .replace('%textdomain%', config.textdomain)
        .replace('%locale%', set.locale)
        .replace('%wp_locale%', set.wp_locale || set.locale)
        .replace('%format%', format);

      const downloadUrl = `${url}/${set.locale}/default/export-translations?format=${format}`;
      const destPath = path.join(langDir, filename);

      let success = false;
      for (let attempt = 0; attempt < maxRetries && !success; attempt++) {
        try {
          const response = await fetch(downloadUrl);
          if (!response.ok) {
            output.warning(
              `Failed to download ${filename} (attempt ${attempt + 1}/${maxRetries}): HTTP ${response.status}`
            );
            continue;
          }

          const buffer = await response.arrayBuffer();
          if (buffer.byteLength === 0) {
            output.warning(`Empty response for ${filename}, skipping.`);
            break;
          }

          await fs.writeFile(destPath, Buffer.from(buffer));
          output.log(`Downloaded: ${filename}`);
          success = true;
        } catch (err) {
          output.warning(
            `Error downloading ${filename} (attempt ${attempt + 1}/${maxRetries}): ${err}`
          );
        }
      }
    }
  }

  output.success('Translation downloads complete.');
}

interface TranslationApiResponse {
  translation_sets: TranslationSet[];
}

interface TranslationSet {
  locale: string;
  wp_locale?: string;
  percent_translated: number;
}
