
https://code.visualstudio.com/api/working-with-extensions/publishing-extension

```shell

npm install @vscode/vsce

npm run compile

./node_modules/.bin/vsce package -o out/find-it-faster-custom.vsix
code --install-extension out/find-it-faster-custom.vsix

```