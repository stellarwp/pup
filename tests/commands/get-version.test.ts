import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('get-version command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should get the version from the project', async () => {
    const result = await runPup('get-version', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
  });

  it('should get the dev version from the project', async () => {
    const result = await runPup('get-version --dev', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
    expect(result.stdout).toContain('dev');
  });
});
