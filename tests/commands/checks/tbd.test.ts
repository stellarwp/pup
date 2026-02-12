import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../../helpers/setup.js';

describe('tbd check', () => {
  afterEach(() => {
    cleanupTempProjects();
  });

  it('should run successful tbd check', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({ checks: { tbd: {} } }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd] Checking for TBDs...');
    expect(result.output).toContain('[tbd] No TBDs found!');
    expect(result.output).toContain('[tbd] Success! No TBDs found.');
  });

  it('should fail tbd check when tbds exist', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), tbdDir);

    const result = await runPup('check', { cwd: tbdDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('[tbd] Checking for TBDs...');
    expect(result.output).toContain('[tbd] src/Plugin.php');
    expect(result.output).toContain('[tbd] src/Thing/AnotherFile.php');
    expect(result.output).toContain('TBDs have been found!');
    expect(result.output).toContain("tbd's fail_method in .puprc is set to");
  });

  it('should use fail_method_dev when --dev is passed', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc({ checks: { tbd: {} } }), tbdDir);

    // Default fail_method is 'error', but fail_method_dev is 'warn'
    const result = await runPup('check --dev', { cwd: tbdDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('TBDs have been found!');
  });

  it('should warn on tbd when fail_method is warn', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    const puprc = getPuprc();
    puprc.checks = {
      tbd: {
        fail_method: 'warn',
      },
    };
    writePuprc(puprc, tbdDir);

    const result = await runPup('check', { cwd: tbdDir });
    // Should succeed since tbd is set to warn
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('TBDs have been found!');
  });
});
