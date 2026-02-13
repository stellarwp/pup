import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import {
  isInside,
  trailingSlashIt,
  rmdir,
  resolveRelativePath,
} from '../../src/utils/directory.js';

describe('isInside', () => {
  it('should return true for a child inside the parent', () => {
    expect(isInside('/home/user/project', '/home/user/project/src')).toBe(true);
  });

  it('should return true for a deeply nested child', () => {
    expect(isInside('/home/user/project', '/home/user/project/src/utils/file')).toBe(true);
  });

  it('should return false for a path outside the parent', () => {
    expect(isInside('/home/user/project', '/home/user/other')).toBe(false);
  });

  it('should return false for the same directory', () => {
    expect(isInside('/home/user/project', '/home/user/project')).toBe(false);
  });

  it('should return false for a parent of the given directory', () => {
    expect(isInside('/home/user/project', '/home/user')).toBe(false);
  });
});

describe('trailingSlashIt', () => {
  it('should add a trailing separator to a directory path', () => {
    const result = trailingSlashIt('/home/user/project');
    expect(result.endsWith(path.sep)).toBe(true);
  });

  it('should handle a path that already ends with a separator', () => {
    const result = trailingSlashIt(`/home/user/project${path.sep}`);
    expect(result).toBe(`/home/user/project${path.sep}`);
  });

  it('should throw for a file path with an extension', () => {
    expect(() => trailingSlashIt('/home/user/project/file.txt')).toThrow(
      'Could not add trailing slash to file path.'
    );
  });

  it('should handle a relative directory path', () => {
    const result = trailingSlashIt('src/utils');
    expect(result.endsWith(path.sep)).toBe(true);
  });
});

describe('rmdir', () => {
  let tempDir: string;
  let workingDir: string;

  beforeEach(() => {
    workingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pup-rmdir-'));
    tempDir = path.join(workingDir, 'subdir');
    fs.mkdirSync(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(workingDir)) {
      fs.removeSync(workingDir);
    }
  });

  it('should remove a directory inside the working directory', async () => {
    expect(fs.existsSync(tempDir)).toBe(true);
    await rmdir(tempDir, workingDir);
    expect(fs.existsSync(tempDir)).toBe(false);
  });

  it('should not throw if the directory does not exist', async () => {
    const nonExistent = path.join(workingDir, 'does-not-exist');
    await expect(rmdir(nonExistent, workingDir)).resolves.toBeUndefined();
  });

  it('should throw for a directory outside the working directory', async () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pup-outside-'));
    try {
      await expect(rmdir(outsideDir, workingDir)).rejects.toThrow(
        'Refusing to remove directory outside working directory'
      );
    } finally {
      fs.removeSync(outsideDir);
    }
  });

  it('should throw when trying to remove the working directory itself', async () => {
    await expect(rmdir(workingDir, workingDir)).rejects.toThrow(
      'Refusing to remove directory outside working directory'
    );
  });
});

describe('resolveRelativePath', () => {
  const workingDir = '/home/user/project';

  it('should join a relative path with the working directory', () => {
    expect(resolveRelativePath('src/utils', workingDir)).toBe(
      path.join(workingDir, 'src/utils')
    );
  });

  it('should throw for an absolute path even if inside the working directory', () => {
    const fullPath = path.join(workingDir, 'src/utils');
    expect(() => resolveRelativePath(fullPath, workingDir)).toThrow(
      'Absolute paths are not allowed in the .puprc file.'
    );
  });

  it('should throw for an absolute path without a default', () => {
    expect(() => resolveRelativePath('/etc/passwd', workingDir)).toThrow(
      'Absolute paths are not allowed in the .puprc file.'
    );
  });

  it('should use the default path when an absolute path is given with a default', () => {
    expect(resolveRelativePath('/etc/passwd', workingDir, '.pup-build')).toBe(
      path.join(workingDir, '.pup-build')
    );
  });
});
