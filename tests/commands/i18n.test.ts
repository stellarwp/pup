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

// Routes for the mock GlotPress API
const routes: Record<string, { status: number; body: string; contentType?: string }> = {
  '/api/projects/wp-plugins/fake-project/stable': {
    status: 200,
    body: JSON.stringify({
      translation_sets: [
        { locale: 'de', wp_locale: 'de_DE', percent_translated: 80 },
        { locale: 'fr', wp_locale: 'fr_FR', percent_translated: 50 },
        { locale: 'ja', wp_locale: 'ja', percent_translated: 10 },
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
      res.end(Buffer.from('fake translation content'));
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
    expect(result.output).toContain('Fetching translations from');
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
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Failed to fetch translations: HTTP 404');
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
    expect(result.exitCode).toBe(0);
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
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Invalid translation API response');
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
    // Default threshold is 30%, so de (80%) and fr (50%) should pass, ja (10%) should not
    expect(result.output).toContain('Found 2 translations meeting 30% threshold');
    expect(result.output).toContain('Translation downloads complete');

    // Verify files were downloaded
    const langDir = path.join(projectDir, 'lang');
    expect(fs.existsSync(langDir)).toBe(true);

    const files = fs.readdirSync(langDir);
    // Should have po + mo for de_DE and fr_FR = 4 files
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
    expect(result.output).toContain('Found 1 translations meeting 70% threshold');
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
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Fetching translations from');
    expect(result.output).toContain('Failed to fetch translation data');
  });
});
