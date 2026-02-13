import path from 'node:path';
import fs from 'fs-extra';
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

  it('should show guidance when checks is an empty object', async () => {
    writePuprc(getPuprc({ checks: {} }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('The .puprc does not have any checks configured.');
    expect(result.output).toContain('"tbd": {}');
    expect(result.output).toContain('"version-conflict": {}');
  });
});

describe('check subcommands', () => {
  afterEach(() => {
    cleanupTempProjects();
  });

  it('should register built-in check:tbd even when not in .puprc', async () => {
    const projectDir = createTempProject();
    // Only version-conflict configured, no tbd
    writePuprc(getPuprc({ checks: { 'version-conflict': {} } }), projectDir);

    const result = await runPup('check:tbd', { cwd: projectDir });
    expect(result.output).toContain('Checking for TBDs...');
    expect(result.output).not.toContain("unknown command 'check:tbd'");
  });

  it('should run check:tbd without prefix', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);

    const result = await runPup('check:tbd', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Checking for TBDs...');
    expect(result.output).not.toContain('[tbd]');
  });
});

describe('custom checks', () => {
  afterEach(() => {
    cleanupTempProjects();
  });

  it('should run a passing command-type check', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({
      checks: {
        'my-check': {
          type: 'command',
          command: 'echo "custom check passed"',
        },
      },
    }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[my-check]');
    expect(result.output).toContain('custom check passed');
  });

  it('should run a failing command-type check with warn', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({
      checks: {
        'my-check': {
          type: 'command',
          command: 'exit 1',
          fail_method: 'warn',
        },
      },
    }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[my-check]');
    expect(result.output).toContain('The following checks failed:');
    expect(result.output).toContain('my-check');
  });

  it('should bail on a failing command-type check with error', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({
      checks: {
        'my-check': {
          type: 'command',
          command: 'exit 1',
          fail_method: 'error',
        },
      },
    }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain('[my-check]');
    expect(result.output).toContain("my-check's fail_method in .puprc is set to");
  });

  it('should register custom check as subcommand', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({
      checks: {
        'my-check': {
          type: 'command',
          command: 'echo "ran via subcommand"',
        },
      },
    }), projectDir);

    const result = await runPup('check:my-check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('ran via subcommand');
    expect(result.output).not.toContain('[my-check]');
  });

  it('should run a simple module check', async () => {
    const projectDir = createTempProject();

    const checkScript = path.join(projectDir, 'my-simple-check.mjs');
    fs.writeFileSync(checkScript, `
export async function execute({ config, workingDir }) {
  return { success: true, output: 'simple module check passed' };
}
`);

    writePuprc(getPuprc({
      checks: {
        'simple-check': {
          type: 'simple',
          file: 'my-simple-check.mjs',
        },
      },
    }), projectDir);

    const result = await runPup('check', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('[simple-check]');
    expect(result.output).toContain('simple module check passed');
  });
});
