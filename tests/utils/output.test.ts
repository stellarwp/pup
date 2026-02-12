/**
 * chalk v5 is ESM-only and uses Node subpath imports (#ansi-styles) that
 * ts-jest cannot resolve, so importing output.ts directly would fail.
 *
 * We mock chalk as a passthrough proxy so all chained calls (e.g.
 * chalk.bold.yellow()) simply return the input string unmodified.
 */
jest.mock('chalk', () => {
  const identity = (str: string) => str;
  const handler: ProxyHandler<typeof identity> = {
    get: () => new Proxy(identity, handler),
    apply: (_target, _thisArg, args) => args[0],
  };
  return { __esModule: true, default: new Proxy(identity, handler) };
});

import * as output from '../../src/utils/output.js';

describe('output utilities', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(' '));
    };
    output.setPrefix('');
  });

  afterEach(() => {
    console.log = originalLog;
  });

  describe('table()', () => {
    it('should render a header row and separator', () => {
      output.table(['Name', 'Value'], [['foo', 'bar']]);

      expect(consoleOutput[0]).toBe('| Name | Value |');
      expect(consoleOutput[1]).toBe('|------|-------|');
      expect(consoleOutput[2]).toBe('| foo  | bar   |');
    });

    it('should pad columns based on widest content', () => {
      output.table(
        ['Col', 'Description'],
        [
          ['a', 'short'],
          ['longer-name', 'x'],
        ],
      );

      // Header separator should match the widest column widths
      expect(consoleOutput[1]).toContain('-'.repeat('longer-name'.length + 2));
      // All rows should have consistent pipe positions
      const pipePositions = (line: string) => [...line].reduce<number[]>((acc, ch, i) => {
        if (ch === '|') acc.push(i);
        return acc;
      }, []);

      const headerPipes = pipePositions(consoleOutput[0]);
      const row1Pipes = pipePositions(consoleOutput[2]);
      const row2Pipes = pipePositions(consoleOutput[3]);
      expect(headerPipes).toEqual(row1Pipes);
      expect(headerPipes).toEqual(row2Pipes);
    });

    it('should handle empty rows array', () => {
      output.table(['A', 'B'], []);

      expect(consoleOutput).toHaveLength(2); // header + separator only
      expect(consoleOutput[0]).toBe('| A | B |');
    });

    it('should handle cells with ANSI codes and pad correctly', () => {
      // Construct ANSI-colored string manually: cyan "foo"
      const colored = '\x1b[36mfoo\x1b[39m';
      output.table(['Name'], [[colored], ['longer']]);

      // The separator should be based on 'longer' (6 chars), not the ANSI-coded 'foo'
      expect(consoleOutput[1]).toBe('|--------|');
      // The colored cell should be padded to match 'longer' width
      expect(consoleOutput[2]).toBe('| \x1b[36mfoo\x1b[39m    |');
    });

    it('should handle missing cells gracefully', () => {
      output.table(['A', 'B', 'C'], [['only-one']]);

      expect(consoleOutput[2]).toContain('only-one');
      // Should not throw
      expect(consoleOutput).toHaveLength(3);
    });
  });

  describe('section()', () => {
    it('should print the section header', () => {
      output.section('Test Section');

      const nonEmpty = consoleOutput.filter((line) => line !== '');
      expect(nonEmpty[0]).toContain('Test Section');
    });

    it('should print a dashed underline matching header length', () => {
      output.section('My Header');

      const dashLine = consoleOutput.find((line) => /^-+$/.test(line));
      expect(dashLine).toBeDefined();
      expect(dashLine!.length).toBe('My Header'.length);
    });

    it('should have blank lines before and after', () => {
      output.section('Title');

      expect(consoleOutput[0]).toBe('');
      expect(consoleOutput[consoleOutput.length - 1]).toBe('');
    });
  });

  describe('title()', () => {
    it('should print the title with = underline', () => {
      output.title('My Title');

      const nonEmpty = consoleOutput.filter((line) => line !== '');
      expect(nonEmpty[0]).toContain('My Title');
      expect(nonEmpty[1]).toContain('='.repeat('My Title'.length));
    });

    it('should have blank lines before and after', () => {
      output.title('Hello');

      expect(consoleOutput[0]).toBe('');
      expect(consoleOutput[consoleOutput.length - 1]).toBe('');
    });
  });
});
