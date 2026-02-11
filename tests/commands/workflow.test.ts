import path from 'node:path';
import {
  runPup,
  resetFixtures,
  writeDefaultPuprc,
  writePuprc,
  getPuprc,
  fakeProjectDir,
  fixturesDir,
} from '../helpers/setup.js';

describe('workflow command', () => {
  beforeEach(() => {
    writeDefaultPuprc();
  });

  afterEach(() => {
    resetFixtures();
  });

  it('should run a workflow', async () => {
    const puprc = getPuprc();
    puprc.workflows = {
      'my-workflow': ['echo "workflow step 1"', 'echo "workflow step 2"'],
    };
    writePuprc(puprc);

    const result = await runPup('workflow my-workflow');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('workflow step 1');
    expect(result.output).toContain('workflow step 2');
  });

  it('should support "do" alias', async () => {
    const puprc = getPuprc();
    puprc.workflows = {
      'my-workflow': ['echo "workflow via do"'],
    };
    writePuprc(puprc);

    const result = await runPup('do my-workflow');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('workflow via do');
  });

  it('should error when workflow does not exist', async () => {
    const result = await runPup('workflow nonexistent');
    expect(result.exitCode).not.toBe(0);
  });

  it('should pass extra args to workflow', async () => {
    const scriptPath = path.resolve(fixturesDir, 'test-workflow-script.sh');
    const puprc = getPuprc();
    puprc.workflows = {
      'my-workflow': [`bash ${scriptPath}`],
    };
    writePuprc(puprc);

    const result = await runPup('workflow my-workflow -- --option1 value1');
    expect(result.exitCode).toBe(0);
  });

  it('should support multiple workflow commands', async () => {
    const puprc = getPuprc();
    puprc.workflows = {
      'my-workflow': [
        'echo "step 1"',
        'echo "step 2"',
        'echo "step 3"',
      ],
    };
    writePuprc(puprc);

    const result = await runPup('workflow my-workflow');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('step 1');
    expect(result.output).toContain('step 2');
    expect(result.output).toContain('step 3');
  });

  it('should handle soft-fail commands in workflows', async () => {
    const puprc = getPuprc();
    puprc.workflows = {
      'my-workflow': [
        '@false',
        'echo "still running"',
      ],
    };
    writePuprc(puprc);

    const result = await runPup('workflow my-workflow');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('still running');
  });
});
