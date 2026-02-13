import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.ts';
import * as output from '../utils/output.ts';
import type { I18nResolvedConfig } from '../types.ts';

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
    .description('Fetches language files for the project.')
    .option('--retries <number>', 'How many retries we do for each file.', '3')
    .option('--root <dir>', 'Set the root directory for downloading language files.')
    .action(async (options: { retries?: string; root?: string }) => {
      const config = getConfig();
      const i18nConfigs = config.getI18n();
      const cwd = options.root ?? config.getWorkingDir();
      const maxRetries = parseInt(options.retries ?? '3', 10);

      if (i18nConfigs.length === 0) {
        output.log('No i18n configuration found. Skipping.');
        return;
      }

      for (const i18nConfig of i18nConfigs) {
        const result = await downloadLanguageFiles(i18nConfig, cwd, maxRetries);

        if (result !== 0) {
          process.exitCode = result;
          return;
        }
      }
    });
}

/**
 * Downloads language files for a single i18n configuration.
 *
 * @since TBD
 *
 * @param {I18nResolvedConfig} config - The resolved i18n configuration for this translation source.
 * @param {string} cwd - The current working directory.
 * @param {number} maxRetries - The maximum number of retry attempts for failed downloads.
 *
 * @returns {Promise<number>} 0 on success, 1 on failure.
 */
async function downloadLanguageFiles(
  config: I18nResolvedConfig,
  cwd: string,
  maxRetries: number
): Promise<number> {
  const projectUrl = config.url
    .replace('{slug}', config.slug)
    .replace('%slug%', config.slug);

  output.log(`Fetching language files for ${config.textdomain} from ${projectUrl}`);

  let data: TranslationApiResponse;

  try {
    const response = await fetch(projectUrl);
    if (!response.ok) {
      output.error(`Failed to fetch project data from ${projectUrl}`);
      return 1;
    }
    data = (await response.json()) as TranslationApiResponse;
  } catch (err) {
    output.error(`Failed to fetch translation data: ${err}`);
    return 1;
  }

  if (
    !data.translation_sets ||
    !Array.isArray(data.translation_sets) ||
    data.translation_sets.length === 0
  ) {
    output.error(`Failed to fetch translation sets from ${projectUrl}`);
    return 1;
  }

  const minimumPercentage = config.filter.minimum_percentage;

  const langDir = path.resolve(cwd, config.path);
  await fs.mkdirp(langDir);

  const promises: Promise<void>[] = [];

  for (const translation of data.translation_sets) {
    // Skip when translations are zero.
    if (translation.current_count === 0) {
      continue;
    }

    // Skip any translation set that doesn't match our min translated.
    if (minimumPercentage > translation.percent_translated) {
      continue;
    }

    for (const format of config.formats) {
      const promise = downloadAndSaveTranslation(
        config,
        translation,
        format,
        projectUrl,
        langDir,
        maxRetries
      );
      promises.push(promise);
    }
  }

  await Promise.all(promises);

  return 0;
}

/**
 * Downloads and saves a single translation file with retry support.
 *
 * @since TBD
 *
 * @param {I18nResolvedConfig} config - The resolved i18n configuration.
 * @param {TranslationSet} translation - The translation set to download.
 * @param {string} format - The file format to download (e.g. "po", "mo").
 * @param {string} projectUrl - The base project API URL.
 * @param {string} langDir - The absolute path to the language files directory.
 * @param {number} maxRetries - The maximum number of retry attempts.
 * @param {number} tried - The current attempt count.
 *
 * @returns {Promise<void>}
 */
async function downloadAndSaveTranslation(
  config: I18nResolvedConfig,
  translation: TranslationSet,
  format: string,
  projectUrl: string,
  langDir: string,
  maxRetries: number,
  tried = 0
): Promise<void> {
  const translationUrl = `${projectUrl}/${translation.locale}/${translation.slug}/export-translations?format=${format}`;

  if (tried >= maxRetries) {
    output.error(
      `Failed to fetch translation from ${translationUrl} too many times, bailing on ${translation.slug}`
    );
    return;
  }

  tried++;

  try {
    const response = await fetch(translationUrl);

    const filename = config.file_format
      .replace('%domainPath%', config.path)
      .replace('%textdomain%', config.textdomain)
      .replace('%locale%', translation.locale ?? '')
      .replace('%wp_locale%', translation.wp_locale ?? '')
      .replace('%format%', format);

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength < 200) {
      output.error(`Failed to fetch translation from ${translationUrl}`);

      // Not sure if 2 seconds is needed, but it prevents the firewall from catching us.
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retries to download this file.
      return downloadAndSaveTranslation(
        config, translation, format, projectUrl, langDir, maxRetries, tried
      );
    }

    const filePath = path.join(langDir, filename);
    await fs.writeFile(filePath, buffer);

    // Verify the written file size matches the response size.
    const stat = await fs.stat(filePath);
    if (stat.size !== buffer.byteLength) {
      output.error(
        `Failed to save the translation from ${translationUrl} to ${filePath}`
      );

      // Delete the file in that case.
      await fs.unlink(filePath).catch(() => {});

      // Not sure if 2 seconds is needed, but it prevents the firewall from catching us.
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retries to download this file.
      return downloadAndSaveTranslation(
        config, translation, format, projectUrl, langDir, maxRetries, tried
      );
    }

    output.log(`* Translation created for ${filePath}`);
  } catch {
    output.error(`Failed to fetch translation from ${translationUrl}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    return downloadAndSaveTranslation(
      config, translation, format, projectUrl, langDir, maxRetries, tried
    );
  }
}

interface TranslationApiResponse {
  translation_sets: TranslationSet[];
}

interface TranslationSet {
  locale: string;
  wp_locale?: string;
  slug: string;
  current_count: number;
  percent_translated: number;
}
