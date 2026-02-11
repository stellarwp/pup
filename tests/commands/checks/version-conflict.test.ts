import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../../helpers/setup.js';

describe('version-conflict check', () => {
  afterEach(() => {
    cleanupTempProjects();
  });

  it('should run successful version-conflict check', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[version-conflict]');
  });

  it('should fail version-conflict check when there are mismatched versions', async () => {
    const projectDir = createTempProject();
    const puprc = getPuprc();
    const paths = puprc.paths as Record<string, unknown>;
    const versions = paths.versions as Array<Record<string, string>>;
    versions.push({
      file: 'src/OtherFileWithBadVersion.php',
      regex: "(const VERSION = ['\"])([^'\"]+)",
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('Version conflicts found!');
  });
});
