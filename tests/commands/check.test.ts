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

  it('should register built-in check:version-conflict even when not in .puprc', async () => {
    const projectDir = createTempProject();
    // Only tbd configured, no version-conflict
    writePuprc(getPuprc({ checks: { tbd: {} } }), projectDir);

    const result = await runPup('check:version-conflict', { cwd: projectDir });
    expect(result.output).toContain('Checking for version conflicts...');
    expect(result.output).not.toContain("unknown command 'check:version-conflict'");
  });

  it('should run check:version-conflict without prefix', async () => {
    const projectDir = createTempProject();
    writePuprc(getPuprc({ checks: { 'version-conflict': {} } }), projectDir);

    const result = await runPup('check:version-conflict', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Checking for version conflicts...');
    expect(result.output).not.toContain('[version-conflict]');
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

  it('should pass CLI args through to a subcommand check', async () => {
    const projectDir = createTempProject();

    const checkScript = path.join(projectDir, 'args-check.mjs');
    fs.writeFileSync(checkScript, `
export async function execute({ config }) {
  const version = config.args['some-arg'] || 'none';
  return { success: true, output: 'some-arg=' + version };
}
`);

    writePuprc(getPuprc({
      checks: {
        'args-check': {
          type: 'simple',
          file: 'args-check.mjs',
        },
      },
    }), projectDir);

    const result = await runPup('check:args-check --some-arg 5.0.1', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('some-arg=5.0.1');
  });
});
