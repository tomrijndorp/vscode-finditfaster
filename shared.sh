#!/bin/bash

# ---------- functions ----------

# Join array without inserting a string when the array is empty
array_join() {
    if [[ $# -gt 0 ]]; then
        for arg in "$@"; do
            printf "'%s' " "${arg}"
        done
    fi
}

# ---------- execute immediately ----------
# Code below gets executed as soon as this script is sourced. Think wisely!

# ---------- Set up whether to use gitignore
USE_GITIGNORE_OPT=()
# Disable requiring export; we're sourcing this file.
# shellcheck disable=SC2034
if [[ "$USE_GITIGNORE" -eq 0 ]]; then USE_GITIGNORE_OPT=('--no-ignore'); fi

# ---------- Set up an array for type filtering in rg
IFS=: read -r -a TYPE_FILTER <<< "${TYPE_FILTER:-}"
TYPE_FILTER_ARR=()
for ENTRY in ${TYPE_FILTER[@]+"${TYPE_FILTER[@]}"}; do
    TYPE_FILTER_ARR+=("--type")
    TYPE_FILTER_ARR+=("$ENTRY")
done

# ---------- Set up glob patterns
IFS=: read -r -a GLOB_PATTERNS <<< "$GLOBS"
GLOBS=()
# Quick note on ${X[@]+"${X[@]}"}: It's complicated.
# https://stackoverflow.com/q/7577052/888916
for ENTRY in ${GLOB_PATTERNS[@]+"${GLOB_PATTERNS[@]}"}; do
    GLOBS+=("--glob")
    GLOBS+=("$ENTRY")
done

# Parse fzf version
FZF_VER=$(fzf --version)
FZF_VER_NUM=$(echo "$FZF_VER" | awk '{print $1}') # get rid of "... (brew)", for example
# shellcheck disable=SC2034
FZF_VER_PT1=${FZF_VER:0:3}
# shellcheck disable=SC2034
FZF_VER_PT2=${FZF_VER:3:1}
