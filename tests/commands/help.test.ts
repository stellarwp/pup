import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

describe('help command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  describe('command list (no topic)', () => {
    it('should exit with code 0', async () => {
      const result = await runPup('help', { cwd: projectDir });
      expect(result.exitCode).toBe(0);
    });

    it('should display the banner with title and border', async () => {
      const result = await runPup('help', { cwd: projectDir });
      expect(result.stdout).toContain('*'.repeat(80));
      expect(result.stdout).toContain('Product Utility & Packager');
      expect(result.stdout).toContain('A CLI utility by StellarWP');
    });

    it('should display the help hint', async () => {
      const result = await runPup('help', { cwd: projectDir });
      expect(result.stdout).toContain('Run pup help <topic> for more information on a specific command.');
    });

    it('should display a command table with headers', async () => {
      const result = await runPup('help', { cwd: projectDir });
      expect(result.stdout).toContain('| Command');
      expect(result.stdout).toContain('| Description');
      expect(result.stdout).toMatch(/\|[-]+\|/);
    });

    it('should list all documented commands', async () => {
      const result = await runPup('help', { cwd: projectDir });
      const expectedCommands = [
        'build',
        'check',
        'check:tbd',
        'check:version-conflict',
        'clean',
        'do',
        'get-version',
        'help',
        'i18n',
        'info',
        'package',
        'workflow',
        'zip',
        'zip-name',
      ];

      for (const cmd of expectedCommands) {
        expect(result.stdout).toContain(cmd);
      }
    });

    it('should display commands in sorted order', async () => {
      const result = await runPup('help', { cwd: projectDir });
      const lines = result.stdout.split('\n');
      const commandLines = lines.filter((line) => line.startsWith('|') && !line.startsWith('| Command') && !line.startsWith('|---'));
      const commands = commandLines
        .map((line) => line.split('|')[1]?.trim())
        .filter(Boolean);

      const sorted = [...commands].sort();
      expect(commands).toEqual(sorted);
    });

    it('should display the footer with GitHub URL', async () => {
      const result = await runPup('help', { cwd: projectDir });
      expect(result.stdout).toContain('https://github.com/stellarwp/pup');
    });
  });

  describe('topic detail', () => {
    it('should display a title for the topic', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Help: pup build');
      expect(result.stdout).toContain('='.repeat('Help: pup build'.length));
    });

    it('should display the command description', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      expect(result.stdout).toContain('Runs the build commands from the .puprc file.');
    });

    it('should render section headers with > prefix', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      expect(result.stdout).toContain('> Usage:');
      expect(result.stdout).toContain('> Arguments:');
    });

    it('should render section headers with dashed underlines', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      const lines = result.stdout.split('\n');
      const usageIdx = lines.findIndex((line) => line.includes('> Usage:'));
      expect(usageIdx).toBeGreaterThan(-1);
      expect(lines[usageIdx + 1]).toMatch(/^-+$/);
    });

    it('should render code blocks with dotted separators', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      expect(result.stdout).toContain('.'.repeat(50));
    });

    it('should display code block content', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      expect(result.stdout).toContain('pup build [--dev]');
    });

    it('should render argument tables', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      expect(result.stdout).toContain('| Argument');
      expect(result.stdout).toContain('| --dev');
      expect(result.stdout).toContain('| --root');
    });

    it('should strip markdown bold formatting', async () => {
      const result = await runPup('help build', { cwd: projectDir });
      // **Optional.** should render as Optional. without the **
      expect(result.stdout).toContain('Optional.');
      expect(result.stdout).not.toContain('**Optional.**');
    });

    it('should strip markdown link syntax', async () => {
      const result = await runPup('help check:tbd', { cwd: projectDir });
      expect(result.stdout).toContain('.puprc-defaults');
      // Should not contain raw markdown link URL
      expect(result.stdout).not.toContain('](https://');
    });

    it('should not show leftover markdown link brackets', async () => {
      const result = await runPup('help check:tbd', { cwd: projectDir });
      // The link [`.puprc-defaults`](url) should not leave a stray [ in the output
      expect(result.stdout).not.toMatch(/\[\.puprc-defaults/);
    });
  });

  describe('sub-commands', () => {
    it('should display help for check:tbd', async () => {
      const result = await runPup('help check:tbd', { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Help: pup check:tbd');
      expect(result.stdout).toContain('Scans your files for tbd');
    });

    it('should display help for check:version-conflict', async () => {
      const result = await runPup('help check:version-conflict', { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Help: pup check:version-conflict');
      expect(result.stdout).toContain('version numbers match');
    });

    it('should render .puprc options tables for check:tbd', async () => {
      const result = await runPup('help check:tbd', { cwd: projectDir });
      expect(result.stdout).toContain('>> .puprc options:');
      expect(result.stdout).toContain('| Option');
      expect(result.stdout).toContain('fail_method');
      expect(result.stdout).toContain('dirs');
      expect(result.stdout).toContain('skip_directories');
      expect(result.stdout).toContain('skip_files');
    });

    it('should use >> depth prefix for #### headings', async () => {
      const result = await runPup('help check:tbd', { cwd: projectDir });
      // check:tbd uses #### (4 hashes) for Usage and .puprc options
      expect(result.stdout).toContain('>> Usage:');
    });
  });

  describe('multiple topics', () => {
    const topics = [
      'build',
      'check',
      'check:tbd',
      'check:version-conflict',
      'clean',
      'do',
      'get-version',
      'help',
      'i18n',
      'info',
      'package',
      'workflow',
      'zip',
      'zip-name',
    ];

    it.each(topics)('should display help for topic: %s', async (topic) => {
      const result = await runPup(`help ${topic}`, { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`Help: pup ${topic}`);
    });
  });

  describe('unknown topic', () => {
    it('should show an error for unknown topics', async () => {
      const result = await runPup('help nonexistent', { cwd: projectDir });
      expect(result.output).toContain('Unknown topic: nonexistent');
    });
  });
});
