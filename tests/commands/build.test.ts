import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('build command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should run build', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "fake project, yo"'];
    writePuprc(puprc, projectDir);

    const result = await runPup('build', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('fake project, yo');
  });

  it('should handle no build steps', async () => {
    const puprc = getPuprc();
    puprc.build = [];
    writePuprc(puprc, projectDir);

    const result = await runPup('build', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
  });

  it('should succeed with defaults when no .puprc exists (defaults to no build steps)', async () => {
    const emptyDir = createTempProject();
    const result = await runPup('build', { cwd: emptyDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Build complete');
  });

  it('should pass env vars that are not defined in puprc.env', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "TOKEN=$PUP_TEST_UNIQUE_VAR"'];
    writePuprc(puprc, projectDir);

    process.env.PUP_TEST_UNIQUE_VAR = 'test-token-12345';

    try {
      const result = await runPup('build', { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('TOKEN=test-token-12345');
    } finally {
      delete process.env.PUP_TEST_UNIQUE_VAR;
    }
  });

  it('should run build in the specified --root directory', async () => {
    const rootDir = createTempProject();

    const puprc = getPuprc();
    puprc.build = ['pwd'];
    writePuprc(puprc, projectDir);

    const result = await runPup(`build --root ${rootDir}`, { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(rootDir);
  });

  it('should run build with dev flag', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "production build"'];
    (puprc as Record<string, unknown>).build_dev = ['echo "dev build"'];
    writePuprc(puprc, projectDir);

    const result = await runPup('build --dev', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('dev build');
  });
});
