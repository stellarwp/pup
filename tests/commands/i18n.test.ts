import http from 'node:http';
import path from 'node:path';
import fs from 'fs-extra';
import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

let server: http.Server;
let serverUrl: string;

// A response body >= 200 bytes so it passes the minimum size check.
const fakeTranslationBody = Buffer.alloc(250, 0x78);

// Routes for the mock GlotPress API
const routes: Record<string, { status: number; body: string; contentType?: string }> = {
  '/api/projects/wp-plugins/fake-project/stable': {
    status: 200,
    body: JSON.stringify({
      translation_sets: [
        { locale: 'de', wp_locale: 'de_DE', slug: 'default', current_count: 100, percent_translated: 80 },
        { locale: 'fr', wp_locale: 'fr_FR', slug: 'default', current_count: 50, percent_translated: 50 },
        { locale: 'ja', wp_locale: 'ja', slug: 'default', current_count: 5, percent_translated: 10 },
      ],
    }),
    contentType: 'application/json',
  },
  '/api/projects/wp-plugins/fake-project/with-zero-count': {
    status: 200,
    body: JSON.stringify({
      translation_sets: [
        { locale: 'de', wp_locale: 'de_DE', slug: 'default', current_count: 100, percent_translated: 80 },
        { locale: 'es', wp_locale: 'es_ES', slug: 'default', current_count: 0, percent_translated: 90 },
      ],
    }),
    contentType: 'application/json',
  },
  '/not-found': {
    status: 404,
    body: 'Not Found',
  },
  '/bad-json': {
    status: 200,
    body: 'this is not json',
    contentType: 'text/plain',
  },
  '/no-sets': {
    status: 200,
    body: JSON.stringify({ something_else: true }),
    contentType: 'application/json',
  },
};

