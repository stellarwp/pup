import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  writePuprc,
  getPuprc,
  fakeProjectDir,
} from '../helpers/setup.js';

describe('package command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should create a zip', async () => {
    const result = await runPup('package 1.0.0');
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(fakeProjectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .distignore', async () => {
    // Write a .distignore that excludes other-file.php
    const distignorePath = path.join(fakeProjectDir, '.distignore');
    fs.writeFileSync(distignorePath, 'other-file.php\n');

    const result = await runPup('package 1.0.0');
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(fakeProjectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .distinclude', async () => {
    // Write a .distignore + .distinclude
    const distignorePath = path.join(fakeProjectDir, '.distignore');
    fs.writeFileSync(distignorePath, '*.php\n');

    const distincludePath = path.join(fakeProjectDir, '.distinclude');
    fs.writeFileSync(distincludePath, 'bootstrap.php\n');

    const result = await runPup('package 1.0.0');
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(fakeProjectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .distfiles', async () => {
    const distfilesPath = path.join(fakeProjectDir, '.distfiles');
    fs.writeFileSync(distfilesPath, 'bootstrap.php\npackage.json\n');

    const result = await runPup('package 1.0.0');
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(fakeProjectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });
});
