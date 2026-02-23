import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { getConfig } from '../config.ts';
import { PUP_VERSION } from '../app.ts';
import * as output from '../utils/output.ts';
import type { I18nResolvedConfig } from '../types.ts';

/**
 * Backoff multipliers for HTTP 429 rate limit errors.
 * Index corresponds to the 429 occurrence count (0-indexed).
 * Applied as: delay * multiplier.
 *
 * @since TBD
 */
const HTTP_429_BACKOFF_MULTIPLIERS = [16, 31, 91, 151];

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
    .option('--retries <number>', 'How many retries per translation file.', '3')
    .option('--delay <number>', 'Delay (seconds) between retries and for 429 backoff.', '2')
    .option('--batch-size <number>', 'Batch size for grouping downloads.', '3')
    .option('--root <dir>', 'Set the root directory for downloading language files.')
    .action(async (options: { retries?: string; delay?: string; batchSize?: string; root?: string }) => {
      const config = getConfig();
      const i18nConfigs = config.getI18n();
      const cwd = options.root ?? config.getWorkingDir();
      const maxRetries = Math.max(1, Math.min(5, parseInt(options.retries ?? '3', 10)));
      const delay = Math.max(1, parseInt(options.delay ?? '2', 10));
      const batchSize = Math.max(1, parseInt(options.batchSize ?? '3', 10));

      if (i18nConfigs.length === 0) {
        output.log('No i18n configuration found. Skipping.');
        return;
      }

      for (const i18nConfig of i18nConfigs) {
        const result = await downloadLanguageFiles(i18nConfig, cwd, maxRetries, delay, batchSize);

        if (result !== 0) {
          output.error('Failed to download language files.');
          output.warning('Config:');
          output.log(JSON.stringify(i18nConfig, null, 2));
          process.exitCode = result;
          return;
        }
      }
    });
}

/**
 * Extracts the wait time from the Retry-After header if present.
 * Respects the server hint but caps it to the backoff schedule for that attempt.
 *
 * @since TBD
 *
 * @param {Response} response - The HTTP response containing potential Retry-After header.
 * @param {number} backoffWait - The computed backoff wait time in seconds.
 *
 * @returns {number} The wait time in seconds.
 */
function getWaitTimeFor429(response: Response, backoffWait: number): number {
  const retryAfter = response.headers.get('Retry-After');

  if (!retryAfter) {
    return backoffWait;
  }

  // Retry-After can be numeric seconds or an HTTP-date; parse numeric only.
  if (/^\d+$/.test(retryAfter)) {
    const serverWait = parseInt(retryAfter, 10);
    // Use the server hint but cap at our backoff (don't wait longer than we're willing to).
    return Math.max(1, Math.min(serverWait, backoffWait));
  }

  // HTTP-date format is complex to parse; fall back to backoff schedule.
  return backoffWait;
}

/**
 * Downloads language files for a single i18n configuration.
 * Processes downloads sequentially with deterministic retry logic.
 *
 * @since TBD
 *
 * @param {I18nResolvedConfig} config - The resolved i18n configuration for this translation source.
 * @param {string} cwd - The current working directory.
 * @param {number} maxRetries - The maximum number of retry attempts for failed downloads.
 * @param {number} delay - The base delay in seconds between retries and for 429 backoff.
 * @param {number} batchSize - The batch size for grouping downloads.
 *
 * @returns {Promise<number>} 0 on success, 1 on failure.
 */
