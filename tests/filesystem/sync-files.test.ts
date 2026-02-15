import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

/**
 * These tests exercise the sync-files filesystem functions directly by importing
 * them, rather than running through the CLI subprocess like package.test.ts does.
 *
 * sync-files.ts imports getDefaultsDir from config.ts, and config.ts uses
 * import.meta.url at the module level. import.meta.url is an ESM-only construct
 * that doesn't exist in CommonJS, so it throws when ts-jest compiles config.ts
 * under the CommonJS test environment. The CLI subprocess tests avoid this because
 * they run the built dist/cli.js (real ESM) in a child process where
 * import.meta.url works natively.
 */
jest.mock('../../src/config', () => ({
  getDefaultsDir: () => path.resolve(__dirname, '..', '..', 'defaults'),
}));

import {
  filterSyncFiles,
  extractExportIgnorePatterns,
  writeSyncFile,
  buildSyncFiles,
  cleanSyncFiles,
  getIgnorePatterns,
  getIncludePatterns,
  getDistfilesPatterns,
  getSourceDir,
  syncFiles,
} from '../../src/filesystem/sync-files';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pup-sync-test-'));
});

afterEach(() => {
  fs.removeSync(tmpDir);
});

describe('filterSyncFiles', () => {
  it('should return entries containing the given filename', () => {
    const syncFiles = ['.distfiles', '.distinclude', '.distignore', '.gitattributes', 'admin/.distfiles'];
    expect(filterSyncFiles(syncFiles, '.distfiles')).toEqual(['.distfiles', 'admin/.distfiles']);
  });

  it('should return empty array when no entries match', () => {
    const syncFiles = ['.distignore', '.gitattributes'];
    expect(filterSyncFiles(syncFiles, '.distfiles')).toEqual([]);
  });

  it('should match .gitattributes entries', () => {
    const syncFiles = ['.distfiles', '.gitattributes', 'sub/.gitattributes'];
    expect(filterSyncFiles(syncFiles, '.gitattributes')).toEqual(['.gitattributes', 'sub/.gitattributes']);
  });
});

describe('extractExportIgnorePatterns', () => {
  it('should extract export-ignore patterns', () => {
    const content = 'other-file.php export-ignore\nsrc/ export-ignore\n';
    expect(extractExportIgnorePatterns(content)).toBe('other-file.php\nsrc/');
  });

  it('should return empty string when no export-ignore lines exist', () => {
    const content = '*.txt text\n*.jpg binary\n';
    expect(extractExportIgnorePatterns(content)).toBe('');
  });

  it('should return empty string for empty content', () => {
    expect(extractExportIgnorePatterns('')).toBe('');
  });

  it('should handle mixed lines', () => {
    const content = '*.txt text\nother-file.php export-ignore\n*.jpg binary\n';
    expect(extractExportIgnorePatterns(content)).toBe('other-file.php');
  });
});

