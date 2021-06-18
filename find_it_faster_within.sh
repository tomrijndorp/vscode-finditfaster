#!/usr/bin/env bash
set -euo pipefail

# 1. Search for text in files using Ripgrep
# 2. Interactively restart Ripgrep with reload action
# 3. Open the file in Vim
RG_PREFIX="rg --column --line-number --no-heading --color=always --smart-case "
# We match against the beginning of the line so everything matches but nothing gets highlighted
INITIAL_REGEX="^"
# IFS sets the delimiter
# -r: raw
# -a: array
PATHS=("$@")
PATHS_STR="${PATHS[*]}"

IFS=: read -ra VAL < <(
  FZF_DEFAULT_COMMAND="$RG_PREFIX $INITIAL_REGEX $PATHS_STR" \
  fzf --ansi \
      --disabled --query "" \
      --bind "change:reload:sleep 0.1; $RG_PREFIX {q} $PATHS_STR || true" \
      --delimiter : \
      --preview 'bat --color=always {1} --highlight-line {2}' \
      --preview-window 'up,60%,border-bottom,+{2}+3/3,~3'
)
# Output is filename, line number, character, contents

# echo "We got ${VAL[*]}"
if [[ ${#VAL[@]} -eq 0 ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    URINAME=${VAL[0]// /%20}:${VAL[1]}
    open -a "$VSCODE_PATH" "vscode://file/$URINAME"
    echo "0" > "$CANARY_FILE"
fi
