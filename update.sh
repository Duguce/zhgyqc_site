#!/usr/bin/env bash
# Publishes the site: commits the working tree and pushes to GitHub, where
# Actions rebuilds and deploys it.
set -euo pipefail

cd "$(dirname "$0")"

# `bash` on this machine is WSL, and its Linux git does not read the
# core.autocrlf=true that Git for Windows applies, so every CRLF file in the
# checkout looks modified. Pinning the setting keeps both gits in agreement
# about what actually changed.
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=core.autocrlf
export GIT_CONFIG_VALUE_0=true

if [ "$(git config --get core.autocrlf)" != "true" ]; then
  echo "Aborting: could not pin core.autocrlf, so git may report every file as changed." >&2
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to commit."
  exit 0
fi

git status --short
git add -A
git commit -m "updating site on $(date '+%a %b %d %H:%M:%S %Y')"
git push origin master
