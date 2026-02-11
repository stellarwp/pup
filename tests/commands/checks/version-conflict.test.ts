import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  writePuprc,
  getPuprc,
  fakeProjectDir,
} from '../../helpers/setup.js';

describe('version-conflict check', () => {
  afterEach(() => {
    resetFixtures();
  });

  it('should run successful version-conflict check', async () => {
    writeDefaultPuprc();

    const result = await runPup('check', { cwd: fakeProjectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[version-conflict]');
  });

  it('should fail version-conflict check when there are mismatched versions', async () => {
    const puprc = getPuprc();
    const paths = puprc.paths as Record<string, unknown>;
    const versions = paths.versions as Array<Record<string, string>>;
    versions.push({
      file: 'src/OtherFileWithBadVersion.php',
      regex: "(const VERSION = ['\"])([^'\"]+)",
    });
    writePuprc(puprc);

    const result = await runPup('check', { cwd: fakeProjectDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('Version conflicts found!');
  });
});
