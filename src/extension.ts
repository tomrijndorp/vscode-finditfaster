// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { workspace } from 'vscode';

import * as cp from 'child_process';
import { cwd } from 'process';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-ripgrep" is now active!');

    let ls: string[];
    cp.exec('rg /usr/bin --files', (err, stdout, stderr) => {
        // console.log('stdout: ' + stdout);
        // console.log('stderr: ' + stderr);
        // if (err) {
        // 	console.log('error: ' + err);
        // }
        // const qp = vscode.window.createQuickPick();
        ls = stdout.split('\n');
        // qp.onDidHide(() => qp.dispose());
        // qp.show();
    });

    // const t = cp.exec('fzf', { cwd: '/Users/tomrijndorp' }, (err, stdout, stderr) => {
    //     if (err) {
    //         console.log('*******problem', err);
    //     }
    //     console.log('Completed:', stdout, stderr);
    // });

    // console.log('pid', t.pid);
    // const term = vscode.window.createTerminal('Naam',);
    // term.show();
    // term.sendText('vif');
    // cp.spawnSync('fzf', [], {stdio: 'inherit'});
    // vscode.window.ondidwrite
    // const writeEmitter = new vscode.EventEmitter<string>();
    // writeEmitter.
    // const pty: vscode.Pseudoterminal = {
    // 	onDidWrite: writeEmitter.event,
    // 	open: () => {},
    // 	close: () => {},
    // 	handleInput: data => writeEmitter.fire(data + 'q'),
    // };
    // const term = vscode.window.createTerminal({name: 'Yyoyo', pty});
    // term.show();
    // term.sendText('cd haha!\n');
    // wv.webview.postMessage()
    function showWv() {
        const wv = vscode.window.createWebviewPanel('bla', 'Titel', vscode.ViewColumn.Active, { enableScripts: true });
        wv.webview.html = wvContent;
        // wv.webview.postMessage({
        //     setContents: ls.join('<br/>'),
        // });
        // t.stdout?.on('data', data => { console.log('stdout new data!', data); wv.webview.postMessage({ setContents: data }); });
        wv.webview.onDidReceiveMessage(m => {
            console.log(m);
            const t = cp.exec(`bash -i -c "fd ${m} --max-results 20 -tf"`, { cwd: '/Users/tomrijndorp/Dropbox' }, (err, stdout, stderr) => {
            // const t = cp.exec(`bash -i -c "fzf"`, { cwd: '/Users/tomrijndorp/Dropbox' }, (err, stdout, stderr) => {
                if (err) {
                    console.log('*******problem', err);
                }
                console.log('Completed:', t.exitCode + '\n' + stdout, stderr);
                wv.webview.postMessage({ setContents: stdout });
            });
            // t.stdin?.write(m);
        });
    }

    let d2 = vscode.commands.registerCommand('vscode-ripgrep.shellThing', () => {
        // vscode.window.showInformationMessage('jaja');
        showWv();
    });

    vscode.commands.executeCommand('vscode-ripgrep.shellThing');

    // const ib = vscode.window.showInputBox({
    // 	title: 'Titel\nlijn 2\n\nlijn vier',
    // 	prompt: 'Zeg het eens?',
    // 	value: 'De waarde',
    // });
    // const ib = vscode.window.createInputBox();
    // ib.placeholder = 'Place hodler';
    // ib.show();
    // vscode.window.sho


    // 1. Trigger command
    // 3. Open some UI
    // 2. Start a process with fzf
    //    - Get FZF to read from e.g. a socket that we write data to interactively as we post stuff in here


    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    // let disposable = vscode.commands.registerCommand('vscode-ripgrep.helloWorld', () => {
    // 	// The code you place here will be executed every time your command is executed
    // 	// Display a message box to the user
    // 	vscode.window.showInformationMessage('Hello World from vscode-ripgrep.');
    // });

    // context.subscriptions.push(disposable);
    // context.subscriptions.push(d2);

}


const wvContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Wut?</title>
</head>
<body>
    <input type='text' id='query' style='width: 500px' placeholder='Type here...' onKeyUp='notify(this.value);' />
    <pre id="mine">0</pre>

    <script>
        const vscode = acquireVsCodeApi();

        function notify(e) {
            console.log(e);
            vscode.postMessage(e);
        }

        (function() {

	    // Handle the message inside the webview
	    window.addEventListener('message', event => {
    
		const message = event.data; // The JSON data our extension sent
		console.log('RX:', message);
		const el = document.getElementById('mine');
		// el.textContent = JSON.stringify(message);
		if (message.setContents !== undefined) {
			el.innerHTML = message.setContents;
            if (message.setContents === '') {
                console.log('zilch');
                el.innerHTML = '&lt;empty response&gt;';
            }
		}

        document.getElementById('query').focus();

	    });
        }())
    </script>
</body>
</html>`;

// this method is called when your extension is deactivated
export function deactivate() { }
