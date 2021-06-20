#!/bin/bash
set -euo pipefail

FILENAME="$1"

OSX_VSCODE_TYPE_ARG='-a'
if [[ ${OSX_VSCODE_REF:0:4} == 'com.' ]]; then OSX_VSCODE_TYPE_ARG='-b'; fi

URINAME=${FILENAME// /%20}
if [[ $(uname) =~ arwin ]]; then
    open $OSX_VSCODE_TYPE_ARG "$OSX_VSCODE_REF" "vscode://file/$URINAME"
else
    # Assume Linux
    set -x
    "$LINUX_VSCODE_REF" --goto "$FILENAME"
    set +x
fi

# shellcheck disable=SC2181
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