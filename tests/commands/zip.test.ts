import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('zip command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should zip with --no-clone', async () => {
    const result = await runPup('zip --no-clone', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('[version-conflict]');

    // Check for zip file
    const entries = fs.readdirSync(projectDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should zip with --no-clone --dev', async () => {
    const result = await runPup('zip --no-clone --dev', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const entries = fs.readdirSync(projectDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should fail zip when check has errors', async () => {
    const tbdProjectDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc(), tbdProjectDir);

    const result = await runPup('zip --no-clone', { cwd: tbdProjectDir });
    expect(result.exitCode).not.toBe(0);
  });

  it('should zip when check has errors but set to warn', async () => {
    const tbdProjectDir = createTempProject('fake-project-with-tbds');
    const puprc = getPuprc();
    puprc.checks = {
      tbd: {
        fail_method: 'warn',
      },
      'version-conflict': {},
    };
    writePuprc(puprc, tbdProjectDir);

    const result = await runPup('zip --no-clone', { cwd: tbdProjectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('[version-conflict]');

    const entries = fs.readdirSync(tbdProjectDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should zip with --no-clone --no-check', async () => {
    const tbdProjectDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc(), tbdProjectDir);

    const result = await runPup('zip --no-clone --no-check', { cwd: tbdProjectDir });
    expect(result.exitCode).toBe(0);

    const entries = fs.readdirSync(tbdProjectDir);
    const zipFile = entries.find((e) => e.endsWith('.zip'));
    expect(zipFile).toBeDefined();
  });

  it('should skip build with --no-build', async () => {
    const result = await runPup('zip --no-clone --no-build', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
  });
});
