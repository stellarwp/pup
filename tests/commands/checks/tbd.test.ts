import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../../helpers/setup.js';

describe('tbd check', () => {
  afterEach(() => {
    cleanupTempProjects();
  });

  it('should run tbd but not version-conflict when only tbd is configured', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({ checks: { tbd: {} } }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).not.toContain('[version-conflict]');
  });

  it('should run successful tbd check', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({ checks: { tbd: {} } }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd] Checking for TBDs...');
    expect(result.output).toContain('[tbd] No TBDs found!');
    expect(result.output).toContain('[tbd] Success! No TBDs found.');
  });

  it('should fail tbd check when tbds exist', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), tbdDir);

    const result = await runPup('check', { cwd: tbdDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('[tbd] Checking for TBDs...');
    expect(result.output).toContain('[tbd] src/Plugin.php');
    expect(result.output).toContain('[tbd] src/Thing/AnotherFile.php');
    expect(result.output).toContain('TBDs have been found!');
    expect(result.output).toContain("tbd's fail_method in .puprc is set to");
  });

  it('should use fail_method_dev when --dev is passed', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), tbdDir);

    // Default fail_method is 'error', but fail_method_dev is 'warn'
    const result = await runPup('check --dev', { cwd: tbdDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('TBDs have been found!');
  });

  it('should only scan files under --root subdirectory', async () => {
    const projectDir = createTempProject('fake-project-with-tbds');

    // Create a subdirectory with its own .puprc and a clean src/
    const subdir = path.join(projectDir, 'subproject');
    fs.mkdirSync(path.join(subdir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(subdir, 'src', 'Clean.php'),
      '<?php\nclass Clean {\n  const VERSION = "1.0.0";\n}\n'
    );
    writePuprc(getPuprc({ checks: { tbd: {} } }), subdir);

    // Without --root, the top-level src/ has TBDs
    writePuprc(getPuprc({ checks: { tbd: {} } }), projectDir);
    const topResult = await runPup('check', { cwd: projectDir });
    expect(topResult.exitCode).not.toBe(0);
    expect(topResult.output).toContain('TBDs have been found!');

    // With --root pointing to subproject/, only subproject/src/ is scanned
    const rootResult = await runPup(`check --root ${subdir}`, { cwd: projectDir });
    expect(rootResult.exitCode).toBe(0);
    expect(rootResult.output).toContain('[tbd] No TBDs found!');
  });

  it('should warn on tbd when fail_method is warn', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    const puprc = getPuprc();
    puprc.checks = {
      tbd: {
        fail_method: 'warn',
      },
    };
    writePuprc(puprc, tbdDir);

    const result = await runPup('check', { cwd: tbdDir });
    // Should succeed since tbd is set to warn
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('TBDs have been found!');
  });

  describe('pattern matching', () => {
    describe('@since/@deprecated/@version docblock tags', () => {
      it('should match @since TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '/**',
          ' * @since TBD',
          ' */',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match @deprecated TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '/**',
          ' * @deprecated TBD',
          ' */',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match @version TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '/**',
          ' * @version TBD',
          ' */',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match case-insensitively', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '/**',
          ' * @since tbd',
          ' */',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should not match other docblock tags', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '/**',
          ' * @param TBD',
          ' */',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('No TBDs found!');
      });
    });

    describe('WordPress deprecation functions', () => {
      it('should match _deprecated_function with single-quoted TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          "_deprecated_function( __METHOD__, 'TBD' );",
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match _deprecated_file with single-quoted TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          "_deprecated_file( __FILE__, 'TBD' );",
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match _deprecated_hook with double-quoted TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '_deprecated_hook( "my_hook", "TBD" );',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match case-insensitively', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          "_deprecated_function( __METHOD__, 'tbd' );",
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });
    });

    describe('standalone quoted TBD', () => {
      it('should match single-quoted TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          "$version = 'TBD';",
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match double-quoted TBD', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          'return "TBD";',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });

      it('should match case-insensitively', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          "$version = 'tbd';",
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain('TBDs have been found!');
      });
    });

    describe('non-matching cases', () => {
      it('should not match bare TBD in a comment', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '// TBD some other stuff',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('No TBDs found!');
      });

      it('should not match TBD as part of a variable name', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          '$tbdValue = 1;',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('No TBDs found!');
      });

      it('should not match TBD inside a longer string', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          "$msg = 'This is TBD for now';",
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('No TBDs found!');
      });

      it('should succeed when file has no TBD markers', async () => {
        const dir = createTempProject();
        writePuprc(getPuprc({ checks: { tbd: {} } }), dir);
        fs.writeFileSync(path.join(dir, 'src', 'Test.php'), [
          '<?php',
          'class Clean {',
          '  const VERSION = "1.0.0";',
          '}',
        ].join('\n'));

        const result = await runPup('check', { cwd: dir });
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('No TBDs found!');
      });
    });
  });
});
