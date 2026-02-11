import path from 'node:path';
import { execFile } from 'node:child_process';
import fs from 'fs-extra';

export const pupRoot = path.resolve(__dirname, '..', '..');
export const testsRoot = path.resolve(__dirname, '..');
export const fixturesDir = path.resolve(testsRoot, 'fixtures');
export const fakeProjectDir = path.resolve(fixturesDir, 'fake-project');
export const fakeProjectWithTbdsDir = path.resolve(fixturesDir, 'fake-project-with-tbds');
export const cliPath = path.resolve(pupRoot, 'dist', 'cli.js');

const tempFiles: string[] = [];

export function getDefaultPuprc(): Record<string, unknown> {
  return {
    build: ['ls -a'],
    paths: {
      versions: [
        {
          file: 'bootstrap.php',
          regex: "(define\\( +['\"]FAKE_PROJECT_VERSION['\"], +['\"])([^'\"]+)",
        },
        {
          file: 'bootstrap.php',
          regex: '(Version: )(.+)',
        },
        {
          file: 'src/Plugin.php',
          regex: "(const VERSION = ['\"])([^'\"]+)",
        },
        {
          file: 'package.json',
          regex: '("version": ")([^"]+)',
        },
      ],
    },
    zip_name: 'fake-project',
  };
}

export function getPuprc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...getDefaultPuprc(), ...overrides };
}

export function writePuprc(config: Record<string, unknown>, projectDir = fakeProjectDir): string {
  const puprcPath = path.join(projectDir, '.puprc');
  fs.writeFileSync(puprcPath, JSON.stringify(config, null, 2));
  tempFiles.push(puprcPath);
  return puprcPath;
}

export function writeDefaultPuprc(projectDir = fakeProjectDir): string {
  return writePuprc(getDefaultPuprc(), projectDir);
}

export function rmPuprc(projectDir = fakeProjectDir): void {
  const puprcPath = path.join(projectDir, '.puprc');
  if (fs.existsSync(puprcPath)) {
    fs.removeSync(puprcPath);
  }
}

export function runPup(
  args: string,
  options: { cwd?: string } = {}
): Promise<{ stdout: string; stderr: string; output: string; exitCode: number }> {
  const cwd = options.cwd ?? fakeProjectDir;
  const argv = args.split(/\s+/).filter(Boolean);

  return new Promise((resolve) => {
    execFile('node', [cliPath, ...argv], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      const out = stdout ?? '';
      const err = stderr ?? '';
      resolve({
        stdout: out,
        stderr: err,
        output: out + err,
        exitCode: error?.code && typeof error.code === 'number' ? error.code : (error ? 1 : 0),
      });
    });
  });
}

export function resetFixtures(): void {
  // Remove any .puprc files we wrote
  for (const f of tempFiles) {
    if (fs.existsSync(f)) {
      fs.removeSync(f);
    }
  }
  tempFiles.length = 0;

  // Clean up pup temp directories and generated files in fixture dirs
  for (const dir of [fakeProjectDir, fakeProjectWithTbdsDir]) {
    for (const tmp of [
      '.pup-build', '.pup-zip',
      '.pup-distfiles', '.pup-distinclude', '.pup-distignore',
      '.distignore', '.distinclude', '.distfiles', '.gitattributes',
    ]) {
      const tmpPath = path.join(dir, tmp);
      if (fs.existsSync(tmpPath)) {
        fs.removeSync(tmpPath);
      }
    }

    // Remove any generated zip files
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith('.zip')) {
        fs.removeSync(path.join(dir, entry));
      }
    }
  }
}
