# Glob patterns

The `pup zip` and `pup package` commands have support for specifying files to include and exclude within your packaged
project using `.distignore` (for exclusions) and `.distfiles` (for inclusions) files. The format of these files can be
written in globstar syntax with one caveat: negation.

## Glob patterns

* [Explicit file matches](#explicit-file-matches)
* [Loose file matches](#loose-file-matches)
* [Wildcard matches](#wildcard-matches)
* [Wildcard directories](#wildcard-directories)
* [Glob capture groups](#glob-capture-groups)
* [Regex capture groups](#regex-capture-groups)
* [POSIX character classes](#posix-character-classes)
* [Regex symbols](#regex-symbols)
* [Negation](#negation)

### Explicit file matches

You can match specific files by preceding the line with a `/`, which will cause matches to be exact from the project
root.

```bash
/license.txt
/src/resources/js/whatever.js
```

If you have the following directory structure:

```bash
license.txt         # matches
src/
  resources/
    js/
      whatever.js   # matches
      bacon.js
      license.txt
```

### Loose file matches

You can match a file or directory path that occurs at any depth:

```bash
license.txt
src/resources/js/whatever.js
```

If you have the following directory structure:

```bash
license.txt             # matches
src/
  resources/
    js/
      whatever.js       # matches
      bacon.js
      license.txt       # matches
      src/
        resources/
          js/
            whatever.js # matches
```

### Wildcard matches

You can match a file or directory with a wildcard:

```bash
*.md
src/resources/*
src/Core/*/*.php
```

If you have the following directory structure:

```bash
readme.md                 # matches
license.md                # matches
src/
  Core/
    Controllers/
      A.php               # matches
      B.php               # matches
      C.js
    Models/
      AbstractModel.php   # matches
      Model.php           # matches
  resources/
    js/
      whatever.js         # matches
      license.txt         # matches
    css/
      whatever.css        # matches
    readme.txt            # matches
```

### Wildcard directories

You can match files within any depth of directories:

```bash
src/**/*.md
```

If you have the following directory structure:

```bash
readme.md
src/
  x.md           # matches
  Core/
    z.md         # matches
    Controllers/
      bork.md    # matches
```

### Glob capture groups

You can capture parts of a glob pattern using capture groups:

* `+(js|css|whatever)` - Will match one or more of `js`, `css`, or `whatever`. `js` will match, `jscsswhatever` will match, etc.
* `?(js|css|whatever)` - Will match zero or one of `js`, `css`, or `whatever`.
* `*(js|css|whatever)` - Will match zero or more of `js`, `css`, or `whatever`.
* `@(js|css|whatever)` - Will match exactly one of `js`, `css`, or `whatever`.

### Regex capture groups

Like the glob capture groups, `pup` also supports the following regex capture groups:

* `(js|css|whatever)+` - Will match one or more of `js`, `css`, or `whatever`. `js` will match, `jscsswhatever` will match, etc.
* `(js|css|whatever)?` - Will match zero or one of `js`, `css`, or `whatever`.
* `(js|css|whatever)*` - Will match zero or more of `js`, `css`, or `whatever`.

### POSIX character classes

You can use POSIX character classes to match files:

* `[:alnum:]` - Alphanumeric characters
* `[:blank:]` - Space and tab characters
* `[:digit:]` - Numeric characters
* `[:lower:]` - Lowercase alphabetic characters
* `[:space:]` - Whitespace characters
* `[:upper:]` - Uppercase alphabetic characters
* `[:word:]` - Word characters
* `[:xdigit:]` - Hexadecimal characters

### Regex symbols

Lastly, you can use regex symbols to match files:

* `?` - Matches zero or one of the preceding character.
* `+` - Matches one or more of the preceding character.

### Negation

You can negate any of the above patterns by preceding the line with a `!`:

```bash
!*.md
!src/resources/*
```

What is happening behind the scenes is that the negated line is moved to the inverse collection of patterns. Meaning,
if you have a negated line in a `.distfiles` (the file where you specify what is included), it is handled as if it were
in the `.distignore` file - and vice versa.