import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  fixedExtension: false,
  sourcemap: true,
  dts: false,
  outputOptions: {
    banner: '#!/usr/bin/env node',
  },
});
