# pup

StellarWP's **P**roject **U**tilities &amp; **P**ackager (`pup`)

## Installation

## Configuration

At a bare minimum, add the following to your `composer.json` file:

```json
"extra": {
    "pup": {
        "bootstrap"      : "path/to/your/bootstrap/file.php",
        "version_file"   : "path/to/your/file/with/project/version/number.php",
    }
}
```

Here are all the possible settings with their defaults:

```json
"extra": {
    "pup": {
        "bootstrap"      : null,
        "build_command"  : "npm run build",
        "changelog"      : "readme.txt",
        "css": [
            "src/resources/css"
        ],
        "js": [
            "src/resources/js"
        ],
        "submodule_build": [],
        "submodule_sync" : false,
        "version_file"   : null,
        "version_search" : "VERSION",
        "views"          : "src/views",
        "zip_command"    : "npm run zip",
        "checks"         : [
            "tbd",
            "version-conflict",
            "view-version"
        ]
    }
}
```