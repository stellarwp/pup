import fs from 'fs-extra';
import path from 'node:path';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('info command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should exit with code 0', async () => {
    const result = await runPup('info', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
  });

  describe('CLI Info section', () => {
    it('should display the CLI Info title with underline', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toContain('CLI Info');
      expect(result.stdout).toContain('='.repeat('CLI Info'.length));
    });

    it('should display the pup version', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toMatch(/pup \d+\.\d+\.\d+/);
    });

    it('should display the Node.js version', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toMatch(/Using: Node\.js v\d+/);
    });
  });

  describe('Working Directory section', () => {
    it('should display the Working Directory section header', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toContain('Working Directory');
      expect(result.stdout).toContain('-'.repeat('Working Directory'.length));
    });

    it('should display the working directory path', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toContain(projectDir);
    });
  });

  describe('File info section', () => {
    it('should display the File info section header', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toContain('File info');
      expect(result.stdout).toContain('-'.repeat('File info'.length));
    });

    it('should list all four tracked files', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toContain('.distignore');
      expect(result.stdout).toContain('.distinclude');
      expect(result.stdout).toContain('.gitattributes');
      expect(result.stdout).toContain('.puprc');
    });

    describe('when no optional files exist', () => {
      beforeEach(() => {
        // Remove .puprc so all files are absent
        fs.removeSync(path.join(projectDir, '.puprc'));
      });

      it('should show absent icon for all files', async () => {
        const result = await runPup('info', { cwd: projectDir });
        const lines = result.stdout.split('\n');
        const fileLines = lines.filter((l) => /\.(distignore|distinclude|gitattributes|puprc)/.test(l));

        for (const line of fileLines) {
          expect(line).toContain('⚫');
          expect(line).toContain('does not exist');
        }
      });
    });

    describe('when .puprc exists and is valid', () => {
      it('should show exists icon for .puprc', async () => {
        const result = await runPup('info', { cwd: projectDir });
        const puprcLine = result.stdout.split('\n').find((l) => l.includes('.puprc'));
        expect(puprcLine).toContain('✅');
        expect(puprcLine).toContain('exists');
      });
    });

    describe('when .distignore exists', () => {
      beforeEach(() => {
        fs.writeFileSync(path.join(projectDir, '.distignore'), '*.test.js\n');
      });

      it('should show exists icon for .distignore', async () => {
        const result = await runPup('info', { cwd: projectDir });
        const line = result.stdout.split('\n').find((l) => l.includes('.distignore'));
        expect(line).toContain('✅');
        expect(line).toContain('exists');
      });
    });

    describe('when .distinclude exists', () => {
      beforeEach(() => {
        fs.writeFileSync(path.join(projectDir, '.distinclude'), 'vendor/\n');
      });

      it('should show exists icon for .distinclude', async () => {
        const result = await runPup('info', { cwd: projectDir });
        const line = result.stdout.split('\n').find((l) => l.includes('.distinclude'));
        expect(line).toContain('✅');
        expect(line).toContain('exists');
      });
    });

    describe('when .gitattributes exists', () => {
      beforeEach(() => {
        fs.writeFileSync(path.join(projectDir, '.gitattributes'), '*.php diff=php\n');
      });

      it('should show exists icon for .gitattributes', async () => {
        const result = await runPup('info', { cwd: projectDir });
        const line = result.stdout.split('\n').find((l) => l.includes('.gitattributes'));
        expect(line).toContain('✅');
        expect(line).toContain('exists');
      });
    });

    describe('file ordering', () => {
      it('should show existing files before absent files', async () => {
        const result = await runPup('info', { cwd: projectDir });
        const lines = result.stdout.split('\n');
        const existIdx = lines.findIndex((l) => l.includes('✅'));
        const absentIdx = lines.findIndex((l) => l.includes('⚫'));

        expect(existIdx).toBeGreaterThan(-1);
        expect(absentIdx).toBeGreaterThan(-1);
        expect(existIdx).toBeLessThan(absentIdx);
      });
    });
  });

  describe('Config section', () => {
    it('should display the Config section header', async () => {
      const result = await runPup('info', { cwd: projectDir });
      expect(result.stdout).toContain('Config');
      expect(result.stdout).toContain('-'.repeat('Config'.length));
    });

    it('should display config as formatted JSON', async () => {
      const result = await runPup('info', { cwd: projectDir });
      const configHeaderIndex = result.stdout.indexOf('Config');
      const jsonStart = result.stdout.indexOf('{', configHeaderIndex);
      const jsonText = result.stdout.slice(jsonStart);

      const parsed = JSON.parse(jsonText);
      expect(parsed).toMatchObject(getPuprc());
    });
  });
});
