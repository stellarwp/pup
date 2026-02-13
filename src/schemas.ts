import { z } from 'zod';

/**
 * Schema for a version file entry in .puprc paths.versions.
 *
 * @since TBD
 */
export const VersionFileInputSchema = z.object({
  file: z.string(),
  regex: z.string(),
});

export type VersionFileInput = z.infer<typeof VersionFileInputSchema>;

/**
 * Parsed version file (same shape as input).
 *
 * @since TBD
 */
export const VersionFileSchema = z.object({
  file: z.string(),
  regex: z.string(),
});

export type VersionFile = z.infer<typeof VersionFileSchema>;

/**
 * Schema for the i18n filter configuration.
 *
 * @since TBD
 */
const I18nFilterSchema = z.object({
  minimum_percentage: z.number(),
});

/**
 * Schema for an i18n configuration entry from .puprc (all fields optional).
 *
 * @since TBD
 */
export const I18nConfigInputSchema = z.object({
  path: z.string().optional(),
  url: z.string().optional(),
  slug: z.string().optional(),
  textdomain: z.string().optional(),
  file_format: z.string().optional(),
  formats: z.array(z.string()).optional(),
  filter: z.object({
    minimum_percentage: z.number().optional(),
  }).optional(),
}).passthrough();

export type I18nConfigInput = z.infer<typeof I18nConfigInputSchema>;

/**
 * Schema for the i18n defaults section of configuration.
 *
 * @since TBD
 */
export const I18nDefaultsSchema = z.object({
  path: z.string(),
  url: z.string(),
  slug: z.string(),
  textdomain: z.string(),
  file_format: z.string(),
  formats: z.array(z.string()),
  filter: I18nFilterSchema,
});

export type I18nDefaults = z.infer<typeof I18nDefaultsSchema>;

/**
 * Schema for a fully resolved i18n configuration entry (all fields required).
 *
 * @since TBD
 */
export const I18nResolvedConfigSchema = z.object({
  path: z.string(),
  url: z.string(),
  slug: z.string(),
  textdomain: z.string(),
  file_format: z.string(),
  formats: z.array(z.string()),
  filter: I18nFilterSchema,
});

export type I18nResolvedConfig = z.infer<typeof I18nResolvedConfigSchema>;

/**
 * Schema for a check configuration entry from .puprc (optional fields with defaults).
 *
 * @since TBD
 */
export const CheckConfigInputSchema = z.object({
  fail_method: z.enum(['error', 'warn']).optional(),
  fail_method_dev: z.enum(['error', 'warn']).optional(),
  type: z.enum(['simple', 'class', 'pup', 'command']).optional(),
  file: z.string().optional(),
  command: z.string().optional(),
  configure: z.string().optional(),
  args: z.record(z.string(), z.string()).optional(),
  dirs: z.array(z.string()).optional(),
  skip_directories: z.string().optional(),
  skip_files: z.string().optional(),
}).passthrough();

export type CheckConfigInput = z.infer<typeof CheckConfigInputSchema>;

/**
 * Schema for a fully resolved check configuration with defaults applied.
 *
 * @since TBD
 */
export const CheckConfigSchema = z.object({
  slug: z.string(),
  fail_method: z.enum(['error', 'warn']).default('error'),
  fail_method_dev: z.enum(['error', 'warn']).default('warn'),
  type: z.enum(['simple', 'class', 'pup', 'command']).default('pup'),
  file: z.string().optional(),
  command: z.string().optional(),
  configure: z.string().optional(),
  args: z.record(z.string(), z.string()).default({}),
  dirs: z.array(z.string()).optional(),
  skip_directories: z.string().optional(),
  skip_files: z.string().optional(),
});

export type CheckConfig = z.infer<typeof CheckConfigSchema>;

/**
 * Schema for the paths section of configuration.
 *
 * @since TBD
 */
export const PathsConfigSchema = z.object({
  build_dir: z.string(),
  changelog: z.string().nullable(),
  css: z.array(z.string()),
  js: z.array(z.string()),
  sync_files: z.array(z.string()),
  versions: z.array(VersionFileInputSchema),
  views: z.array(z.string()),
  zip_dir: z.string(),
});

export type PathsConfig = z.infer<typeof PathsConfigSchema>;

/**
 * Schema for the full merged pup configuration (after defaults are applied).
 *
 * @since TBD
 */
export const PupConfigSchema = z.object({
  build: z.array(z.string()),
  build_dev: z.array(z.string()),
  workflows: z.record(z.string(), z.array(z.string())),
  checks: z.record(z.string(), CheckConfigInputSchema),
  clean: z.array(z.string()),
  i18n: z.union([z.array(I18nConfigInputSchema), I18nConfigInputSchema]),
  i18n_defaults: I18nDefaultsSchema,
  paths: PathsConfigSchema,
  env: z.array(z.string()),
  repo: z.string().nullable(),
  zip_use_default_ignore: z.boolean(),
  zip_name: z.string().nullable(),
}).passthrough();

export type PupConfig = z.infer<typeof PupConfigSchema>;

/**
 * Schema for validating raw .puprc input (all fields optional + passthrough for custom keys).
 *
 * @since TBD
 */
export const PuprcInputSchema = z.object({
  build: z.array(z.string()).optional(),
  build_dev: z.array(z.string()).optional(),
  workflows: z.record(z.string(), z.array(z.string())).optional(),
  checks: z.record(z.string(), CheckConfigInputSchema.or(z.object({}).passthrough())).optional(),
  clean: z.array(z.string()).optional(),
  i18n: z.union([z.array(I18nConfigInputSchema), I18nConfigInputSchema]).optional(),
  i18n_defaults: I18nDefaultsSchema.partial().optional(),
  paths: PathsConfigSchema.partial().optional(),
  env: z.array(z.string()).optional(),
  repo: z.string().nullable().optional(),
  zip_use_default_ignore: z.boolean().optional(),
  zip_name: z.string().nullable().optional(),
}).passthrough();

export type PuprcInput = z.infer<typeof PuprcInputSchema>;

/**
 * Schema for a workflow.
 *
 * @since TBD
 */
export const WorkflowSchema = z.object({
  slug: z.string(),
  commands: z.array(z.string()),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

/**
 * Result of running a check.
 *
 * @since TBD
 */
export interface CheckResult {
  success: boolean;
  output: string;
}

/**
 * Result of running a shell command.
 *
 * @since TBD
 */
export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
