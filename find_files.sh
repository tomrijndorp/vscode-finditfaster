#!/bin/bash
set -uo pipefail  # No -e to support write to canary file after cancel

PREVIEW_COMMAND=${FIND_FILES_PREVIEW_COMMAND:-'cat'}
PREVIEW_WINDOW=${FIND_FILES_PREVIEW_WINDOW_CONFIG:-'50%,border-left'}
VSCODE_PATH=${VSCODE_PATH:-'/Applications/Visual Studio Code.app'}
CANARY_FILE=${CANARY_FILE:-'/tmp/canaryFile'}
PATHS=("$@")

callfzf () {
    rg \
        --files \
        --hidden \
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
    echo "$VAL" | while read -r LINE; do
        URINAME=${LINE// /%20}
        open -a "$VSCODE_PATH" "vscode://file/$URINAME"
    done
    echo "0" > "$CANARY_FILE"
fi
