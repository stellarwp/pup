import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  fakeProjectDir,
} from '../helpers/setup.js';

describe('zip-name command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should get the zip name from the plugin', async () => {
    const result = await runPup('zip-name');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('fake-project.1.0.0');
  });

  it('should get the dev zip name from the plugin', async () => {
    const result = await runPup('zip-name --dev');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('fake-project.1.0.0');
    expect(result.stdout).toContain('dev');
  });
});
