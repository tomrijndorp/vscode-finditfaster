#!/bin/bash
set -euo pipefail

clear
echo "Flight check:"
echo "bat version: $(bat --version)"
echo "fzf version: $(fzf --version)"
echo "rg  version: $(rg --version)"