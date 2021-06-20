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

# FZF_DEFAULT_COMMAND=
FZF="$RG_PREFIX $INITIAL_REGEX"
FZF="$FZF $(printf "'%s' " "${PATHS[@]}")"
echo "$FZF"
# exit 1
# IFS sets the delimiter
# -r: raw
# -a: array
set -x
IFS=: read -ra VAL < <(
  FZF_DEFAULT_COMMAND="$FZF" \
  fzf --ansi \
      --delimiter : \
      --phony --query "" \
      --bind "change:reload:sleep 0.1; $RG_PREFIX {q} $(printf "'%s' " "${PATHS[@]}") || true" \
      --preview "$PREVIEW_CMD" \
      --preview-window "$PREVIEW_WINDOW"
)
# Output is filename, line number, character, contents

if [[ ${#VAL[@]} -eq 0 ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    FILENAME=${VAL[0]}:${VAL[1]}
    "$(dirname "$0")/open_file.sh" "$FILENAME"
fi
