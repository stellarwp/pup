import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('check command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should run default checks successfully', async () => {
    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('[version-conflict]');
  });

  it('should warn on tbd when fail_method is warn', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    const puprc = getPuprc();
    puprc.checks = {
      tbd: {
        fail_method: 'warn',
      },
      'version-conflict': {},
    };
    writePuprc(puprc, tbdDir);

    const result = await runPup('check', { cwd: tbdDir });
    // Should succeed since tbd is set to warn
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[tbd]');
    expect(result.output).toContain('TBDs have been found!');
  });
});
