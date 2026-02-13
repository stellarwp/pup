import {
  runPup,
  writePuprc,
  getPuprc,
  createTempProject,
  cleanupTempProjects,
} from '../helpers/setup.js';

jest.mock('../../src/config.js', () => ({
  getConfig: jest.fn(),
}));

jest.mock('../../src/utils/process.js', () => ({
  runCommandSilent: jest.fn(),
}));

jest.mock('../../src/utils/output.js', () => ({
  writeln: jest.fn(),
}));

import { getVersion } from '../../src/commands/get-version.js';
import { getConfig } from '../../src/config.js';
import type { Config } from '../../src/config.js';

const mockGetConfig = jest.mocked(getConfig);

describe('get-version command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should get the version from the project', async () => {
    const result = await runPup('get-version', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
  });

  it('should get the dev version from the project', async () => {
    const result = await runPup('get-version --dev', { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
    expect(result.stdout).toContain('dev');
  });

  it('should throw when no version files are configured', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [],
      getWorkingDir: () => projectDir,
    } as unknown as Config);

    await expect(getVersion({})).rejects.toThrow(
      'No version files configured'
    );
  });

  it('should throw when no version file produces a match', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [
        { file: 'bootstrap.php', regex: '(?<version>WILL_NOT_MATCH)' },
      ],
      getWorkingDir: () => projectDir,
    } as unknown as Config);

    await expect(getVersion({ root: projectDir })).rejects.toThrow(
      'Could not find a version in any configured version file'
    );
  });
});
