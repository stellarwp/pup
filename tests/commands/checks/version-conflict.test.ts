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
    writePuprc(getPuprc({ checks: { 'version-conflict': {} } }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[version-conflict] Checking for version conflicts...');
    expect(result.output).toContain('[version-conflict] No version conflicts found.');
  });

  it('should use fail_method_dev when --dev is passed', async () => {
    const projectDir = createTempProject();
    const puprc = getPuprc({ checks: { 'version-conflict': {} } });
    const paths = puprc.paths as Record<string, unknown>;
    const versions = paths.versions as Array<Record<string, string>>;
    versions.push({
      file: 'src/OtherFileWithBadVersion.php',
      regex: "(const VERSION = ['\"])([^'\"]+)",
    });
    writePuprc(puprc, projectDir);

    // Default fail_method is 'error', but fail_method_dev is 'warn'
    const result = await runPup('check --dev', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Found more than one version within the version files.');
  });

  it('should fail version-conflict check when there are mismatched versions', async () => {
    const projectDir = createTempProject();
    const puprc = getPuprc({ checks: { 'version-conflict': {} } });
    const paths = puprc.paths as Record<string, unknown>;
    const versions = paths.versions as Array<Record<string, string>>;
    versions.push({
      file: 'src/OtherFileWithBadVersion.php',
      regex: "(const VERSION = ['\"])([^'\"]+)",
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('[version-conflict] Checking for version conflicts...');
    expect(result.output).toContain('Found more than one version within the version files.');
    expect(result.output).toContain('[version-conflict] Versions found:');
    expect(result.output).toContain("version-conflict's fail_method in .puprc is set to");
  });
});
