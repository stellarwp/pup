import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { trailingSlashIt } from './utils/directory.ts';
import { WorkflowCollection, createWorkflow } from './models/workflow.ts';
import { PuprcInputSchema, CheckConfigSchema } from './schemas.ts';
import type {
  PupConfig,
  BuildStep,
  CheckConfig,
  VersionFile,
  VersionFileInput,
  I18nResolvedConfig,
  I18nConfigInput,
} from './types.ts';
import puprcDefaults from '../defaults/.puprc-defaults.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Locates the defaults directory containing .distignore-defaults and docs.
 *
 * @since TBD
 *
 * @returns {string} The absolute path to the defaults directory.
 */
export function getDefaultsDir(): string {
  // In built dist, defaults/ is at the package root
  // During dev, it's at the repo root
  const candidates = [
    path.resolve(__dirname, '..', 'defaults'),
    path.resolve(__dirname, '..', '..', 'defaults'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

/**
 * Loads, merges, and provides access to the project's pup configuration.
 *
 * @since TBD
 */
export class Config {
  readonly #workingDir: string;
  readonly #puprcFilePath: string;
  readonly #config: PupConfig;
  #workflows: WorkflowCollection;
  #checks: Map<string, CheckConfig>;
  #versionFiles: VersionFile[];
  #i18n: I18nResolvedConfig[] | null = null;

  /**
   * Initializes configuration by loading and merging .puprc with defaults.
   *
   * @since TBD
   *
   * @param {string} workingDir - The project working directory. Defaults to process.cwd().
   *
   * @throws {Error} If the .puprc file is present but contains invalid JSON or fails validation.
   */
  constructor(workingDir?: string) {
    const cwd = workingDir ?? process.cwd();

    this.#workingDir = trailingSlashIt(path.normalize(cwd));
    this.#puprcFilePath = path.join(this.#workingDir, '.puprc');
    this.#config = this.getDefaultConfig();
    this.mergeConfigWithDefaults();
    this.#workflows = this.buildWorkflows();
    this.#checks = this.parseCheckConfig();
    this.#versionFiles = this.parseVersionFiles();
  }

  /**
   * Returns the default configuration from the bundled .puprc-defaults.
   *
   * @since TBD
   *
   * @returns {PupConfig} The parsed default configuration object.
   */
  private getDefaultConfig(): PupConfig {
    return structuredClone(puprcDefaults) as PupConfig;
  }

  /**
   * Merges the project's .puprc file into the default configuration.
   *
   * @since TBD
   *
   * @throws {Error} If the .puprc file contains invalid JSON or fails schema validation.
   */
  private mergeConfigWithDefaults(): void {
    if (!fs.existsSync(this.#puprcFilePath)) {
      return;
    }

    const puprcContents = fs.readFileSync(this.#puprcFilePath, 'utf-8');
    let rawPuprc: unknown;

    try {
      rawPuprc = JSON.parse(puprcContents);
    } catch {
      throw new Error(
        'There is a .puprc file in this directory, but it could not be parsed. Invalid JSON in .puprc.'
      );
    }

    if (!rawPuprc || typeof rawPuprc !== 'object') {
      throw new Error(
        'There is a .puprc file in this directory, but it could not be parsed. Invalid .puprc format.'
      );
    }

    const parseResult = PuprcInputSchema.safeParse(rawPuprc);

    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(
        `There is a .puprc file in this directory, but it contains invalid configuration:\n${issues}`
      );
    }

    const puprc = parseResult.data as Record<string, unknown>;
    const configRecord = this.#config as unknown as Record<string, unknown>;

    for (const [key, value] of Object.entries(puprc)) {
      const current = configRecord[key];

      if (current === undefined || current === null) {
        configRecord[key] = value;
        continue;
      }

      if (typeof current !== 'object') {
        configRecord[key] = value;
        continue;
      }

      // Special handling for checks: preserve defaults + merge
      if (key === 'checks' && typeof value === 'object' && value !== null) {
        const defaultChecks = current as Record<string, unknown>;
        const newChecks = value as Record<string, unknown>;
        configRecord[key] = newChecks;

        for (const [checkSlug, checkConfig] of Object.entries(newChecks)) {
          if (defaultChecks[checkSlug] !== undefined) {
            (configRecord[key] as Record<string, unknown>)[checkSlug] =
              this.mergeConfigValue(defaultChecks[checkSlug], checkConfig);
          }
        }
        continue;
      }

      configRecord[key] = this.mergeConfigValue(current, value);
    }
  }

  /**
   * Deep-merges two configuration values. Scalars and arrays replace; objects merge recursively.
   *
   * @since TBD
   *
   * @param {unknown} original - The original configuration value.
   * @param {unknown} newVal - The new configuration value to merge in.
   *
   * @returns {unknown} The merged configuration value.
   */
  private mergeConfigValue(original: unknown, newVal: unknown): unknown {
    if (typeof newVal !== 'object' || newVal === null) {
      return newVal;
    }

    if (typeof original !== 'object' || original === null) {
      return newVal;
    }

    if (Array.isArray(original)) {
      // Numeric-keyed arrays: replace
      return newVal;
    }

    if (Array.isArray(newVal)) {
      return newVal;
    }

    const orig = original as Record<string, unknown>;
    const nv = newVal as Record<string, unknown>;
    const result = { ...orig };

    for (const [key, item] of Object.entries(orig)) {
      if (nv[key] === undefined) continue;
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        result[key] = this.mergeConfigValue(item, nv[key]);
      } else {
        result[key] = nv[key];
      }
    }

    for (const [key, item] of Object.entries(nv)) {
      if (result[key] === undefined) {
        result[key] = item;
      }
    }

    return result;
  }

  /**
   * Builds the workflow collection from configuration, including auto-generated build workflows.
   *
   * @since TBD
   *
   * @returns {WorkflowCollection} The built workflow collection.
   */
  private buildWorkflows(): WorkflowCollection {
    const collection = new WorkflowCollection();

    const rawWorkflows = this.#config.workflows as unknown;

    // Auto-create build workflow
    // TODO: Add parallel build step support to workflow execution.
    if (
      this.#config.build?.length > 0 &&
      !(rawWorkflows as Record<string, unknown>)?.['build']
    ) {
      collection.add(createWorkflow('build', this.#config.build));
    }

    if (
      this.#config.build_dev?.length > 0 &&
      !(rawWorkflows as Record<string, unknown>)?.['build_dev']
    ) {
      collection.add(createWorkflow('build_dev', this.#config.build_dev));
    }

    if (rawWorkflows && typeof rawWorkflows === 'object') {
      for (const [slug, commands] of Object.entries(
        rawWorkflows as Record<string, string[]>
      )) {
        collection.add(
          createWorkflow(slug, Array.isArray(commands) ? commands : [])
        );
      }
    }

    return collection;
  }

  /**
   * Parses the checks section of the configuration into CheckConfig objects.
   * Uses Zod schema defaults for per-field values.
   *
   * @since TBD
   *
   * @returns {Map<string, CheckConfig>} A map of check slug to CheckConfig.
   */
  private parseCheckConfig(): Map<string, CheckConfig> {
    const checks = this.#config.checks;
    const result = new Map<string, CheckConfig>();
    if (!checks) return result;

    for (const [slug, checkInput] of Object.entries(checks)) {
      const input = typeof checkInput === 'object' && checkInput !== null
        ? checkInput
        : {};

      const parsed = CheckConfigSchema.parse({ slug, ...input });
      result.set(slug, parsed);
    }

    return result;
  }

  /**
   * Parses and validates the version files section of the configuration.
   *
   * @since TBD
   *
   * @returns {VersionFile[]} The parsed list of version file objects.
   *
   * @throws {Error} If a version file entry is missing required properties or the file does not exist.
   */
  private parseVersionFiles(): VersionFile[] {
    const versions = this.#config.paths?.versions;
    const result: VersionFile[] = [];
    if (!versions || !Array.isArray(versions)) return result;

    for (const vf of versions as VersionFileInput[]) {
      if (!vf.file || !vf.regex) {
        throw new Error(
          'Versions specified in .puprc .paths.versions must have the "file" and "regex" property.'
        );
      }

      const filePath = path.join(this.#workingDir, vf.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Version file does not exist: ${vf.file}`);
      }

      const contents = fs.readFileSync(filePath, 'utf-8');
      const regex = new RegExp(vf.regex);
      const matches = contents.match(regex);

      if (!matches || !matches[1] || !matches[2]) {
        throw new Error(
          `Could not find version in file ${vf.file} using regex "/${vf.regex}/"`
        );
      }

      result.push({ file: vf.file, regex: vf.regex });
    }

    return result;
  }

  /**
   * Returns the raw merged configuration object.
   *
   * @since TBD
   *
   * @returns {PupConfig} The configuration object.
   */
  get raw(): PupConfig {
    return this.#config;
  }

  /**
   * Returns the build commands, preferring dev commands when isDev is true.
   *
   * @since TBD
   *
   * @param {boolean} isDev - Whether to return dev build commands.
   *
   * @returns {BuildStep[]} The list of build steps (strings run sequentially, sub-arrays run in parallel).
   */
  getBuildCommands(isDev = false): BuildStep[] {
    if (isDev && this.#config.build_dev?.length > 0) {
      return this.#config.build_dev;
    }
    return this.#config.build ?? [];
  }

  /**
   * Returns the build directory path, optionally as a full absolute path.
   *
   * @since TBD
   *
   * @param {boolean} fullPath - Whether to return the full absolute path.
   *
   * @returns {string} The build directory path.
   */
  getBuildDir(fullPath = true): string {
    const buildDir = this.#config.paths?.build_dir ?? '.pup-build';
    if (!fullPath) return buildDir;
    return path.resolve(this.#workingDir, buildDir);
  }

  /**
   * Returns the clean commands from the configuration.
   *
   * @since TBD
   *
   * @returns {string[]} The list of clean command strings.
   */
  getCleanCommands(): string[] {
    return this.#config.clean ?? [];
  }

  /**
   * Returns the map of parsed check configurations.
   *
   * @since TBD
   *
   * @returns {Map<string, CheckConfig>} A map of check slug to CheckConfig.
   */
  getChecks(): Map<string, CheckConfig> {
    return this.#checks;
  }

  /**
   * Returns resolved i18n configurations, merging with defaults.
   *
   * @since TBD
   *
   * @returns {I18nResolvedConfig[]} The list of resolved i18n configuration objects.
   */
  getI18n(): I18nResolvedConfig[] {
    if (this.#i18n !== null) return this.#i18n;

    const defaults = this.#config.i18n_defaults;
    const i18nRaw = this.#config.i18n;

    if (!i18nRaw || (Array.isArray(i18nRaw) && i18nRaw.length === 0)) {
      this.#i18n = [];
      return this.#i18n;
    }

    // Normalize to array
    let i18nArr: I18nConfigInput[];
    if (!Array.isArray(i18nRaw)) {
      i18nArr = [i18nRaw];
    } else {
      i18nArr = i18nRaw;
    }

    // Filter valid entries
    i18nArr = i18nArr.filter(
      (item) => item.url && item.textdomain && item.slug
    );

    if (i18nArr.length === 0) {
      this.#i18n = [];
      return this.#i18n;
    }

    this.#i18n = i18nArr.map((item) => ({
      path: item.path ?? defaults.path,
      url: item.url ?? defaults.url,
      slug: item.slug ?? defaults.slug,
      textdomain: item.textdomain ?? defaults.textdomain,
      file_format: item.file_format ?? defaults.file_format,
      formats: item.formats?.length ? item.formats : defaults.formats,
      filter: {
        minimum_percentage:
          item.filter?.minimum_percentage ??
          defaults.filter.minimum_percentage,
      },
    }));

    return this.#i18n;
  }

  /**
   * Returns the list of environment variable names from configuration.
   *
   * @since TBD
   *
   * @returns {string[]} The list of environment variable name strings.
   */
  getEnvVarNames(): string[] {
    return this.#config.env ?? [];
  }

  /**
   * Returns the git repository URL, inferring from package.json or composer.json if not set.
   *
   * @since TBD
   *
   * @returns {string} The git repository URL string.
   *
   * @throws {Error} If no repository can be determined.
   */
  getRepo(): string {
    if (!this.#config.repo) {
      // Try to infer from package.json
      const pkgPath = path.join(this.#workingDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
          repository?: { url?: string } | string;
        };
        if (typeof pkg.repository === 'string') {
          return `git@github.com:${pkg.repository}.git`;
        }
        if (pkg.repository?.url) {
          return pkg.repository.url;
        }
      }

      // Try composer.json fallback
      const composerPath = path.join(this.#workingDir, 'composer.json');
      if (fs.existsSync(composerPath)) {
        const composer = JSON.parse(
          fs.readFileSync(composerPath, 'utf-8')
        ) as { name?: string };
        if (composer.name) {
          return `git@github.com:${composer.name}.git`;
        }
      }

      throw new Error(
        'Could not find a repo in the .puprc file or the "name" property in package.json/composer.json.'
      );
    }

    const repo = this.#config.repo;

    if (
      !repo.includes('https://') &&
      !repo.includes('file://') &&
      !repo.includes('git://') &&
      !repo.includes('git@github.com') &&
      !fs.existsSync(repo)
    ) {
      return `git@github.com:${repo}.git`;
    }

    return repo;
  }

  /**
   * Returns the list of sync file names (.distfiles, .distinclude, etc.).
   *
   * @since TBD
   *
   * @returns {string[]} The list of sync file name strings.
   */
  getSyncFiles(): string[] {
    const defaults = ['.distfiles', '.distinclude', '.distignore', '.gitattributes'];
    const configFiles = this.#config.paths?.sync_files;

    if (!configFiles || !Array.isArray(configFiles) || configFiles.length === 0) {
      return defaults;
    }

    return [...new Set([...defaults, ...configFiles])];
  }

  /**
   * Returns the parsed version file configurations.
   *
   * @since TBD
   *
   * @returns {VersionFile[]} The list of version file objects.
   */
  getVersionFiles(): VersionFile[] {
    return this.#versionFiles;
  }

  /**
   * Returns the workflow collection.
   *
   * @since TBD
   *
   * @returns {WorkflowCollection} The WorkflowCollection instance.
   */
  getWorkflows(): WorkflowCollection {
    return this.#workflows;
  }

  /**
   * Returns the working directory path.
   *
   * @since TBD
   *
   * @returns {string} The absolute working directory path with trailing slash.
   */
  getWorkingDir(): string {
    return this.#workingDir;
  }

  /**
   * Returns the zip staging directory path, optionally as a full absolute path.
   *
   * @since TBD
   *
   * @param {boolean} fullPath - Whether to return the full absolute path.
   *
   * @returns {string} The zip staging directory path.
   */
  getZipDir(fullPath = true): string {
    const zipDir = this.#config.paths?.zip_dir ?? '.pup-zip';
    if (!fullPath) return zipDir;
    return path.resolve(this.#workingDir, zipDir);
  }

  /**
   * Returns the zip archive base name, inferring from package.json if not set.
   *
   * @since TBD
   *
   * @returns {string} The zip archive base name string.
   *
   * @throws {Error} If no zip name can be determined.
   */
  getZipName(): string {
    if (this.#config.zip_name) {
      return this.#config.zip_name;
    }

    // Try package.json name
    const pkgPath = path.join(this.#workingDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: string;
      };
      if (pkg.name) {
        // Strip scope prefix (e.g., @stellarwp/pup -> pup)
        return pkg.name.replace(/^@[^/]+\//, '');
      }
    }

    // Try composer.json name
    const composerPath = path.join(this.#workingDir, 'composer.json');
    if (fs.existsSync(composerPath)) {
      const composer = JSON.parse(
        fs.readFileSync(composerPath, 'utf-8')
      ) as { name?: string };
      if (composer.name) {
        return composer.name.replace(/^[^/]+\//, '');
      }
    }

    throw new Error('Could not find a "zip_name" in .puprc');
  }

  /**
   * Returns whether to use the default .distignore-defaults patterns.
   *
   * @since TBD
   *
   * @returns {boolean} True if default ignore patterns should be used.
   */
  getZipUseDefaultIgnore(): boolean {
    return this.#config.zip_use_default_ignore ?? true;
  }

  /**
   * Serializes the configuration to a plain object.
   *
   * @since TBD
   *
   * @returns {PupConfig} The configuration as a PupConfig object.
   */
  toJSON(): PupConfig {
    return this.#config;
  }
}

let globalConfig: Config | null = null;

/**
 * Returns the singleton Config instance, creating it if needed.
 *
 * @since TBD
 *
 * @param {string} workingDir - Optional working directory to pass to the Config constructor.
 *
 * @returns {Config} The singleton Config instance.
 */
export function getConfig(workingDir?: string): Config {
  if (!globalConfig) {
    globalConfig = new Config(workingDir);
  }
  return globalConfig;
}

/**
 * Resets the singleton Config instance, forcing a fresh load on next access.
 *
 * @since TBD
 *
 * @returns {void}
 */
export function resetConfig(): void {
  globalConfig = null;
}
