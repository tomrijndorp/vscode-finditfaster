#!/usr/bin/env bash
set -uo pipefail  # No -e to support write to canary file after cancel

IFS=: read -r -a GLOB_PATTERNS <<< "$GLOBS"
GLOBS=()
for ENTRY in ${GLOB_PATTERNS[@]+"${GLOB_PATTERNS[@]}"}; do
    GLOBS+=("--glob")
    GLOBS+=("$ENTRY")
done
IFS=: read -r -a TYPE_FILTER <<< "${TYPE_FILTER:-}"
TYPE_FILTER_ARR=()
for ENTRY in ${TYPE_FILTER[@]+"${TYPE_FILTER[@]}"}; do
    TYPE_FILTER_ARR+=("--type")
    TYPE_FILTER_ARR+=("$ENTRY")
done
# 1. Search for text in files using Ripgrep
# 2. Interactively restart Ripgrep with reload action
# 3. Open the file in Vim
RG_PREFIX="rg \
    --column \
    --hidden \
    --line-number \
    --no-heading \
    --color=always \
    --smart-case \
    --colors 'match:fg:green' \
    --colors 'path:fg:white' \
    --colors 'path:style:nobold' \
    --glob '!**/.git/' \
    $(printf "'%s' " "${GLOBS[@]}") \
    $(printf "'%s' " "${TYPE_FILTER_ARR[@]}") \
    2> /dev/null \
    "

PREVIEW_ENABLED=${FIND_WITHIN_FILES_PREVIEW_ENABLED:-1}
PREVIEW_COMMAND=${FIND_WITHIN_FILES_PREVIEW_COMMAND:-'bat --decorations=always --color=always {1} --highlight-line {2} --theme=1337 --style=header,grid'}
PREVIEW_WINDOW=${FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG:-'right:border-left:50%:+{2}+3/3:~3'}
HAS_SELECTION=${HAS_SELECTION:-}
QUERY=''

if [[ "$HAS_SELECTION" -eq 1 ]]; then
    QUERY="$(cat "$SELECTION_FILE")"
fi

# Some backwards compatibility stuff
FZF_VER=$(fzf --version)
FZF_VER_PT1=${FZF_VER:0:3}
FZF_VER_PT2=${FZF_VER:3:1}
if [[ $FZF_VER_PT1 == "0.2" && $FZF_VER_PT2 -lt 7 ]]; then
    if [[ "$PREVIEW_COMMAND" != "$FIND_WITHIN_FILES_PREVIEW_COMMAND" ]]; then
        PREVIEW_COMMAND='bat {1} --color=always --highlight-line {2} --line-range {2}:'
    fi
    if [[ "$PREVIEW_WINDOW" != "$FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG" ]]; then
        PREVIEW_WINDOW='right:50%'
    fi
fi

PREVIEW_STR=()
if [[ "$PREVIEW_ENABLED" -eq 1 ]]; then
    PREVIEW_STR=(--preview "$PREVIEW_COMMAND" --preview-window "$PREVIEW_WINDOW")
fi

# We match against the beginning of the line so everything matches but nothing gets highlighted
INITIAL_REGEX="^"
PATHS=("$@")

FZF_CMD="$RG_PREFIX $INITIAL_REGEX"
FZF_CMD="$FZF_CMD $(printf "'%s' " "${PATHS[@]}")"
# echo $FZF_CMD
# exit 1
# IFS sets the delimiter
# -r: raw
# -a: array
# Quick note on ${PREVIEW_STR[@]+"${PREVIEW_STR[@]}"}: Don't ask.
# https://stackoverflow.com/q/7577052/888916
IFS=: read -ra VAL < <(
  FZF_DEFAULT_COMMAND="$FZF_CMD" \
  fzf --ansi \
      --delimiter : \
      --phony --query "$QUERY" \
      --bind "change:reload:sleep 0.1; $RG_PREFIX {q} $(printf "'%s' " "${PATHS[@]}") || true" \
      ${PREVIEW_STR[@]+"${PREVIEW_STR[@]}"} \
)
# Output is filename, line number, character, contents

if [[ ${#VAL[@]} -eq 0 ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    FILENAME=${VAL[0]}:${VAL[1]}:${VAL[2]}
    echo "$FILENAME" > "$CANARY_FILE"
fi
