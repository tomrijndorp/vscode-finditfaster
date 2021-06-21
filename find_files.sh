#!/bin/bash
set -uo pipefail  # No -e to support write to canary file after cancel

PREVIEW_COMMAND=${FIND_FILES_PREVIEW_COMMAND:-'cat'}
PREVIEW_WINDOW=${FIND_FILES_PREVIEW_WINDOW_CONFIG:-'50%'}
LINUX_VSCODE_REF=${LINUX_VSCODE_REF:-'code'}
OSX_VSCODE_REF=${OSX_VSCODE_REF:-'com.microsoft.VSCode'}
CANARY_FILE=${CANARY_FILE:-'/tmp/canaryFile'}
PATHS=("$@")

callfzf () {
    rg \
        --files \
        --hidden \
        --glob '!**/.git/' \
        "${PATHS[@]}" \
    | fzf \
        --multi \
        --preview "$PREVIEW_COMMAND" \
        --preview-window "$PREVIEW_WINDOW" \
    | tee /tmp/lastOutput
}

VAL=$(callfzf)
if [[ -z "$VAL" ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    echo "$VAL" | while read -r FILENAME; do
        "$(dirname "$0")/open_file.sh" "$FILENAME"
    done
fi
