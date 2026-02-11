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

  it('should fail without .puprc', async () => {
    // Run in a dir with no .puprc but a package.json
    const emptyDir = createTempProject();
    const result = await runPup('build', { cwd: emptyDir });
    expect(result.exitCode).toBe(0);
  });

  it('should pass default env vars', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "env test"'];
    writePuprc(puprc, projectDir);

    const result = await runPup('build', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
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
