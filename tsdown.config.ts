import { defineConfig } from 'tsdown';
import fs from 'node:fs';

const builtinCheckSlugs = fs.existsSync('src/commands/checks')
  ? fs
      .readdirSync('src/commands/checks')
      .filter((f) => f.endsWith('.ts'))
      .map((f) => f.replace(/\.ts$/, ''))
  : [];

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  fixedExtension: false,
  sourcemap: true,
  dts: false,
  define: {
    BUILTIN_CHECK_SLUGS: JSON.stringify(builtinCheckSlugs),
  },
  outputOptions: {
    banner: '#!/usr/bin/env node',
  },
});
