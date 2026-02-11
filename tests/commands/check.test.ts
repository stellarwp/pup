import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  writePuprc,
  getPuprc,
  fakeProjectWithTbdsDir,
} from '../helpers/setup.js';

describe('check command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should run default checks successfully', async () => {
    const result = await runPup('check');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('[version-conflict]');
  });

  it('should warn on tbd when fail_method is warn', async () => {
    const puprc = getPuprc();
    puprc.checks = {
      tbd: {
        fail_method: 'warn',
      },
      'version-conflict': {},
    };
    writePuprc(puprc, fakeProjectWithTbdsDir);

    const result = await runPup('check', { cwd: fakeProjectWithTbdsDir });
    // Should succeed since tbd is set to warn
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('TBDs have been found!');
  });
});
