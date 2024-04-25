# Workflows

Workflows are a way to declare a series of commands that you want to run in a specific order. This allows you to specify
workflows that differ from the `build` and `build_dev` commands.

* [Defining workflows](#defining-workflows)
* [Calling workflows](#calling-workflows)
* [Pseudo-workflows](#pseudo-workflows)

## Defining workflows

Workflows are defined in the `workflows` property of your `.puprc` file.

```json
{
    "workflows": {
        "my-workflow": [
            "npm ci",
            "npm run build",
            "@composer run some-script"
        ],
        "my-other-workflow": [
            "@composer run some-other-script",
            "@composer run make-pot"
        ]
    }
}
```

## Calling workflows

You can call a workflow by running the `workflow` command (or its alias `do`) with the name of the workflow as an argument.

```bash
pup workflow my-workflow
# OR
pup do my-workflow
```

## Pseudo-workflows

The `build` and `build_dev` properties within your `.puprc` file are also callable via the `workflow` command.

```bash
pup workflow build
```
