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
});
