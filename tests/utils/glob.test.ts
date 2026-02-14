import { isGlobMatch } from '../../src/utils/glob';

describe('isGlobMatch', () => {
  const testCases = [
    {
      glob: 'license.txt',
      match: ['license.txt', 'src/license.txt'],
      notMatch: ['license.md', 'src/license.md'],
    },
    {
      glob: 'src/**/*.js',
      match: ['src/js/index.js', 'src/js/other.js', 'src/bork/other/other.js'],
      notMatch: ['src/js/index.css', 'src/js/other.css', 'src/bork/other/other.php'],
    },
    {
      glob: 'src/js?/*.js',
      match: ['src/jsa/index.js', 'src/jsb/other.js', 'src/js1/other.js'],
      notMatch: [
        'src/js/index.js',
        'src/js/index.css',
        'src/j/other.js',
        'src/bork/other/other.js',
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
      glob: 'src/[[:upper:]]*.js',
      match: ['src/JS.js', 'src/CSS.js', 'src/Foo.js'],
      notMatch: ['src/js.js', 'src/css.js'],
    },
    {
      glob: 'src/[[:lower:]]*.js',
      match: ['src/js.js', 'src/foo.js'],
      notMatch: ['src/JS.js', 'src/Foo.js'],
    },
    {
      glob: 'src/[[:digit:]]*.js',
      match: ['src/1.js', 'src/2foo.js'],
      notMatch: ['src/foo.js', 'src/Foo.js'],
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
    {
      glob: '/license.txt',
      match: ['license.txt'],
      notMatch: ['src/license.txt', 'license.md'],
    },
    {
      glob: '*.php',
      match: ['bootstrap.php', 'src/Plugin.php'],
      notMatch: ['bootstrap.js', 'src/Plugin.ts'],
    },
    {
      glob: 'src/',
      match: ['src/Plugin.php', 'src/deep/file.js'],
      notMatch: ['bootstrap.php', 'other-file.php'],
    },
    {
      glob: '.puprc',
      match: ['.puprc'],
      notMatch: ['puprc', 'src/puprc'],
    },
    {
      glob: '.pup-*',
      match: ['.pup-zip', '.pup-build', '.pup-distfiles'],
      notMatch: ['pup-zip', 'src/pup-build'],
    },
  ];

  for (const tc of testCases) {
    describe(`glob: ${tc.glob}`, () => {
      it('should match expected paths', () => {
        for (const file of tc.match) {
          expect(isGlobMatch(file, tc.glob)).toBe(true);
        }
      });

      it('should not match unexpected paths', () => {
        for (const file of tc.notMatch) {
          expect(isGlobMatch(file, tc.glob)).toBe(false);
        }
      });
    });
  }
});
