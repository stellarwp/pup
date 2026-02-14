import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { executeTbdCheck } from '../../../src/commands/checks/tbd.ts';
import type { CheckConfig } from '../../../src/types.ts';

/**
 * Creates a temp directory with a src/ subdirectory containing a single file.
 *
 * @param {string} filename - The name of the file to create.
 * @param {string} content - The content of the file.
 *
 * @returns {string} The path to the temp directory.
 */
function createTbdFixture(filename: string, content: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pup-tbd-pattern-'));
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', filename), content);
  tempDirs.push(tmpDir);
  return tmpDir;
}

function makeConfig(overrides: Partial<CheckConfig> = {}): CheckConfig {
  return {
    slug: 'tbd',
    fail_method: 'error',
    fail_method_dev: 'warn',
    type: 'pup',
    args: {},
    ...overrides,
  };
}

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      fs.removeSync(dir);
    }
  }
  tempDirs.length = 0;
});

describe('tbd pattern matching', () => {
  describe('@since/@deprecated/@version docblock tags', () => {
    it('should match @since TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '/**',
        ' * @since TBD',
        ' */',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match @deprecated TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '/**',
        ' * @deprecated TBD',
        ' */',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match @version TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '/**',
        ' * @version TBD',
        ' */',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match case-insensitively', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '/**',
        ' * @since tbd',
        ' */',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should not match other docblock tags', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '/**',
        ' * @param TBD',
        ' */',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(true);
    });
  });

  describe('WordPress deprecation functions', () => {
    it('should match _deprecated_function with single-quoted TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        "_deprecated_function( __METHOD__, 'TBD' );",
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match _deprecated_file with single-quoted TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        "_deprecated_file( __FILE__, 'TBD' );",
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match _deprecated_hook with double-quoted TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '_deprecated_hook( "my_hook", "TBD" );',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match case-insensitively', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        "_deprecated_function( __METHOD__, 'tbd' );",
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });
  });

  describe('standalone quoted TBD', () => {
    it('should match single-quoted TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        "$version = 'TBD';",
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match double-quoted TBD', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        'return "TBD";',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });

    it('should match case-insensitively', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        "$version = 'tbd';",
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(false);
    });
  });

  describe('non-matching cases', () => {
    it('should not match bare TBD in a comment', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '// TBD some other stuff',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(true);
    });

    it('should not match TBD as part of a variable name', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        '$tbdValue = 1;',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(true);
    });

    it('should not match TBD inside a longer string', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        "$msg = 'This is TBD for now';",
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(true);
    });

    it('should succeed when file has no TBD markers', async () => {
      const dir = createTbdFixture('Test.php', [
        '<?php',
        'class Clean {',
        '  const VERSION = "1.0.0";',
        '}',
      ].join('\n'));

      const result = await executeTbdCheck(makeConfig(), dir);
      expect(result.success).toBe(true);
    });
  });
});
