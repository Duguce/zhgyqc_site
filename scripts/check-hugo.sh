#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
expected_version=$(cat "$project_dir/.hugo-version")
hugo_bin=${1:-hugo}

if ! command -v "$hugo_bin" >/dev/null 2>&1; then
  echo "Hugo Extended $expected_version is required; '$hugo_bin' was not found." >&2
  echo "Install that release or set HUGO=/path/to/hugo when running make." >&2
  exit 1
fi

actual_version=$("$hugo_bin" version)
case "$actual_version" in
  "hugo v$expected_version"+extended\ *|"hugo v$expected_version"-*+extended\ *) ;;
  *)
    echo "Expected Hugo Extended $expected_version (.hugo-version)." >&2
    echo "Found: $actual_version" >&2
    exit 1
    ;;
esac
echo "$actual_version"
