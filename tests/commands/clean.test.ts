import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  fakeProjectDir,
} from '../helpers/setup.js';

describe('clean command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should clean temp directories', async () => {
    // Create temp directories that clean should remove
    const buildDir = path.join(fakeProjectDir, '.pup-build');
    const zipDir = path.join(fakeProjectDir, '.pup-zip');
    fs.ensureDirSync(buildDir);
    fs.ensureDirSync(zipDir);

    const result = await runPup('clean');
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(buildDir)).toBe(false);
    expect(fs.existsSync(zipDir)).toBe(false);
  });
});
