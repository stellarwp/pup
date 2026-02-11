import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  writePuprc,
  getPuprc,
  fakeProjectDir,
  fakeProjectWithTbdsDir,
} from '../helpers/setup.js';

describe('zip command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should zip with --no-clone', async () => {
    const result = await runPup('zip --no-clone');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('[version-conflict]');

    // Check for zip file
    const entries = fs.readdirSync(fakeProjectDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should zip with --no-clone --dev', async () => {
    const result = await runPup('zip --no-clone --dev');
    expect(result.exitCode).toBe(0);

    const entries = fs.readdirSync(fakeProjectDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should fail zip when check has errors', async () => {
    writeDefaultPuprc(fakeProjectWithTbdsDir);

    const result = await runPup('zip --no-clone', { cwd: fakeProjectWithTbdsDir });
    expect(result.exitCode).not.toBe(0);
  });

  it('should zip when check has errors but set to warn', async () => {
    const puprc = getPuprc();
    puprc.checks = {
      tbd: {
        fail_method: 'warn',
      },
      'version-conflict': {},
    };
    writePuprc(puprc, fakeProjectWithTbdsDir);

    const result = await runPup('zip --no-clone', { cwd: fakeProjectWithTbdsDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('[version-conflict]');

    const entries = fs.readdirSync(fakeProjectWithTbdsDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should zip with --no-clone --no-check', async () => {
    writeDefaultPuprc(fakeProjectWithTbdsDir);

    const result = await runPup('zip --no-clone --no-check', { cwd: fakeProjectWithTbdsDir });
    expect(result.exitCode).toBe(0);

    const entries = fs.readdirSync(fakeProjectWithTbdsDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should skip build with --no-build', async () => {
    const result = await runPup('zip --no-clone --no-build');
    expect(result.exitCode).toBe(0);
  });
});
