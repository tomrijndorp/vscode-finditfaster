#!/bin/bash
set -euo pipefail

PATHS=("$@")

clear
echo -e "----------"
echo -e "\033[35;1mThe following files are on your search path:\033[0m"
for P in "${PATHS[@]+"${PATHS[@]}"}"; do
    echo "- $P"
done
echo -e "\n$(cat "${EXPLAIN_FILE}")"
echo -e "----------\n"

echo -e "All these paths are configurable. If you are expecting a path but not seeing it here,"
echo -e "it may be turned off in the settings.\n\n"