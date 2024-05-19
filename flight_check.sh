#!/bin/bash
set -euo pipefail

echo "Pre-Flight check:"
echo "-----------------"

echo "Checking your OS version..."
echo "OS: $(uname) $(uname -r)"
echo "-----------------"

echo "Checking you have the required command line tools installed..."

test_installed() {
    if which "$1" >/dev/null 2>&1; then
        echo "$1: installed"
    else
        echo "$1: not installed"
    fi
}

test_installed bat
test_installed fzf
test_installed rg
test_installed sed

echo "-----------------"

echo "Checking versions of the installed command line tools..."
echo "bat version: $(bat --version)"
echo "fzf version: $(fzf --version)"
echo "rg version : $(rg --version)"
echo "-----------------"

echo "OK"