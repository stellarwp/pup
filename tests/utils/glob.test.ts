import { globToRegex } from '../../src/utils/glob';

describe('globToRegex', () => {
  const testCases = [
    {
      glob: '/license.txt',
      match: ['license.txt'],
      notMatch: ['src/license.txt'],
    },
    {
      glob: 'src/**/*.js',
      match: ['src/js/index.js', 'src/js/other.js', 'src/bork/other/other.js'],
      notMatch: ['src/js/index.css', 'src/js/other.css', 'src/bork/other/other.php'],
    },
    {
      glob: 'src/js?/*.js',
      match: ['src/js/index.js', 'src/js/other.js', 'src/j/other.js'],
      notMatch: [
        'src/js/index.css',
        'src/js/other.css',
        'src/jb/other.js',
        'src/bork/other/other.js',
        'src/bork/other/other.php',
      ],
    },
    {
      glob: 'src/+(js|app)/*.js',
      match: ['src/js/index.js', 'src/js/other.js', 'src/app/other.js'],
      notMatch: [
        'src/js/index.css',
        'src/js/other.css',
        'src/jb/other.js',
        'src/bork/other/other.js',
        'src/bork/other/other.php',
      ],
    },
    {
      glob: 'src/@(js|app)/*.js',
      match: ['src/js/index.js', 'src/js/other.js', 'src/app/other.js'],
      notMatch: ['src/jsapp/other.js', 'src/jsjs/other.js'],
    },
    {
      glob: 'src/j?(s|b)/*.js',
      match: ['src/js/index.js', 'src/js/other.js', 'src/jb/other.js'],
      notMatch: ['src/jss/other.js', 'src/jsb/other.js', 'src/app/other.js'],
    },
    {
      glob: 'src/j*(s|b)/*.js',
      match: [
        'src/js/index.js',
        'src/jb/other.js',
        'src/j/other.js',
        'src/jss/other.js',
        'src/jsb/other.js',
      ],
      notMatch: ['src/jj/other.js', 'src/app/other.js'],
    },
    {
      glob: 'src/[:upper:]+/*.js',
      match: ['src/JS/index.js', 'src/CSS/other.js'],
      notMatch: [
        'src/jS/index.css',
        'src/js/other.css',
        'src/bork/other/other.js',
        'src/bork/other/other.php',
      ],
    },
    {
      glob: 'src/[:lower:]+/*.js',
      match: ['src/js/index.js', 'src/js/other.js'],
      notMatch: ['src/JS/index.js', 'src/Js/other.js'],
    },
    {
      glob: 'src/[:word:]/*.js',
      match: ['src/js/index.js', 'src/js/other.js'],
      notMatch: [
        'src/js/index.css',
        'src/js/other.css',
        'src/bork/other/other.js',
        'src/bork/other/other.php',
      ],
    },
    {
      glob: 'src/[:lower:][:digit:]+/*.js',
      match: ['src/v1/index.js', 'src/v2234/other.js'],
      notMatch: ['src/js/other.js', 'src/bork/other/other.js', 'src/bork/other/other.php'],
    },
    {
      glob: 'src/[:lower:][:xdigit:]+/*.js',
      match: ['src/v1/index.js', 'src/v2F/other.js'],
      notMatch: [
        'src/js/other.js',
        'src/vG/other.js',
        'src/bork/other/other.js',
        'src/bork/other/other.php',
      ],
    },
    {
      glob: 'src/v[:blank:]*[:digit:]/*.js',
      match: ['src/v1/index.js', 'src/v 2/other.js', 'src/v   3/other.js'],
      notMatch: ['src/bork/other/other.js', 'src/bork/other/other.php'],
    },
    {
      glob: 'src/v[:space:]*[:digit:]/*.js',
      match: ['src/v1/index.js', 'src/v 2/other.js', 'src/v   3/other.js'],
      notMatch: ['src/bork/other/other.js', 'src/bork/other/other.php'],
    },
    {
      glob: 'src/v+/*.js',
      match: ['src/v/index.js', 'src/vv/other.js', 'src/vvv/other.js'],
      notMatch: ['src/bork/other/other.js', 'src/bork/other/other.php'],
    },
    {
      glob: 'src/v*/**/js/**/*.js',
      match: [
        'src/vasdf/js/index.js',
        'src/vasdf/asdf/js/index.js',
        'src/vasdf/asdf/js/asdf/index.js',
        'src/vasdf/asdf/js/asdf/asdf/index.js',
      ],
      notMatch: ['src/bork/other/other.js', 'src/bork/other/other.php'],
    },
  ];

  for (const tc of testCases) {
    describe(`glob: ${tc.glob}`, () => {
      it('should match expected paths', () => {
        const regex = globToRegex(tc.glob);
        for (const file of tc.match) {
          expect(file).toMatch(regex);
        }
      });

      it('should not match unexpected paths', () => {
        const regex = globToRegex(tc.glob);
        for (const file of tc.notMatch) {
          expect(file).not.toMatch(regex);
        }
      });
    });
  }
});