async function downloadLanguageFiles(
  config: I18nResolvedConfig,
  cwd: string,
  maxRetries: number,
  delay: number,
  batchSize: number
): Promise<number> {
  const projectUrl = config.url
    .replace('{slug}', config.slug)
    .replace('%slug%', config.slug);

  output.log(`Fetching language files for ${config.textdomain} from ${projectUrl}`);

  let data: TranslationApiResponse;

  try {
    const response = await fetch(projectUrl, {
      headers: { 'User-Agent': `StellarWP PUP/${PUP_VERSION}` },
    });
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

  // Build a list of (translation, format) pairs to download.
  const downloadItems: [TranslationSet, string][] = [];

  for (const translation of data.translation_sets) {
    // Skip when translations are zero.
    if (translation.current_count === 0) {
      continue;
    }

    // Skip any translation set that doesn't match the minimum percentage.
    if (minimumPercentage > translation.percent_translated) {
      continue;
    }

    for (const format of config.formats) {
      downloadItems.push([translation, format]);
    }
  }

  if (downloadItems.length === 0) {
    return 0;
  }

  // Process downloads sequentially in batches (for grouping/visibility).
  let failedCount = 0;

  for (let offset = 0; offset < downloadItems.length; offset += batchSize) {
    const batch = downloadItems.slice(offset, offset + batchSize);

    // Process each item in the batch sequentially.
    for (const [translation, format] of batch) {
      try {
        await downloadAndSaveTranslationSync(
          config, translation, format, projectUrl, langDir, maxRetries, delay
        );
      } catch (err) {
        output.error(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
        failedCount++;
      }
    }
  }

  return failedCount > 0 ? 1 : 0;
}

/**
 * Synchronously downloads and saves a translation with retry logic.
 * Retries consume the standard retry budget; 429 responses use smarter delay logic.
 *
 * @since TBD
 *
 * @param {I18nResolvedConfig} config - The resolved i18n configuration.
 * @param {TranslationSet} translation - The translation set to download.
 * @param {string} format - The file format to download (e.g. "po", "mo").
 * @param {string} projectUrl - The base project API URL.
 * @param {string} langDir - The absolute path to the language files directory.
 * @param {number} maxRetries - The maximum number of retry attempts.
 * @param {number} delay - The base delay in seconds between retries and for 429 backoff.
 *
 * @returns {Promise<void>}
 */
async function downloadAndSaveTranslationSync(
  config: I18nResolvedConfig,
  translation: TranslationSet,
  format: string,
  projectUrl: string,
  langDir: string,
  maxRetries: number,
  delay: number
): Promise<void> {
  const translationUrl = `${projectUrl}/${translation.locale}/${translation.slug}/export-translations?format=${format}`;
  let http429Count = 0;

  for (let tried = 0; tried < maxRetries; tried++) {
    const response = await fetch(translationUrl, {
      headers: { 'User-Agent': `StellarWP PUP/${PUP_VERSION}` },
    });
    const statusCode = response.status;
    const buffer = Buffer.from(await response.arrayBuffer());
    const bodySize = buffer.byteLength;

    // Handle HTTP 429 (Too Many Requests) with smarter delay.
    if (statusCode === 429) {
      const multiplier = HTTP_429_BACKOFF_MULTIPLIERS[http429Count] ??
        HTTP_429_BACKOFF_MULTIPLIERS[HTTP_429_BACKOFF_MULTIPLIERS.length - 1];
      const backoffWait = delay * multiplier;
      const waitTime = getWaitTimeFor429(response, backoffWait);

      output.warning(
        `Rate limited (HTTP 429) on ${translation.slug}. Waiting ${waitTime}s before retry...`
      );

      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      http429Count++;
      continue;
    }

    // Check for valid response (non-429 case).
    if (statusCode !== 200 || bodySize < 200) {
      // Non-429 failure: use standard delay and retry.
      if (tried < maxRetries - 1) {
        output.error(
          `Invalid response from ${translationUrl} (status: ${statusCode}, size: ${bodySize}). Retrying...`
        );
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
        continue;
      }
      break;
    }

    // Success: save and return.
    saveTranslationFile(buffer, config, translation, format, langDir);
    return;
  }

  // All retries exhausted.
  throw new Error(`Failed to download ${translation.slug} after ${maxRetries} retries`);
}

/**
 * Saves a translation file to disk.
 *
 * @since TBD
 *
 * @param {Buffer} content - The translation file content.
 * @param {I18nResolvedConfig} config - The resolved i18n configuration.
 * @param {TranslationSet} translation - The translation set metadata.
 * @param {string} format - The file format (e.g. "po", "mo").
 * @param {string} langDir - The absolute path to the language files directory.
 *
 * @returns {void}
 */
function saveTranslationFile(
  content: Buffer,
  config: I18nResolvedConfig,
  translation: TranslationSet,
  format: string,
  langDir: string
): void {
  const filename = config.file_format
    .replace('%domainPath%', config.path)
    .replace('%textdomain%', config.textdomain)
    .replace('%locale%', translation.locale ?? '')
    .replace('%wp_locale%', translation.wp_locale ?? '')
    .replace('%format%', format);

  const filePath = path.join(langDir, filename);
  fs.writeFileSync(filePath, content);

  // Verify the written file size matches the response size.
  const stat = fs.statSync(filePath);
  if (stat.size !== content.byteLength) {
    fs.unlinkSync(filePath);
    throw new Error(`Failed to write translation to ${filePath}`);
  }

  output.log(`* Translation created for ${filePath}`);
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
