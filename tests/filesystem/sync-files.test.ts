import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

jest.mock('../../src/config.ts', () => ({
  getDefaultsDir: () => '/mock/defaults',
}));

import {
  getDefaultIgnoreLines,
  getSourceDir,
  syncFiles,
} from '../../src/filesystem/sync-files.js';

describe('getDefaultIgnoreLines', () => {
  it('should return .puprc, .pup-*, and the zip dir from config', () => {
    const config = {
      getZipDir: (fullPath = true) => fullPath ? '/abs/.pup-zip' : '.pup-zip',
    } as Parameters<typeof getDefaultIgnoreLines>[0];

    const result = getDefaultIgnoreLines(config);
    expect(result).toEqual(['.puprc', '.pup-*', '.pup-zip']);
  });

  it('should use a custom zip dir from config', () => {
    const config = {
      getZipDir: (fullPath = true) => fullPath ? '/abs/custom-zip' : 'custom-zip',
    } as Parameters<typeof getDefaultIgnoreLines>[0];

    const result = getDefaultIgnoreLines(config);
    expect(result).toEqual(['.puprc', '.pup-*', 'custom-zip']);
  });
});

describe('getSourceDir', () => {
  it('should return workingDir when root is undefined', () => {
    expect(getSourceDir(undefined, '/home/user/project')).toBe('/home/user/project');
  });

  it('should return workingDir when root is "."', () => {
    expect(getSourceDir('.', '/home/user/project')).toBe('/home/user/project');
  });

  it('should return trailing-slashed root when root is an absolute path', () => {
    expect(getSourceDir('/home/user/build', '/home/user/project')).toBe('/home/user/build/');
  });

  it('should return trailing-slashed root when root contains workingDir', () => {
    expect(getSourceDir('/home/user/project/.pup-build', '/home/user/project')).toBe('/home/user/project/.pup-build/');
  });
});

describe('syncFiles', () => {
  let sourceDir: string;
  let destDir: string;

  beforeEach(() => {
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pup-sync-src-'));
    destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pup-sync-dest-'));

    // Create test files
    fs.writeFileSync(path.join(sourceDir, 'file-a.txt'), 'a');
    fs.writeFileSync(path.join(sourceDir, 'file-b.php'), 'b');
    fs.mkdirpSync(path.join(sourceDir, 'src'));
    fs.writeFileSync(path.join(sourceDir, 'src', 'app.ts'), 'app');
  });

  afterEach(() => {
    fs.removeSync(sourceDir);
    fs.removeSync(destDir);
  });

  it('should copy all files when no patterns are provided', async () => {
    await syncFiles(sourceDir, destDir, null, [], []);

    expect(fs.existsSync(path.join(destDir, 'file-a.txt'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'file-b.php'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'src', 'app.ts'))).toBe(true);
  });

  it('should respect ignore patterns', async () => {
    await syncFiles(sourceDir, destDir, null, ['*.txt'], []);

    expect(fs.existsSync(path.join(destDir, 'file-a.txt'))).toBe(false);
    expect(fs.existsSync(path.join(destDir, 'file-b.php'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'src', 'app.ts'))).toBe(true);
  });

  it('should respect distfiles allowlist', async () => {
    await syncFiles(sourceDir, destDir, ['file-a.txt'], [], []);

    expect(fs.existsSync(path.join(destDir, 'file-a.txt'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'file-b.php'))).toBe(false);
    expect(fs.existsSync(path.join(destDir, 'src', 'app.ts'))).toBe(false);
  });

  it('should respect include patterns as a filter', async () => {
    await syncFiles(sourceDir, destDir, null, [], ['file-a.txt']);

    expect(fs.existsSync(path.join(destDir, 'file-a.txt'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'file-b.php'))).toBe(false);
  });

  it('should move negated ignore patterns to the include allowlist', async () => {
    await syncFiles(sourceDir, destDir, null, ['!file-a.txt'], []);

    // !file-a.txt migrates to the include allowlist, so only file-a.txt is included
    expect(fs.existsSync(path.join(destDir, 'file-a.txt'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'file-b.php'))).toBe(false);
    expect(fs.existsSync(path.join(destDir, 'src', 'app.ts'))).toBe(false);
  });

  it('should ignore directory patterns', async () => {
    await syncFiles(sourceDir, destDir, null, ['src/'], []);

    expect(fs.existsSync(path.join(destDir, 'file-a.txt'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'file-b.php'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'src', 'app.ts'))).toBe(false);
  });
});