describe('writeSyncFile', () => {
  it('should write root-level file contents to target', () => {
    fs.writeFileSync(path.join(tmpDir, '.distfiles'), 'bootstrap.php\npackage.json\n');

    writeSyncFile(tmpDir, ['.distfiles'], '.pup-distfiles', '.distfiles');

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distfiles'), 'utf-8');
    expect(result).toContain('bootstrap.php');
    expect(result).toContain('package.json');
  });

  it('should apply transform function', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.gitattributes'),
      '*.txt text\nother-file.php export-ignore\n'
    );

    writeSyncFile(
      tmpDir,
      ['.gitattributes'],
      '.pup-distignore',
      '.gitattributes',
      extractExportIgnorePatterns
    );

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distignore'), 'utf-8');
    expect(result).toContain('other-file.php');
    expect(result).not.toContain('*.txt');
  });

  it('should prefix lines from subdirectory sync files', () => {
    fs.mkdirpSync(path.join(tmpDir, 'admin'));
    fs.writeFileSync(path.join(tmpDir, 'admin', '.distfiles'), 'plugin.php\nlib/\n');

    writeSyncFile(tmpDir, ['admin/.distfiles'], '.pup-distfiles', '.distfiles');

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distfiles'), 'utf-8');
    expect(result).toContain('admin/plugin.php');
    expect(result).toContain('admin/lib/');
  });

  it('should handle absolute-path lines in subdirectory files', () => {
    fs.mkdirpSync(path.join(tmpDir, 'admin'));
    fs.writeFileSync(path.join(tmpDir, 'admin', '.distfiles'), '/root-file.php\n');

    writeSyncFile(tmpDir, ['admin/.distfiles'], '.pup-distfiles', '.distfiles');

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distfiles'), 'utf-8');
    expect(result).toContain('admin/root-file.php');
  });

  it('should deduplicate lines from subdirectory files', () => {
    fs.mkdirpSync(path.join(tmpDir, 'admin'));
    fs.writeFileSync(path.join(tmpDir, 'admin', '.distfiles'), 'plugin.php\nplugin.php\n');

    writeSyncFile(tmpDir, ['admin/.distfiles'], '.pup-distfiles', '.distfiles');

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distfiles'), 'utf-8');
    const matches = result.match(/admin\/plugin\.php/g);
    expect(matches).toHaveLength(1);
  });

  it('should append from multiple files', () => {
    fs.writeFileSync(path.join(tmpDir, '.distignore'), 'node_modules\n');
    fs.mkdirpSync(path.join(tmpDir, 'admin'));
    fs.writeFileSync(path.join(tmpDir, 'admin', '.distignore'), 'vendor/\n');

    writeSyncFile(tmpDir, ['.distignore'], '.pup-distignore', '.distignore');
    writeSyncFile(tmpDir, ['admin/.distignore'], '.pup-distignore', '.distignore');

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distignore'), 'utf-8');
    expect(result).toContain('node_modules');
    expect(result).toContain('admin/vendor/');
  });

  it('should skip missing files', () => {
    writeSyncFile(tmpDir, ['.distfiles'], '.pup-distfiles', '.distfiles');
    expect(fs.existsSync(path.join(tmpDir, '.pup-distfiles'))).toBe(false);
  });

  it('should read from absolute paths for default files', () => {
    const defaultsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pup-defaults-'));
    const defaultFile = path.join(defaultsDir, '.distignore-defaults');
    fs.writeFileSync(defaultFile, 'node_modules\n.git\n');

    writeSyncFile(tmpDir, [defaultFile], '.pup-distignore', '.distignore-defaults');

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distignore'), 'utf-8');
    expect(result).toContain('node_modules');
    expect(result).toContain('.git');

    fs.removeSync(defaultsDir);
  });
});

describe('buildSyncFiles', () => {
  // Mock config object with the methods buildSyncFiles needs
  function makeConfig(overrides: {
    syncFiles?: string[];
    useDefaultIgnore?: boolean;
  } = {}) {
    return {
      getSyncFiles: () =>
        overrides.syncFiles ?? ['.distfiles', '.distinclude', '.distignore', '.gitattributes'],
      getZipUseDefaultIgnore: () => overrides.useDefaultIgnore ?? false,
    } as any;
  }

  it('should generate .pup-distfiles from .distfiles', () => {
    fs.writeFileSync(path.join(tmpDir, '.distfiles'), 'bootstrap.php\n');

    buildSyncFiles(tmpDir, makeConfig());

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distfiles'), 'utf-8');
    expect(result).toContain('bootstrap.php');
  });

  it('should generate .pup-distinclude from .distinclude', () => {
    fs.writeFileSync(path.join(tmpDir, '.distinclude'), 'vendor/important.php\n');

    buildSyncFiles(tmpDir, makeConfig());

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distinclude'), 'utf-8');
    expect(result).toContain('vendor/important.php');
  });

  it('should generate .pup-distignore from .distignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.distignore'), 'node_modules\n');

    buildSyncFiles(tmpDir, makeConfig());

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distignore'), 'utf-8');
    expect(result).toContain('node_modules');
  });

  it('should merge .gitattributes export-ignore into .pup-distignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.distignore'), 'node_modules\n');
    fs.writeFileSync(path.join(tmpDir, '.gitattributes'), 'other-file.php export-ignore\n');

    buildSyncFiles(tmpDir, makeConfig());

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distignore'), 'utf-8');
    expect(result).toContain('node_modules');
    expect(result).toContain('other-file.php');
  });

  it('should append .distignore-defaults when useDefaultIgnore is true', () => {
    fs.writeFileSync(path.join(tmpDir, '.distignore'), 'custom-ignore\n');

    buildSyncFiles(tmpDir, makeConfig({ useDefaultIgnore: true }));

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distignore'), 'utf-8');
    expect(result).toContain('custom-ignore');
    // The defaults file contains common patterns like .git, node_modules
    expect(result).toContain('.git');
  });

  it('should not append .distignore-defaults when useDefaultIgnore is false', () => {
    fs.writeFileSync(path.join(tmpDir, '.distignore'), 'custom-ignore\n');

    buildSyncFiles(tmpDir, makeConfig({ useDefaultIgnore: false }));

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distignore'), 'utf-8');
    expect(result).toContain('custom-ignore');
    expect(result).not.toContain('.gitattributes');
  });

  it('should handle subdirectory sync files with path prefixing', () => {
    fs.mkdirpSync(path.join(tmpDir, 'admin'));
    fs.writeFileSync(path.join(tmpDir, '.distfiles'), 'bootstrap.php\n');
    fs.writeFileSync(path.join(tmpDir, 'admin', '.distfiles'), 'admin-plugin.php\n');

    buildSyncFiles(tmpDir, makeConfig({ syncFiles: ['.distfiles', 'admin/.distfiles', '.distinclude', '.distignore', '.gitattributes'] }));

    const result = fs.readFileSync(path.join(tmpDir, '.pup-distfiles'), 'utf-8');
    expect(result).toContain('bootstrap.php');
    expect(result).toContain('admin/admin-plugin.php');
  });

  it('should clean existing .pup-* files before generating', () => {
    fs.writeFileSync(path.join(tmpDir, '.pup-distfiles'), 'stale-content\n');

    buildSyncFiles(tmpDir, makeConfig());

    // .pup-distfiles should not exist since no .distfiles source exists
    expect(fs.existsSync(path.join(tmpDir, '.pup-distfiles'))).toBe(false);
  });
});

