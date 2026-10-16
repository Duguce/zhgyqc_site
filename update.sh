#!/bin/sh
# Publishes the site: commits the working tree and pushes to GitHub, where
# Actions rebuilds and deploys it. Works with macOS /bin/sh and Linux.
set -eu

cd "$(dirname "$0")"

# The deployment workflow runs on master.
if [ "$(git symbolic-ref --quiet --short HEAD)" != "master" ]; then
  echo "Publish from the master branch."
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "No new changes to commit; pushing existing commits."
else
  git status --short
  git commit -m "${1:-Update site on $(date '+%Y-%m-%d %H:%M:%S')}"
fi
git push origin master
