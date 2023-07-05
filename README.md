# pup

StellarWP's **P**roject **U**tilities &amp; **P**ackager (`pup`)

## Installation

## Configuration

At a bare minimum, add the following to your `.puprc` file:

```json
{
    "zip_name": "myplugin"
}
```

Here are all the possible settings with their defaults:

```json
{
    "build"          : [],
    "changelog"      : "readme.txt",
    "css"            : [],
    "js"             : [],
    "repo"           : null, // Defaults to composer.json "name".
    "version_files"  : [],
    "views"          : [],
    "zip_name"       : null, // Defaults to composer.json "name" after the slash.
    "checks"         : [
        "tbd",
        "version-conflict",
        "view-version"
    ]
}
```

Here's a typical usecase of specifying version files:

```json
"extra": {
    "pup": {
        "zip_name": "myplugin",
        "version_files": [
            {
                "file": "bootstrap-file.php",
                "regex": "(define\\( 'MYPRODUCT_VERSION', ')([^']+)"
            },
            {
                "file": "bootstrap-file.php",
                "regex": "(Version: )([^\\s]+)"
            },
            {
                "file": "readme.txt",
                "regex": "(Stable tag: )([^\\s]+)"
            }
        ],
    }
}
```

```bash
pup zip [branch] [--dev] [--no-clone]
  pup build [--dev]
  pup check [name]
  pup get-version [--dev]
  pup package {version}
  pup clean
``` 