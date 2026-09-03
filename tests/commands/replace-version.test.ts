import path from 'node:path';
import { execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

/**
 * Turns a temp project into a git repository with a single commit, so the dev
 * suffix has a real HEAD timestamp and hash to read.
 *
 * @param {string} dir - The project directory to initialize.
 *
 * @returns {void}
 */
function initGitRepo(dir: string): void {
  const run = (args: string[]): void => {
    execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  };

  run(['init']);
  run(['config', 'user.email', 'test@example.com']);
  run(['config', 'user.name', 'Test']);
  run(['config', 'commit.gpgsign', 'false']);
  run(['add', '-A']);
  run(['commit', '-m', 'initial']);
}

describe('replace-version command', () => {
  afterEach(() => {
    cleanupTempProjects();
  });

  it('should replace the version in every configured version file', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);

    const result = await runPup('replace-version 2.5.0', { cwd: projectDir });

    expect(result.exitCode).toBe(0);

    const bootstrap = fs.readFileSync(
      path.join(projectDir, 'bootstrap.php'),
      'utf-8'
    );
    const plugin = fs.readFileSync(
      path.join(projectDir, 'src', 'Plugin.php'),
      'utf-8'
    );
    const pkg = fs.readFileSync(
      path.join(projectDir, 'package.json'),
      'utf-8'
    );

    expect(bootstrap).toContain("define( 'FAKE_PROJECT_VERSION', '2.5.0' );");
    expect(bootstrap).toContain('Version: 2.5.0');
    expect(plugin).toContain("const VERSION = '2.5.0';");
    expect(pkg).toContain('"version": "2.5.0"');
  });

  it('should report each file it updated', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);

    const result = await runPup('replace-version 2.5.0', { cwd: projectDir });

    expect(result.output).toContain('bootstrap.php');
    expect(result.output).toContain('src/Plugin.php');
    expect(result.output).toContain('package.json');
    expect(result.output).toContain('2.5.0');
  });

  it('should leave the changes in place rather than reverting them', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);

    await runPup('replace-version 2.5.0', { cwd: projectDir });

    const bootstrap = fs.readFileSync(
      path.join(projectDir, 'bootstrap.php'),
      'utf-8'
    );

    expect(bootstrap).not.toContain("'1.0.0'");
  });

  it('should append the dev suffix with --dev', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
    initGitRepo(projectDir);

    const result = await runPup('replace-version 2.5.0 --dev', {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(0);

    const bootstrap = fs.readFileSync(
      path.join(projectDir, 'bootstrap.php'),
      'utf-8'
    );

    expect(bootstrap).toMatch(
      /FAKE_PROJECT_VERSION', '2\.5\.0-dev-\d+-[0-9a-f]+'/
    );
  });

  it('should fail when no version files are configured', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({ paths: { versions: [] } }), projectDir);

    const result = await runPup('replace-version 2.5.0', { cwd: projectDir });

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('No version files found');
  });

  it('should write a version containing regex replacement tokens literally', async () => {
    const projectDir = createTempProject();
    writePuprc(
      getPuprc({
        paths: {
          versions: [
            {
              file: 'src/Plugin.php',
              regex: "(const VERSION = ['\"])([^'\"]+)",
            },
          ],
        },
      }),
      projectDir
    );

    const result = await runPup('replace-version 2.0.0-$1', {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(0);

    const plugin = fs.readFileSync(
      path.join(projectDir, 'src', 'Plugin.php'),
      'utf-8'
    );

    expect(plugin).toContain("const VERSION = '2.0.0-$1';");
  });

  it('should skip a file whose regex does not match under --root', async () => {
    const projectDir = createTempProject();
    writePuprc(
      getPuprc({
        paths: {
          versions: [
            { file: 'src/Plugin.php', regex: "(const VERSION = ['\"])([^'\"]+)" },
          ],
        },
      }),
      projectDir
    );

    // The config is validated against the working directory's copy, so the
    // no-match path is only reachable through a --root whose copy differs.
    const rootDir = path.join(projectDir, 'build');
    fs.mkdirpSync(path.join(rootDir, 'src'));
    fs.writeFileSync(
      path.join(rootDir, 'src', 'Plugin.php'),
      '<?php\n\nnamespace FakeProject;\n\nclass Plugin {\n}\n'
    );

    const result = await runPup(`replace-version 2.5.0 --root ${rootDir}`, {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No version found in src/Plugin.php');
    expect(result.output).toContain('Skipping');
  });
});
