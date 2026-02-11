import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('info command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should show project info', async () => {
    const result = await runPup('info', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('pup');
  });
});
