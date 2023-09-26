#!/bin/bash
set -euxo pipefail

echo "Checking out release..."
git fetch
git checkout release
git pull --ff-only
git merge --ff-only main
git push
echo "Done. Switching back to main..."
git checkout main
echo "done"

