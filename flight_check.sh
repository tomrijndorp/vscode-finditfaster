#!/bin/bash
set -euo pipefail

echo "Pre-Flight check:"
echo "-----------------"

echo "Checking your OS version..."
echo "OS: $(uname) $(uname -r)"
echo "-----------------"

echo "Checking you have the required command line tools installed..."

if which bat >/dev/null 2>&1 || which batcat >/dev/null 2>&1; then
    echo "bat: installed"
else
    echo "bat: not installed"
fi

if which fzf >/dev/null 2>&1; then
    echo "fzf: installed"
else
    echo "fzf: not installed"
fi

if which rg >/dev/null 2>&1; then
    echo "rg: installed"
else
    echo "rg: not installed"
fi

if which sed >/dev/null 2>&1; then
    echo "sed: installed"
else
    echo "sed: not installed"
fi

echo "-----------------"

echo "Checking versions of the installed command line tools..."
echo "bat version: $(bat --version)"
echo "fzf version: $(fzf --version)"
echo "rg version: $(rg --version)"
echo "-----------------"

echo "OK"