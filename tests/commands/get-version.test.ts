import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
} from '../helpers/setup.js';

describe('get-version command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should get the version from the project', async () => {
    const result = await runPup('get-version');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
  });

  it('should get the dev version from the project', async () => {
    const result = await runPup('get-version --dev');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
    expect(result.stdout).toContain('dev');
  });
});
