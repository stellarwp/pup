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

  it('should pass env vars', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "TOKEN=$NODE_AUTH_TOKEN"'];
    puprc.env = ['NODE_AUTH_TOKEN'];
    writePuprc(puprc, projectDir);

    const originalToken = process.env.NODE_AUTH_TOKEN;
    process.env.NODE_AUTH_TOKEN = 'test-token-12345';

    try {
      const result = await runPup('build', { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('TOKEN=test-token-12345');
    } finally {
      if (originalToken === undefined) {
        delete process.env.NODE_AUTH_TOKEN;
      } else {
        process.env.NODE_AUTH_TOKEN = originalToken;
      }
    }
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
