import { defineConfig } from 'tsup';
import fs from 'node:fs';

const builtinCheckSlugs = fs
  .readdirSync('src/commands/checks')
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''));

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    BUILTIN_CHECK_SLUGS: JSON.stringify(builtinCheckSlugs),
  },
});
