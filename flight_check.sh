#!/bin/bash
set -euo pipefail

echo "Pre-Flight check:"
echo "-----------------"

echo "Checking your OS version..."
echo "OS: $(uname) $(uname -r)"
echo "-----------------"

echo "Checking you have the required command line tools installed..."
echo "which bat: $(which bat)"
echo "which fzf: $(which fzf)"
echo "which rg: $(which rg)"
echo "-----------------"

echo "Checking versions of the installed command line tools..."
echo "bat version: $(bat --version)"
echo "fzf version: $(fzf --version)"
echo "rg version: $(rg --version)"
echo "-----------------"

echo "OK"