import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('replace-tbd command', () => {
  afterEach(() => {
    cleanupTempProjects();
  });

  it('should replace every TBD placeholder with the version', async () => {
    const dir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    const result = await runPup('replace-tbd 1.4.0', { cwd: dir });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(
      'Replaced 10 TBD occurrence(s) across 2 file(s) with 1.4.0.'
    );

    const plugin = fs.readFileSync(
      path.join(dir, 'src', 'Plugin.php'),
      'utf-8'
    );
    expect(plugin).toContain('@since 1.4.0');
    expect(plugin).not.toMatch(/tbd/i);

    const another = fs.readFileSync(
      path.join(dir, 'src', 'Thing', 'AnotherFile.php'),
      'utf-8'
    );
    expect(another).toContain("_deprecated_file( __FILE__, '1.4.0' );");
    expect(another).toContain("_deprecated_function( __METHOD__, '1.4.0' );");
    expect(another).toContain('@deprecated 1.4.0');
    expect(another).not.toMatch(/tbd/i);
  });

  it('should resolve exactly what check:tbd reports', async () => {
    const dir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    const before = await runPup('check:tbd', { cwd: dir });
    expect(before.exitCode).not.toBe(0);

    await runPup('replace-tbd 1.4.0', { cwd: dir });

    const after = await runPup('check:tbd', { cwd: dir });
    expect(after.exitCode).toBe(0);
    expect(after.output).toContain('No TBDs found!');
  });

  it('should not write anything with --dry-run', async () => {
    const dir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    const pluginPath = path.join(dir, 'src', 'Plugin.php');
    const original = fs.readFileSync(pluginPath, 'utf-8');

    const result = await runPup('replace-tbd 1.4.0 --dry-run', { cwd: dir });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[dry-run]');
    expect(result.output).toContain(
      'Would replace 10 TBD occurrence(s) across 2 file(s).'
    );
    expect(fs.readFileSync(pluginPath, 'utf-8')).toBe(original);
  });

  it('should report when there is nothing to replace', async () => {
    const dir = createTempProject();
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    const result = await runPup('replace-tbd 1.4.0', { cwd: dir });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No TBDs found to replace.');
  });

  it('should leave a non-placeholder tbd in prose untouched', async () => {
    const dir = createTempProject();
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    fs.writeFileSync(
      path.join(dir, 'src', 'Prose.php'),
      [
        '<?php',
        '/**',
        ' * @since 5.0.0 reworked the tbd handler',
        ' */',
        "$status = 'tbd'; // resolve tbd later",
        '',
      ].join('\n')
    );

    const result = await runPup('replace-tbd 1.4.0', { cwd: dir });
    expect(result.exitCode).toBe(0);

    const contents = fs.readFileSync(
      path.join(dir, 'src', 'Prose.php'),
      'utf-8'
    );

    // The resolved tag and its prose are untouched.
    expect(contents).toContain('@since 5.0.0 reworked the tbd handler');
    // The quoted placeholder is resolved.
    expect(contents).toContain("$status = '1.4.0';");
    // The unrelated word in the trailing comment survives.
    expect(contents).toContain('// resolve tbd later');
  });

  it('should write a version containing regex tokens literally', async () => {
    const dir = createTempProject();
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    fs.writeFileSync(
      path.join(dir, 'src', 'Tokens.php'),
      ['<?php', '/**', ' * @since TBD', ' */', ''].join('\n')
    );

    const result = await runPup('replace-tbd 2.0.0-$1', { cwd: dir });
    expect(result.exitCode).toBe(0);

    const contents = fs.readFileSync(
      path.join(dir, 'src', 'Tokens.php'),
      'utf-8'
    );
    expect(contents).toContain('@since 2.0.0-$1');
  });

  it('should count multiple placeholders on one line', async () => {
    const dir = createTempProject();
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    fs.writeFileSync(
      path.join(dir, 'src', 'Multi.php'),
      ['<?php', "$versions = array( 'TBD', 'TBD' );", ''].join('\n')
    );

    const result = await runPup('replace-tbd 1.4.0', { cwd: dir });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(
      'Replaced 2 TBD occurrence(s) across 1 file(s) with 1.4.0.'
    );
    expect(
      fs.readFileSync(path.join(dir, 'src', 'Multi.php'), 'utf-8')
    ).toContain("array( '1.4.0', '1.4.0' );");
  });

  it('should only scan files under --root', async () => {
    const dir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), dir);

    const subdir = path.join(dir, 'subproject');
    fs.mkdirpSync(path.join(subdir, 'src'));
    fs.writeFileSync(
      path.join(subdir, 'src', 'Clean.php'),
      '<?php\nclass Clean {\n  const VERSION = "1.0.0";\n}\n'
    );

    const result = await runPup(`replace-tbd 1.4.0 --root ${subdir}`, {
      cwd: dir,
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No TBDs found to replace.');

    // The outer project's TBDs are untouched.
    const plugin = fs.readFileSync(
      path.join(dir, 'src', 'Plugin.php'),
      'utf-8'
    );
    expect(plugin).toContain('@since TBD');
  });
});
