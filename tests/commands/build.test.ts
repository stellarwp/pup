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

  it('should run parallel build steps', async () => {
    const puprc = getPuprc();
    puprc.build = [['echo "parallel-a"', 'echo "parallel-b"']];
    writePuprc(puprc, projectDir);

    const result = await runPup('build', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('parallel-a');
    expect(result.output).toContain('parallel-b');
  });

  it('should run mixed sequential and parallel steps in order', async () => {
    const puprc = getPuprc();
    puprc.build = [
      'echo "step-1-sequential"',
      ['echo "step-2-parallel-a"', 'echo "step-2-parallel-b"'],
      'echo "step-3-sequential"',
    ];
    writePuprc(puprc, projectDir);

    const result = await runPup('build', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('step-1-sequential');
    expect(result.output).toContain('step-2-parallel-a');
    expect(result.output).toContain('step-2-parallel-b');
    expect(result.output).toContain('step-3-sequential');

    // Verify sequential ordering: step-1 before parallel group, parallel group before step-3
    const idx1 = result.output.indexOf('step-1-sequential');
    const idx2a = result.output.indexOf('step-2-parallel-a');
    const idx2b = result.output.indexOf('step-2-parallel-b');
    const idx3 = result.output.indexOf('step-3-sequential');
    expect(idx1).toBeLessThan(idx2a);
    expect(idx1).toBeLessThan(idx2b);
    expect(idx2a).toBeLessThan(idx3);
    expect(idx2b).toBeLessThan(idx3);
  });

  it('should handle soft-fail in parallel group', async () => {
    const puprc = getPuprc();
    puprc.build = [
      ['@exit 1', 'echo "parallel-ok"'],
      'echo "after-parallel"',
    ];
    writePuprc(puprc, projectDir);

    const result = await runPup('build', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('parallel-ok');
    expect(result.output).toContain('after-parallel');
  });

  it('should fail on non-soft-fail failure in parallel group', async () => {
    const puprc = getPuprc();
    puprc.build = [
      ['exit 1', 'echo "parallel-ok"'],
      'echo "should-not-run"',
    ];
    writePuprc(puprc, projectDir);

    const result = await runPup('build', { cwd: projectDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('parallel-ok');
    expect(result.output).not.toContain('should-not-run');
  });
});
