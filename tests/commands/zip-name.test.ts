import { Command } from 'commander';
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

import { registerZipNameCommand } from '../../src/commands/zip-name.js';
import { getConfig } from '../../src/config.js';
import type { Config } from '../../src/config.js';
import { runCommandSilent } from '../../src/utils/process.js';
import * as output from '../../src/utils/output.js';

const mockGetConfig = jest.mocked(getConfig);
const mockRunCommandSilent = jest.mocked(runCommandSilent);
const mockWriteln = jest.mocked(output.writeln);

async function runZipName(args: string[] = []): Promise<void> {
  const program = new Command();
  program.exitOverride();
  registerZipNameCommand(program);
  await program.parseAsync(['node', 'test', 'zip-name', ...args]);
}

describe('zip-name command', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempProject();
    writePuprc(getPuprc(), projectDir);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTempProjects();
  });

  it('should combine zip name and version', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [
        { file: 'bootstrap.php', regex: '(Version: )(?<version>.+)' },
      ],
      getWorkingDir: () => projectDir,
      getZipName: () => 'fake-project',
    } as unknown as Config);

    await runZipName();

    expect(mockWriteln).toHaveBeenCalledWith('fake-project.1.0.0');
  });

  it('should use an explicit version argument', async () => {
    mockGetConfig.mockReturnValue({
      getZipName: () => 'fake-project',
    } as unknown as Config);

    await runZipName(['2.5.0']);

    expect(mockWriteln).toHaveBeenCalledWith('fake-project.2.5.0');
  });

  it('should include dev suffix when --dev is passed', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [
        { file: 'bootstrap.php', regex: '(Version: )(?<version>.+)' },
      ],
      getWorkingDir: () => projectDir,
      getZipName: () => 'fake-project',
    } as unknown as Config);

    mockRunCommandSilent
      .mockResolvedValueOnce({ stdout: '1234567890\n', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'abcd1234\n', stderr: '', exitCode: 0 });

    await runZipName(['--dev']);

    expect(mockWriteln).toHaveBeenCalledWith(
      'fake-project.1.0.0-dev-1234567890-abcd1234'
    );
  });

  it('should fail when version cannot be determined', async () => {
    mockGetConfig.mockReturnValue({
      getVersionFiles: () => [
        { file: 'bootstrap.php', regex: '(?<version>WILL_NOT_MATCH)' },
      ],
      getWorkingDir: () => projectDir,
      getZipName: () => 'fake-project',
    } as unknown as Config);

    await expect(runZipName()).rejects.toThrow(
      'Could not find a version in any configured version file'
    );
  });
});
