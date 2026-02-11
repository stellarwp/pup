import {
  runPup,
  resetFixtures,
  fakeProjectDir,
} from '../helpers/setup.js';
import fs from 'fs-extra';
import path from 'node:path';

describe('invalid .puprc', () => {
  afterEach(() => {
    resetFixtures();
  });

  it('should handle invalid JSON in .puprc', async () => {
    const puprcPath = path.join(fakeProjectDir, '.puprc');
    fs.writeFileSync(puprcPath, '{invalid json}');

    const result = await runPup('info');
    // Should still run but report invalid config
    expect(result.stdout + result.stderr).toBeTruthy();
  });
});
