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

  it('should use the directory name when zip_name is not set', async () => {
    const puprc = getPuprc();
    delete puprc.zip_name;
    writePuprc(puprc, projectDir);

    const result = await runPup('zip-name', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('fake-project.1.0.0');
  });

  it('should use zip_name from .puprc when it is a string', async () => {
    writePuprc(getPuprc({ zip_name: 'custom-zip-name' }), projectDir);

    const result = await runPup('zip-name', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('custom-zip-name.1.0.0');
  });
});
