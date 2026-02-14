import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('package command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should create a zip', async () => {
    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(projectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .distignore', async () => {
    // Write a .distignore that excludes other-file.php
    const distignorePath = path.join(projectDir, '.distignore');
    fs.writeFileSync(distignorePath, 'other-file.php\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(projectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should use .distinclude as a filter for candidate files', async () => {
    // .distinclude restricts which files are candidates for packaging
    const distincludePath = path.join(projectDir, '.distinclude');
    fs.writeFileSync(distincludePath, 'bootstrap.php\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    // bootstrap.php passes the include filter
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(true);
    // other-file.php is excluded because it doesn't match .distinclude
    expect(fs.existsSync(path.join(zipDir, 'other-file.php'))).toBe(false);
  });

  it('should not let .distinclude override .distignore', async () => {
    const distignorePath = path.join(projectDir, '.distignore');
    fs.writeFileSync(distignorePath, '*.php\n');

    const distincludePath = path.join(projectDir, '.distinclude');
    fs.writeFileSync(distincludePath, 'bootstrap.php\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    // bootstrap.php passes the include filter but is still excluded by .distignore
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(false);
  });

  it('should respect .distfiles', async () => {
    const distfilesPath = path.join(projectDir, '.distfiles');
    fs.writeFileSync(distfilesPath, 'bootstrap.php\npackage.json\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipPath = path.join(projectDir, 'fake-project.1.0.0.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should respect .gitattributes export-ignore for a single file', async () => {
    const gitattrsPath = path.join(projectDir, '.gitattributes');
    fs.writeFileSync(gitattrsPath, 'other-file.php export-ignore\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    expect(fs.existsSync(path.join(zipDir, 'other-file.php'))).toBe(false);
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(true);
  });

  it('should respect .gitattributes export-ignore for a directory', async () => {
    const gitattrsPath = path.join(projectDir, '.gitattributes');
    fs.writeFileSync(gitattrsPath, 'src/ export-ignore\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    expect(fs.existsSync(path.join(zipDir, 'src', 'Plugin.php'))).toBe(false);
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(true);
  });

  it('should respect .gitattributes export-ignore alongside .distignore', async () => {
    const gitattrsPath = path.join(projectDir, '.gitattributes');
    fs.writeFileSync(gitattrsPath, 'other-file.php export-ignore\n');

    const distignorePath = path.join(projectDir, '.distignore');
    fs.writeFileSync(distignorePath, 'src/\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    // other-file.php excluded by .gitattributes
    expect(fs.existsSync(path.join(zipDir, 'other-file.php'))).toBe(false);
    // src/ excluded by .distignore
    expect(fs.existsSync(path.join(zipDir, 'src', 'Plugin.php'))).toBe(false);
    // bootstrap.php still included
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(true);
  });

  it('should not let .distinclude override .gitattributes export-ignore', async () => {
    const gitattrsPath = path.join(projectDir, '.gitattributes');
    fs.writeFileSync(gitattrsPath, 'other-file.php export-ignore\n');

    const distincludePath = path.join(projectDir, '.distinclude');
    fs.writeFileSync(distincludePath, 'other-file.php\nbootstrap.php\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    // .gitattributes export-ignore still excludes the file despite .distinclude
    expect(fs.existsSync(path.join(zipDir, 'other-file.php'))).toBe(false);
    // bootstrap.php is included via .distinclude and not in export-ignore
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(true);
  });

  it('should ignore .gitattributes export-ignore when .distfiles is present', async () => {
    const gitattrsPath = path.join(projectDir, '.gitattributes');
    fs.writeFileSync(gitattrsPath, 'other-file.php export-ignore\n');

    const distfilesPath = path.join(projectDir, '.distfiles');
    fs.writeFileSync(distfilesPath, 'bootstrap.php\nother-file.php\n');

    const result = await runPup('package 1.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    // .distfiles is a whitelist; .gitattributes export-ignore is not applied
    expect(fs.existsSync(path.join(zipDir, 'other-file.php'))).toBe(true);
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(true);
  });

  it('should update version strings in packaged files', async () => {
    const result = await runPup('package 2.0.0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    const zippedBootstrap = fs.readFileSync(
      path.join(zipDir, 'bootstrap.php'),
      'utf-8'
    );
    expect(zippedBootstrap).toContain('2.0.0');
    expect(zippedBootstrap).not.toContain('1.0.0');
  });

  it('should sync files from --root directory instead of project root', async () => {
    // Create a build directory with a subset of files
    const buildDir = path.join(projectDir, '.pup-build');
    fs.mkdirpSync(path.join(buildDir, 'src'));
    fs.copyFileSync(
      path.join(projectDir, 'bootstrap.php'),
      path.join(buildDir, 'bootstrap.php')
    );
    fs.copyFileSync(
      path.join(projectDir, 'package.json'),
      path.join(buildDir, 'package.json')
    );
    fs.copyFileSync(
      path.join(projectDir, 'src', 'Plugin.php'),
      path.join(buildDir, 'src', 'Plugin.php')
    );

    const result = await runPup(`package 1.0.0 --root ${buildDir}`, {
      cwd: projectDir,
    });
    expect(result.exitCode).toBe(0);

    const zipDir = path.join(projectDir, '.pup-zip');
    // bootstrap.php was in the build dir and should be synced
    expect(fs.existsSync(path.join(zipDir, 'bootstrap.php'))).toBe(true);
    // other-file.php was NOT in the build dir and should not appear
    expect(fs.existsSync(path.join(zipDir, 'other-file.php'))).toBe(false);
  });

  it('should update version files in --root directory', async () => {
    // Create a build directory with version files
    const buildDir = path.join(projectDir, '.pup-build');
    fs.mkdirpSync(path.join(buildDir, 'src'));
    fs.copyFileSync(
      path.join(projectDir, 'bootstrap.php'),
      path.join(buildDir, 'bootstrap.php')
    );
    fs.copyFileSync(
      path.join(projectDir, 'package.json'),
      path.join(buildDir, 'package.json')
    );
    fs.copyFileSync(
      path.join(projectDir, 'src', 'Plugin.php'),
      path.join(buildDir, 'src', 'Plugin.php')
    );

    const result = await runPup(`package 2.0.0 --root ${buildDir}`, {
      cwd: projectDir,
    });
    expect(result.exitCode).toBe(0);

    // The original files should be untouched
    const originalBootstrap = fs.readFileSync(
      path.join(projectDir, 'bootstrap.php'),
      'utf-8'
    );
    expect(originalBootstrap).toContain('1.0.0');

    // The zip should contain the updated version
    const zipDir = path.join(projectDir, '.pup-zip');
    const zippedBootstrap = fs.readFileSync(
      path.join(zipDir, 'bootstrap.php'),
      'utf-8'
    );
    expect(zippedBootstrap).toContain('2.0.0');
  });
});
