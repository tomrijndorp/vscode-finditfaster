#!/bin/bash
set -uo pipefail

PREVIEW_COMMAND=${PREVIEW_COMMAND:-'bat --force-colorization --plain {}'}
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
