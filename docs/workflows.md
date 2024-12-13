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

### Pass additional arguments or options to a workflow

You can pass through additional arguments and options to your workflow script.

Example `test-script.sh`:
```bash
#!/usr/bin/env bash

# Loop through all the arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --*=*) # Option in --option=value format
      option="${1%%=*}"  # Extract the option
      value="${1#*=}"    # Extract the value
      echo "Option: $option, Value: $value"
      shift
      ;;
    --*) # Option in --option format (expecting a separate value)
      option=$1
      shift
      if [[ "$1" && ! "$1" =~ ^-- ]]; then
        value=$1
        echo "Option: $option, Value: $value"
        shift
      else
        echo "Option: $option, No value provided"
      fi
      ;;
    *) # Regular argument
      echo "Argument: $1"
      shift
      ;;
  esac
done
```

Example in `.puprc`:
```json
{
    "workflows": {
        "my-test-workflow": [
            "./test-script.sh"
        ]
    }
}
```

Pass through arguments and options to `test-script.sh`:
```bash
pup workflow my-test-workflow -- arg1 arg2 otherArg --option-one=test1 --option-two=test2
```

## Pseudo-workflows

The `build` and `build_dev` properties within your `.puprc` file are also callable via the `workflow` command.

```bash
pup workflow build
```