describe('cleanSyncFiles', () => {
  it('should remove all .pup-* files', () => {
    fs.writeFileSync(path.join(tmpDir, '.pup-distfiles'), 'content');
    fs.writeFileSync(path.join(tmpDir, '.pup-distinclude'), 'content');
    fs.writeFileSync(path.join(tmpDir, '.pup-distignore'), 'content');

    cleanSyncFiles(tmpDir);

    expect(fs.existsSync(path.join(tmpDir, '.pup-distfiles'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.pup-distinclude'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.pup-distignore'))).toBe(false);
  });

  it('should not error when files do not exist', () => {
    expect(() => cleanSyncFiles(tmpDir)).not.toThrow();
  });
});

describe('reader functions (after buildSyncFiles)', () => {
  function makeConfig(overrides: {
    syncFiles?: string[];
    useDefaultIgnore?: boolean;
  } = {}) {
    return {
      getSyncFiles: () =>
        overrides.syncFiles ?? ['.distfiles', '.distinclude', '.distignore', '.gitattributes'],
      getZipUseDefaultIgnore: () => overrides.useDefaultIgnore ?? false,
    } as any;
  }

  it('getDistfilesPatterns should return null when no .pup-distfiles exists', () => {
    expect(getDistfilesPatterns(tmpDir)).toBeNull();
  });

  it('getDistfilesPatterns should return patterns from .pup-distfiles', () => {
    fs.writeFileSync(path.join(tmpDir, '.distfiles'), 'bootstrap.php\npackage.json\n');
    buildSyncFiles(tmpDir, makeConfig());

    const result = getDistfilesPatterns(tmpDir);
    expect(result).toEqual(['bootstrap.php', 'package.json']);
  });

  it('getIncludePatterns should return patterns from .pup-distinclude', () => {
    fs.writeFileSync(path.join(tmpDir, '.distinclude'), 'vendor/important.php\n');
    buildSyncFiles(tmpDir, makeConfig());

    const result = getIncludePatterns(tmpDir);
    expect(result).toEqual(['vendor/important.php']);
  });

  it('getIncludePatterns should return empty array when no .pup-distinclude exists', () => {
    expect(getIncludePatterns(tmpDir)).toEqual([]);
  });

  it('getIgnorePatterns should return patterns from .pup-distignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.distignore'), 'node_modules\ntests/\n');
    buildSyncFiles(tmpDir, makeConfig());

    const result = getIgnorePatterns(tmpDir);
    expect(result).toContain('node_modules');
    expect(result).toContain('tests/');
  });

  it('getIgnorePatterns should return empty array when no .pup-distignore exists', () => {
    expect(getIgnorePatterns(tmpDir)).toEqual([]);
  });

  it('getIgnorePatterns should include .gitattributes export-ignore patterns', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitattributes'), 'other-file.php export-ignore\n');
    buildSyncFiles(tmpDir, makeConfig());

    const result = getIgnorePatterns(tmpDir);
    expect(result).toContain('other-file.php');
  });

  it('getIgnorePatterns should deduplicate patterns', () => {
    fs.writeFileSync(path.join(tmpDir, '.distignore'), 'node_modules\n');
    fs.writeFileSync(path.join(tmpDir, '.gitattributes'), 'node_modules export-ignore\n');
    buildSyncFiles(tmpDir, makeConfig());

    const result = getIgnorePatterns(tmpDir);
    const nodeModulesCount = result.filter((p) => p === 'node_modules').length;
    expect(nodeModulesCount).toBe(1);
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
