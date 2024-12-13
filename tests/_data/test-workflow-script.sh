#!/usr/bin/env bash

# A test workflow run via the test suite

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
