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
    writePuprc(getPuprc(), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Success!');
  });

  it('should fail tbd check when tbds exist', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc(), tbdDir);

    const result = await runPup('check', { cwd: tbdDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('TBDs have been found!');
  });
});
