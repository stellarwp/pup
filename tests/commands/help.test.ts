import { runPup, resetFixtures, writeDefaultPuprc } from '../helpers/setup.js';

describe('help command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should show help output', async () => {
    const result = await runPup('help');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('pup');
  });
});
