#!/bin/bash
set -uo pipefail  # No -e to support write to canary file after cancel

PREVIEW_ENABLED=${FIND_FILES_PREVIEW_ENABLED:-1}
PREVIEW_COMMAND=${FIND_FILES_PREVIEW_COMMAND:-'bat --decorations=always --color=always --plain {} --theme=1337'}
PREVIEW_WINDOW=${FIND_FILES_PREVIEW_WINDOW_CONFIG:-'right:50%:border-left'}
CANARY_FILE=${CANARY_FILE:-'/tmp/canaryFile'}
PATHS=("$@")

# Some backwards compatibility stuff
FZF_VER=$(fzf --version)
FZF_VER_MAJ=$(echo "$FZF_VER" | cut -d. -f1)
FZF_VER_MIN=$(echo "$FZF_VER" | cut -d. -f2)
if [[ $FZF_VER_MAJ -eq 0 && $FZF_VER_MIN -lt 27 ]]; then
    PREVIEW_WINDOW='right:50%'
fi

PREVIEW_STR=()
if [[ "$PREVIEW_ENABLED" -eq 1 ]]; then
    PREVIEW_STR=(--preview "$PREVIEW_COMMAND" --preview-window "$PREVIEW_WINDOW")
fi

# Quick note on ${PREVIEW_STR[@]+"${PREVIEW_STR[@]}"}: Don't ask.
# https://stackoverflow.com/q/7577052/888916
callfzf () {
    rg \
        --files \
        --hidden \
        --glob '!**/.git/' \
        "${PATHS[@]}" \
    | fzf \
        --multi \
        ${PREVIEW_STR[@]+"${PREVIEW_STR[@]}"} \
    | tee /tmp/lastOutput
}

VAL=$(callfzf)
if [[ -z "$VAL" ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    echo "$VAL" > "$CANARY_FILE"
fi
