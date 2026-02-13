/**
 * Re-exports all types and schemas from schemas.ts.
 * Types are defined via Zod schemas in schemas.ts using z.infer<>.
 *
 * @since TBD
 */
export type {
  PupConfig,
  PuprcInput,
  PathsConfig,
  VersionFileInput,
  VersionFile,
  CheckConfigInput,
  CheckConfig,
  CheckResult,
  I18nConfigInput,
  I18nDefaults,
  I18nResolvedConfig,
  Workflow,
  RunCommandResult,
} from './schemas.ts';

export {
  PupConfigSchema,
  PuprcInputSchema,
  PathsConfigSchema,
  VersionFileInputSchema,
  VersionFileSchema,
  CheckConfigInputSchema,
  CheckConfigSchema,
  I18nConfigInputSchema,
  I18nDefaultsSchema,
  I18nResolvedConfigSchema,
  WorkflowSchema,
} from './schemas.ts';
