export interface PupConfig {
  build: string[];
  build_dev: string[];
  workflows: Record<string, string[]>;
  checks: Record<string, CheckConfigInput>;
  clean: string[];
  i18n: I18nConfigInput[] | I18nConfigInput;
  i18n_defaults: I18nDefaults;
  paths: PathsConfig;
  env: string[];
  repo: string | null;
  zip_use_default_ignore: boolean;
  zip_name: string | null;
}

export interface PathsConfig {
  build_dir: string;
  changelog: string | null;
  css: string[];
  js: string[];
  sync_files: string[];
  versions: VersionFileInput[];
  views: string[];
  zip_dir: string;
}

export interface VersionFileInput {
  file: string;
  regex: string;
}

export interface VersionFile {
  file: string;
  regex: string;
}

export interface CheckConfigInput {
  fail_method?: 'error' | 'warn';
  fail_method_dev?: 'error' | 'warn';
  type?: 'simple' | 'class' | 'pup' | 'command';
  file?: string;
  command?: string;
  configure?: string;
  args?: Record<string, string>;
  dirs?: string[];
  skip_directories?: string;
  skip_files?: string;
}

export interface CheckConfig {
  slug: string;
  fail_method: 'error' | 'warn';
  fail_method_dev: 'error' | 'warn';
  type: 'simple' | 'class' | 'pup' | 'command';
  file?: string;
  command?: string;
  configure?: string;
  args: Record<string, string>;
  dirs?: string[];
  skip_directories?: string;
  skip_files?: string;
}

export interface CheckResult {
  success: boolean;
  output: string;
}

export interface I18nConfigInput {
  path?: string;
  url?: string;
  slug?: string;
  textdomain?: string;
  file_format?: string;
  formats?: string[];
  filter?: {
    minimum_percentage?: number;
  };
}

export interface I18nDefaults {
  path: string;
  url: string;
  slug: string;
  textdomain: string;
  file_format: string;
  formats: string[];
  filter: {
    minimum_percentage: number;
  };
}

export interface I18nResolvedConfig {
  path: string;
  url: string;
  slug: string;
  textdomain: string;
  file_format: string;
  formats: string[];
  filter: {
    minimum_percentage: number;
  };
}

export interface Workflow {
  slug: string;
  commands: string[];
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
