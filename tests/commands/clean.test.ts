import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('clean command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should clean temp directories', async () => {
    // Create temp directories that clean should remove
    const buildDir = path.join(projectDir, '.pup-build');
    const zipDir = path.join(projectDir, '.pup-zip');
    fs.ensureDirSync(buildDir);
    fs.ensureDirSync(zipDir);

    const result = await runPup('clean', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(buildDir)).toBe(false);
    expect(fs.existsSync(zipDir)).toBe(false);
  });
});
