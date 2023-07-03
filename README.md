# pup

StellarWP's **P**roject **U**tilities &amp; **P**ackager (`pup`)

## Installation

## Configuration

At a bare minimum, add the following to your `composer.json` file:

```json
"extra": {
    "pup": {
        "repo"    : "git@github.com:myorg/myplugin.git",
        "zip_name": "myplugin"
    }
}
```

Here are all the possible settings with their defaults:

```json
"extra": {
    "pup": {
        "build_command"  : [
            "npm run build"
        ],
        "changelog"      : "readme.txt",
        "css"            : [],
        "js"             : [],
        "submodule_build": [],
        "repo"           : null,
        "version_files"  : [],
        "views"          : "src/views",
        "zip_command"    : "npm run zip",
        "zip_name"       : null,
        "checks"         : [
            "tbd",
            "version-conflict",
            "view-version"
        ]
    }
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
pup zip [branch] [--dist] [--fresh]
  pup build [--dist]
  pup check [name]
  pup get-version [--dist]
  pup package [--dist]
  pup clean
```