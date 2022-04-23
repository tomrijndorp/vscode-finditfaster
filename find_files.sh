#!/bin/bash
set -uo pipefail  # No -e to support write to canary file after cancel

. "$EXTENSION_PATH/shared.sh"

PREVIEW_ENABLED=${FIND_FILES_PREVIEW_ENABLED:-1}
PREVIEW_COMMAND=${FIND_FILES_PREVIEW_COMMAND:-'bat --decorations=always --color=always --plain {}'}
PREVIEW_WINDOW=${FIND_FILES_PREVIEW_WINDOW_CONFIG:-'right:50%:border-left'}
HAS_SELECTION=${HAS_SELECTION:-}
CANARY_FILE=${CANARY_FILE:-'/tmp/canaryFile'}
QUERY=''

# If we only have one directory to search, invoke commands relative to that directory
PATHS=("$@")
SINGLE_DIR_ROOT=''
if [ ${#PATHS[@]} -eq 1 ]; then
  SINGLE_DIR_ROOT=${PATHS[0]}
  PATHS=()
  cd "$SINGLE_DIR_ROOT" || exit
fi

if [[ "$HAS_SELECTION" -eq 1 ]]; then
    QUERY="$(cat "$SELECTION_FILE")"
fi

IFS=: read -r -a GLOB_PATTERNS <<< "$GLOBS"
GLOBS=()
# Quick note on ${X[@]+"${X[@]}"}: It's complicated.
# https://stackoverflow.com/q/7577052/888916
for ENTRY in ${GLOB_PATTERNS[@]+"${GLOB_PATTERNS[@]}"}; do
    GLOBS+=("--glob")
    GLOBS+=("$ENTRY")
done

# Some backwards compatibility stuff
FZF_VER=$(fzf --version)
FZF_VER_PT1=${FZF_VER:0:3}
FZF_VER_PT2=${FZF_VER:3:1}
if [[ $FZF_VER_PT1 == "0.2" && $FZF_VER_PT2 -lt 7 ]]; then
    PREVIEW_WINDOW='right:50%'
fi

PREVIEW_STR=()
if [[ "$PREVIEW_ENABLED" -eq 1 ]]; then
    PREVIEW_STR=(--preview "$PREVIEW_COMMAND" --preview-window "$PREVIEW_WINDOW")
fi

IFS=: read -r -a TYPE_FILTER <<< "${TYPE_FILTER:-}"
TYPE_FILTER_ARR=()
for ENTRY in ${TYPE_FILTER[@]+"${TYPE_FILTER[@]}"}; do
    TYPE_FILTER_ARR+=("--type")
    TYPE_FILTER_ARR+=("$ENTRY")
done

callfzf () {
    rg \
        --files \
        --hidden \
        $(array_join ${USE_GITIGNORE_OPT+"${USE_GITIGNORE_OPT[@]}"}) \
        --glob '!**/.git/' \
        ${GLOBS[@]+"${GLOBS[@]}"} \
        ${TYPE_FILTER_ARR[@]+"${TYPE_FILTER_ARR[@]}"} \
        ${PATHS[@]+"${PATHS[@]}"} \
        2> /dev/null \
    | fzf \
        --cycle \
        --multi \
        --query "${QUERY}" \
        ${PREVIEW_STR[@]+"${PREVIEW_STR[@]}"}
}

set -x
VAL=$(callfzf)
set +x

if [[ -z "$VAL" ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    if [[ -n "$SINGLE_DIR_ROOT" ]]; then
        TMP=$(mktemp)
        echo "$VAL" > "$TMP"
        sed "s|^|$SINGLE_DIR_ROOT/|" "$TMP" > "$CANARY_FILE"
        rm "$TMP"
    else
        echo "$VAL" > "$CANARY_FILE"
    fi
fi
