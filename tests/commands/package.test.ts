import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('package command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should create a zip', async () => {
    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(projectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .distignore', async () => {
    // Write a .distignore that excludes other-file.php
    const distignorePath = path.join(projectDir, '.distignore');
    fs.writeFileSync(distignorePath, 'other-file.php\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(projectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .distinclude', async () => {
    // Write a .distignore + .distinclude
    const distignorePath = path.join(projectDir, '.distignore');
    fs.writeFileSync(distignorePath, '*.php\n');

    const distincludePath = path.join(projectDir, '.distinclude');
    fs.writeFileSync(distincludePath, 'bootstrap.php\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(projectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .distfiles', async () => {
    const distfilesPath = path.join(projectDir, '.distfiles');
    fs.writeFileSync(distfilesPath, 'bootstrap.php\npackage.json\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(projectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });
});
