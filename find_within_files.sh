#!/usr/bin/env bash
set -uo pipefail  # No -e to support write to canary file after cancel

# 1. Search for text in files using Ripgrep
# 2. Interactively restart Ripgrep with reload action
# 3. Open the file in Vim
RG_PREFIX="rg \
    --column \
    --line-number \
    --no-heading \
    --color=always \
    --smart-case \
    --colors 'match:fg:green' \
    --colors 'path:fg:white' \
    --colors 'path:style:nobold' \
    "

PREVIEW_CMD=${FIND_WITHIN_FILES_PREVIEW_COMMAND:-'cat {1}'}
PREVIEW_WINDOW=${FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG}

FZF_VER=$(fzf --version)
FZF_VER_MAJ=$(echo "$FZF_VER" | cut -d. -f1)
FZF_VER_MIN=$(echo "$FZF_VER" | cut -d. -f2)
if [[ $FZF_VER_MAJ -eq 0 && $FZF_VER_MIN -lt 26 ]]; then
    PREVIEW_CMD='bat {1} --color=always --highlight-line {2} --line-range {2}:'
    PREVIEW_WINDOW='right:50%'
fi

# We match against the beginning of the line so everything matches but nothing gets highlighted
INITIAL_REGEX="^"
PATHS=("$@")
PATHS_STR="${PATHS[*]}"

# IFS sets the delimiter
# -r: raw
# -a: array
IFS=: read -ra VAL < <(
  FZF_DEFAULT_COMMAND="$RG_PREFIX $INITIAL_REGEX $PATHS_STR" \
  fzf --ansi \
      --delimiter : \
      --phony --query "" \
      --bind "change:reload:sleep 0.1; $RG_PREFIX {q} $PATHS_STR || true" \
      --preview "$PREVIEW_CMD" \
      --preview-window "$PREVIEW_WINDOW"
)
# Output is filename, line number, character, contents

if [[ ${#VAL[@]} -eq 0 ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    URINAME=${VAL[0]// /%20}:${VAL[1]}
    open -a "$VSCODE_PATH" "vscode://file/$URINAME"
    echo "0" > "$CANARY_FILE"
fi
