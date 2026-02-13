import type { CheckConfig, CheckResult } from '../types.ts';

export interface CheckContext {
  config: CheckConfig;
  workingDir: string;
  isDev: boolean;
}

export interface CheckModule {
  configure?: (config: CheckConfig) => void;
  execute: (context: CheckContext) => Promise<CheckResult>;
}
