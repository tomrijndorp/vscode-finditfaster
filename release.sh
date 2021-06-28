#!/bin/bash
set -euxo pipefail

echo "Checking out release..."
git checkout release
git merge --ff-only main
git push
echo "Done. Switching back to main..."
git checkout main
echo "done"