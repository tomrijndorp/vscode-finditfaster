#!/bin/bash
set -uo pipefail  # No -e to support write to canary file after cancel

PREVIEW_COMMAND=${FIND_FILES_PREVIEW_COMMAND:-'cat'}
PREVIEW_WINDOW=${FIND_FILES_PREVIEW_WINDOW_CONFIG:-'50%'}
LINUX_VSCODE_REF=${LINUX_VSCODE_REF:-'code'}
OSX_VSCODE_REF=${OSX_VSCODE_REF:-'com.microsoft.VSCode'}
OSX_VSCODE_TYPE_ARG='-a'
if [[ ${OSX_VSCODE_REF:0:4} == 'com.' ]]; then OSX_VSCODE_TYPE_ARG='-b'; fi
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
    echo "$VAL" | while read -r FILENAME; do
        URINAME=${FILENAME// /%20}
        if [[ $(uname) =~ arwin ]]; then
            # set -x
            open $OSX_VSCODE_TYPE_ARG "$OSX_VSCODE_REF" "vscode://file/$URINAME"
            # set +x
        else
            # Assume Linux
            set -x
            "$LINUX_VSCODE_REF" --goto "$FILENAME"
            set +x
        fi

        if [[ $? -ne 0 ]]; then
            echo -e "\n\033[31;1;4mProblem.\033[0m\n"
            cat <<EOF
So, it looks like we _almost_ got things working, but things still didn't quite work.

Here's how to hopefully fix this:
- If your VS Code is not installed in the typical location, set the value in the extension's
  configuration. This is dumb, but because we're dealing with the terminal, this extension is a
  little bit more tricky to set up.
- If that didn't solve it, check above the line that says "Problem". It should contain the actual
  error message. Please file a Github issue and hopefully this can be fixed (or at least documented)
  in a next version!
EOF
        else
            echo "0" > "$CANARY_FILE"
        fi
    done
fi
