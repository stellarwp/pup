import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('help command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should show help output', async () => {
    const result = await runPup('help', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('pup');
  });
});
