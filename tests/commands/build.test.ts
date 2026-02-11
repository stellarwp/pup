import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  writePuprc,
  getPuprc,
} from '../helpers/setup.js';

describe('build command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should run build', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "fake project, yo"'];
    writePuprc(puprc);

    const result = await runPup('build');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('fake project, yo');
  });

  it('should handle no build steps', async () => {
    const puprc = getPuprc();
    puprc.build = [];
    writePuprc(puprc);

    const result = await runPup('build');
    expect(result.exitCode).toBe(0);
  });

  it('should fail without .puprc', async () => {
    resetFixtures();
    // Run in a dir with no .puprc but a package.json
    const result = await runPup('build');
    expect(result.exitCode).toBe(0);
  });

  it('should pass default env vars', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "env test"'];
    writePuprc(puprc);

    const result = await runPup('build');
    expect(result.exitCode).toBe(0);
  });

  it('should run build with dev flag', async () => {
    const puprc = getPuprc();
    puprc.build = ['echo "production build"'];
    (puprc as Record<string, unknown>).build_dev = ['echo "dev build"'];
    writePuprc(puprc);

    const result = await runPup('build --dev');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('dev build');
  });
});
