jest.mock('../../src/utils/process.js', () => ({
  runCommandSilent: jest.fn(),
}));

import { getDevSuffix } from '../../src/utils/version.js';
import { runCommandSilent } from '../../src/utils/process.js';

const mockRunCommandSilent = jest.mocked(runCommandSilent);

describe('getDevSuffix', () => {
  it('should build the suffix from the git timestamp and hash', async () => {
    mockRunCommandSilent
      .mockResolvedValueOnce({ stdout: '1234567890\n', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'abcd1234\n', stderr: '', exitCode: 0 });

    const result = await getDevSuffix('/tmp/project');

    expect(result).toBe('-dev-1234567890-abcd1234');
  });

  it('should run the git commands in the given directory', async () => {
    mockRunCommandSilent
      .mockResolvedValueOnce({ stdout: '1234567890\n', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'abcd1234\n', stderr: '', exitCode: 0 });

    await getDevSuffix('/tmp/project');

    expect(mockRunCommandSilent).toHaveBeenCalledWith(
      'git show -s --format=%ct HEAD',
      { cwd: '/tmp/project' }
    );
    expect(mockRunCommandSilent).toHaveBeenCalledWith(
      'git rev-parse --short=8 HEAD',
      { cwd: '/tmp/project' }
    );
    expect(mockRunCommandSilent).toHaveBeenCalledTimes(2);
  });

  it('should trim surrounding whitespace from the git output', async () => {
    mockRunCommandSilent
      .mockResolvedValueOnce({ stdout: '  1700000000  \n', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: '\n deadbeef \n', stderr: '', exitCode: 0 });

    const result = await getDevSuffix('/tmp/project');

    expect(result).toBe('-dev-1700000000-deadbeef');
  });
});
