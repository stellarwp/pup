import { runPup, resetFixtures, writeDefaultPuprc } from '../helpers/setup.js';

describe('info command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should show project info', async () => {
    const result = await runPup('info');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('pup');
  });
});
