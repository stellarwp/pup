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
    expect(result.output).toContain('[tbd] Checking for TBDs...');
    expect(result.output).toContain('[tbd] No TBDs found!');
    expect(result.output).toContain('[tbd] Success! No TBDs found.');
  });

  it('should fail tbd check when tbds exist', async () => {
    const tbdDir = createTempProject('fake-project-with-tbds');
    writePuprc(getPuprc(), tbdDir);

    const result = await runPup('check', { cwd: tbdDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('[tbd] Checking for TBDs...');
    expect(result.output).toContain('[tbd] src/Plugin.php');
    expect(result.output).toContain('[tbd] src/Thing/AnotherFile.php');
    expect(result.output).toContain('TBDs have been found!');
    expect(result.output).toContain("tbd's fail_method in .puprc is set to");
  });
});
