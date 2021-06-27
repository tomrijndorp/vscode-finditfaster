#!/bin/bash
set -euxo pipefail

BAT_VER=v0.18.1
BAT_MAC=bat-${BAT_VER}-x86_64-apple-darwin
FZF_VER=0.27.2
FZF_MAC=fzf-${FZF_VER}-darwin_amd64
RG_VER=13.0.0
RG_MAC=ripgrep-${RG_VER}-x86_64-apple-darwin
BIN=/usr/local/bin

if [[ $(uname) == Darwin ]]; then
    cd /tmp
    curl -sL "https://github.com/sharkdp/bat/releases/download/$BAT_VER/$BAT_MAC.tar.gz" > bat.tar.gz
    curl -sL "https://github.com/junegunn/fzf/releases/download/$FZF_VER/$FZF_MAC.zip" > fzf.zip
    curl -sL "https://github.com/BurntSushi/ripgrep/releases/download/$RG_VER/$RG_MAC.tar.gz" > rg.tar.gz
    tar -xf bat.tar.gz
    tar -xf rg.tar.gz
    unzip fzf.zip -d $FZF_MAC
    sudo cp $BAT_MAC/bat $BIN
    sudo cp $FZF_MAC/fzf $BIN
    sudo cp $RG_MAC/rg $BIN
    cd -

else  # Linux
    sudo apt-get update
    sudo apt-get install -y fzf
    # The funky install: See https://askubuntu.com/a/491086/582233
    sudo apt-get install -y -o Dpkg::Options::="--force-overwrite" bat ripgrep
fi

echo "Running flight check..."
./flight_check.sh