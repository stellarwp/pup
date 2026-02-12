import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('zip-name command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should get the zip name from the plugin', async () => {
    const result = await runPup('zip-name', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('fake-project.1.0.0');
  });

  it('should get the dev zip name from the plugin', async () => {
    const result = await runPup('zip-name --dev', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('fake-project.1.0.0');
    expect(result.stdout).toContain('dev');
  });

  it('should fall back to package.json name when zip_name is not set', async () => {
    const puprc = getPuprc();
    delete puprc.zip_name;
    writePuprc(puprc, projectDir);

    // Override the package.json name to confirm it's being used
    fs.writeJsonSync(path.join(projectDir, 'package.json'), {
      name: 'pkg-json-project',
      version: '1.0.0',
    }, { spaces: 2 });

    const result = await runPup('zip-name', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('pkg-json-project.1.0.0');
  });

  it('should fall back to composer.json name when zip_name and package.json are not available', async () => {
    const puprc = getPuprc();
    delete puprc.zip_name;

    // Remove the package.json version file entry since we're deleting it
    const paths = puprc.paths as { versions: { file: string; regex: string }[] };
    paths.versions = paths.versions.filter((v) => v.file !== 'package.json');

    writePuprc(puprc, projectDir);

    // Remove package.json and add composer.json
    fs.removeSync(path.join(projectDir, 'package.json'));
    fs.writeJsonSync(path.join(projectDir, 'composer.json'), {
      name: 'stellarwp/my-plugin',
    });

    const result = await runPup('zip-name', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('my-plugin');
  });

  it('should use zip_name from .puprc when it is a string', async () => {
    writePuprc(getPuprc({ zip_name: 'custom-zip-name' }), projectDir);

    const result = await runPup('zip-name', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('custom-zip-name.1.0.0');
  });
});
