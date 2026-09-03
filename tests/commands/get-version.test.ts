import {
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
import { runCommandSilent } from '../../src/utils/process.js';

const mockGetConfig = jest.mocked(getConfig);
const mockRunCommandSilent = jest.mocked(runCommandSilent);

describe('get-version command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should extract version using a named capture group', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [
        { file: 'bootstrap.php', regex: '(Version: )(?<version>.+)' },
      ],
      getWorkingDir: () => projectDir,
    } as unknown as Config);

    const result = await getVersion({});

    expect(result).toBe('1.0.0');
  });

  it('should extract version using a second capture group', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [
        { file: 'bootstrap.php', regex: '(Version: )(.+)' },
      ],
      getWorkingDir: () => projectDir,
    } as unknown as Config);

    const result = await getVersion({});

    expect(result).toBe('1.0.0');
  });

  it('should format the dev version with git timestamp and hash', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [
        { file: 'bootstrap.php', regex: '(Version: )(?<version>.+)' },
      ],
      getWorkingDir: () => projectDir,
    } as unknown as Config);

    mockRunCommandSilent
      .mockResolvedValueOnce({ stdout: '1234567890\n', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'abcd1234\n', stderr: '', exitCode: 0 });

    const result = await getVersion({ dev: true });

    expect(result).toBe('1.0.0-dev-1234567890-abcd1234');
    expect(mockRunCommandSilent).toHaveBeenCalledWith(
      'git show -s --format=%ct HEAD',
      { cwd: projectDir }
    );
    expect(mockRunCommandSilent).toHaveBeenCalledWith(
      'git rev-parse --short=8 HEAD',
      { cwd: projectDir }
    );
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

    await expect(getVersion({})).rejects.toThrow(
      'Could not find a version in any configured version file'
    );
  });
});
