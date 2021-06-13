#!/bin/bash

set -uo pipefail

# VAL=$(rg --files | fzf) || true
# if [[ -n "$VAL" ]]; then
#     echo doing stuff
# else
#     echo "error; not doing stuff"
# fi

VAL=$(\
    rg \
        --files \
        --hidden /tmp 2>/dev/null \
    | fzf --multi --print0 \
    | tee /tmp/lastOutput)

if [[ -n "$VAL" ]]; then
    echo $? > /tmp/yo
    echo success
else
    echo "no success"
fi 
