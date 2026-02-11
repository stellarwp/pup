import {
  runPup,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';
import fs from 'fs-extra';
import path from 'node:path';

describe('invalid .puprc', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should handle invalid JSON in .puprc', async () => {
    const puprcPath = path.join(projectDir, '.puprc');
    fs.writeFileSync(puprcPath, '{invalid json}');

    const result = await runPup('info', { cwd: projectDir });
    // Should still run but report invalid config
    expect(result.output).toContain('could not be parsed');
  });
});