beforeAll((done) => {
  server = http.createServer((req, res) => {
    // Check for translation file download requests (contain "export-translations")
    if (req.url?.includes('export-translations')) {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(fakeTranslationBody);
      return;
    }

    const route = routes[req.url ?? ''];
    if (route) {
      res.writeHead(route.status, { 'Content-Type': route.contentType ?? 'text/plain' });
      res.end(route.body);
    } else {
      res.writeHead(404);
      res.end('Unknown route');
    }
  });

  server.listen(0, '127.0.0.1', () => {
    const addr = server.address();
    if (addr && typeof addr === 'object') {
      serverUrl = `http://127.0.0.1:${addr.port}`;
    }
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe('i18n command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should skip when no i18n config is set', async () => {
    const puprc = getPuprc();
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No i18n configuration found. Skipping.');
  });

  it('should skip when i18n is an empty array', async () => {
    const puprc = getPuprc({ i18n: [] });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No i18n configuration found. Skipping.');
  });

  it('should skip i18n entries missing required fields', async () => {
    const puprc = getPuprc({
      i18n: [{ path: 'lang' }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No i18n configuration found. Skipping.');
  });

  it('should accept a single i18n object instead of an array', async () => {
    const puprc = getPuprc({
      i18n: {
        url: `${serverUrl}/api/projects/wp-plugins/%slug%/stable`,
        textdomain: 'fake-project',
        slug: 'fake-project',
      },
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Fetching language files for');
  });

  it('should handle non-200 HTTP response gracefully', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: `${serverUrl}/not-found`,
        textdomain: 'fake-project',
        slug: 'fake-project',
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Failed to fetch project data from');
  });

  it('should handle invalid JSON response gracefully', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: `${serverUrl}/bad-json`,
        textdomain: 'fake-project',
        slug: 'fake-project',
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Failed to fetch translation data');
  });

  it('should handle response missing translation_sets', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: `${serverUrl}/no-sets`,
        textdomain: 'fake-project',
        slug: 'fake-project',
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Failed to fetch translation sets from');
  });

  it('should fetch and download translations meeting threshold', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: `${serverUrl}/api/projects/wp-plugins/%slug%/stable`,
        textdomain: 'fake-project',
        slug: 'fake-project',
        path: 'lang',
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Fetching language files for fake-project from');

    // Verify files were downloaded
    const langDir = path.join(projectDir, 'lang');
    expect(fs.existsSync(langDir)).toBe(true);

    const files = fs.readdirSync(langDir);
    // Default threshold is 30%, so de (80%) and fr (50%) should pass, ja (10%) should not
    expect(files).toContain('fake-project-de_DE.po');
    expect(files).toContain('fake-project-de_DE.mo');
    expect(files).toContain('fake-project-fr_FR.po');
    expect(files).toContain('fake-project-fr_FR.mo');
    // ja should be excluded (10% < 30% threshold)
    expect(files).not.toContain('fake-project-ja.po');
  });

  it('should respect custom minimum_percentage filter', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: `${serverUrl}/api/projects/wp-plugins/%slug%/stable`,
        textdomain: 'fake-project',
        slug: 'fake-project',
        path: 'lang',
        filter: { minimum_percentage: 70 },
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    // Only de (80%) meets 70% threshold
    const langDir = path.join(projectDir, 'lang');
    const files = fs.readdirSync(langDir);
    expect(files).toContain('fake-project-de_DE.po');
    expect(files).toContain('fake-project-de_DE.mo');
    expect(files).not.toContain('fake-project-fr_FR.po');
    expect(files).not.toContain('fake-project-ja.po');
  });

  it('should skip translations with zero current_count', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: `${serverUrl}/api/projects/wp-plugins/%slug%/with-zero-count`,
        textdomain: 'fake-project',
        slug: 'fake-project',
        path: 'lang',
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    const langDir = path.join(projectDir, 'lang');
    const files = fs.readdirSync(langDir);
    // de has current_count: 100 and 80% translated, should be downloaded
    expect(files).toContain('fake-project-de_DE.po');
    expect(files).toContain('fake-project-de_DE.mo');
    // es has current_count: 0, should be skipped even though 90% translated
    expect(files).not.toContain('fake-project-es_ES.po');
    expect(files).not.toContain('fake-project-es_ES.mo');
  });

  it('should respect --retries 0 and bail without downloading', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: `${serverUrl}/api/projects/wp-plugins/%slug%/stable`,
        textdomain: 'fake-project',
        slug: 'fake-project',
        path: 'lang',
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n --retries 0', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    // de and fr pass filters but retries=0 means every download bails immediately
    expect(result.output).toContain('too many times, bailing');

    // No files should have been downloaded
    const langDir = path.join(projectDir, 'lang');
    if (fs.existsSync(langDir)) {
      expect(fs.readdirSync(langDir)).toHaveLength(0);
    }
  });

  it('should use --root to download files to the specified directory', async () => {
    // rootDir is an empty subdirectory — no .puprc, no project files.
    // This proves config is loaded from projectDir (the cwd) and --root only
    // controls where downloaded files are saved.
    const rootDir = path.join(projectDir, 'alt-root');
    fs.mkdirpSync(rootDir);

    writePuprc(getPuprc({
      i18n: [{
        url: `${serverUrl}/api/projects/wp-plugins/%slug%/stable`,
        textdomain: 'fake-project',
        slug: 'fake-project',
        path: 'custom/translations',
      }],
    }), projectDir);

    const result = await runPup(`i18n --root ${rootDir}`, { cwd: projectDir });
    expect(result.exitCode).toBe(0);

    // Files should be in rootDir/custom/translations
    const rootLangDir = path.join(rootDir, 'custom', 'translations');
    expect(fs.existsSync(rootLangDir)).toBe(true);
    const files = fs.readdirSync(rootLangDir);
    expect(files).toContain('fake-project-de_DE.po');
    expect(files).toContain('fake-project-de_DE.mo');

    // And NOT directly in projectDir/custom/translations
    expect(fs.existsSync(path.join(projectDir, 'custom'))).toBe(false);
  });

  it('should handle unreachable URL gracefully', async () => {
    const puprc = getPuprc({
      i18n: [{
        url: 'http://127.0.0.1:1/does-not-exist',
        textdomain: 'fake-project',
        slug: 'fake-project',
      }],
    });
    writePuprc(puprc, projectDir);

    const result = await runPup('i18n', { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Fetching language files for');
    expect(result.output).toContain('Failed to fetch translation data');
  });
});
