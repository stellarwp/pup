import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  fakeProjectDir,
  fakeProjectWithTbdsDir,
} from '../../helpers/setup.js';

describe('tbd check', () => {
  afterEach(() => {
    resetFixtures();
  });

  it('should run successful tbd check', async () => {
    writeDefaultPuprc();

    const result = await runPup('check', { cwd: fakeProjectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Success!');
  });

  it('should fail tbd check when tbds exist', async () => {
    writeDefaultPuprc(fakeProjectWithTbdsDir);

    const result = await runPup('check', { cwd: fakeProjectWithTbdsDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('TBDs have been found!');
  });
});
