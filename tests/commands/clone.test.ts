import path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
  pupRoot,
} from '../helpers/setup.js';

describe('clone command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should clone a repository using file:// protocol', async () => {
    const puprc = getPuprc({ repo: `file://${pupRoot}` });
    writePuprc(puprc, projectDir);

    const result = await runPup('clone', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Cloning repository...');
    expect(result.output).toContain('Cloned');

    const buildDir = path.join(projectDir, '.pup-build');
    expect(fs.existsSync(buildDir)).toBe(true);
  });

  it('should clone a specific branch', async () => {
    const puprc = getPuprc({ repo: `file://${pupRoot}` });
    writePuprc(puprc, projectDir);

    // Use the current branch so this works in CI where main may not exist locally
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: pupRoot }).toString().trim();
    const result = await runPup(`clone --branch ${currentBranch}`, { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Cloned');
  });

  it('should fail when no repo is configured', async () => {
    const puprc = getPuprc();
    delete (puprc as Record<string, unknown>).repo;
    // Remove package.json temporarily so it can't infer repo
    const pkgPath = path.join(projectDir, 'package.json');
    const pkgBackup = fs.readFileSync(pkgPath, 'utf-8');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'fake-project', version: '1.0.0' }));
    writePuprc(puprc, projectDir);

    const result = await runPup('clone', { cwd: projectDir });
    // Should fail since no repo URL can be determined
    expect(result.exitCode).not.toBe(0);

    // Restore package.json
    fs.writeFileSync(pkgPath, pkgBackup);
  });

  it('should clone a repository using https URL', async () => {
    const puprc = getPuprc({ repo: 'https://github.com/stellarwp/pup.git' });
    writePuprc(puprc, projectDir);

    const result = await runPup('clone', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Cloned');

    const buildDir = path.join(projectDir, '.pup-build');
    expect(fs.existsSync(buildDir)).toBe(true);
  });

  it('should clone a repository using shorthand format', async () => {
    // Config.getRepo() converts "stellarwp/pup" to "git@github.com:stellarwp/pup.git"
    // In CI, SSH keys aren't available so rewrite SSH URLs to HTTPS for git
    if (process.env.CI) {
      execSync('git config --global url."https://github.com/".insteadOf "git@github.com:"');
    }

    const puprc = getPuprc({ repo: 'stellarwp/pup' });
    writePuprc(puprc, projectDir);

    const result = await runPup('clone', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Cloned');

    const buildDir = path.join(projectDir, '.pup-build');
    expect(fs.existsSync(buildDir)).toBe(true);

    if (process.env.CI) {
      execSync('git config --global --unset url."https://github.com/".insteadOf');
    }
  });

  it('should remove existing build directory before cloning', async () => {
    const buildDir = path.join(projectDir, '.pup-build');
    fs.ensureDirSync(buildDir);
    fs.writeFileSync(path.join(buildDir, 'stale-file.txt'), 'old content');

    const puprc = getPuprc({ repo: `file://${pupRoot}` });
    writePuprc(puprc, projectDir);

    const result = await runPup('clone', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    // Stale file should be gone, replaced by fresh clone
    expect(fs.existsSync(path.join(buildDir, 'stale-file.txt'))).toBe(false);
    expect(fs.existsSync(buildDir)).toBe(true);
  });
});
