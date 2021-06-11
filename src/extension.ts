// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { workspace } from 'vscode';

import * as cp from 'child_process';
import { cwd } from 'process';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let term: vscode.Terminal;
// const command = 'fzf --preview "bat --force-colorization --plain {}" | xargs -I{} open "vscode://file/$(pwd)/{}"; clear';

/**
 * TODO:
 * [ ] Auto hide terminal when done
 * [ ] Handle spaces in filenames
 * [ ] Linux support
 * [ ] Windows support
 * [ ] Preferences / options
 */

/**
 * Couple of observations:
 * 
 * 1. On Mac OS, opening using open with a URI is _way_ faster than using the `code` command.
 * 2. Depending on the file extension, XCode (?!) will complain that no application is registered,
 *    _even though_ the URI starts with vscode://.
 *    Therefore, we'll pass in the application path. Unfortunately, we can't use the `code` command
 *    for this either, and we'll have to know where VS Code is installed.
 */

const vsCodePath = '/Applications/Visual Studio Code.app';

const command = `fzf --multi --print0 --preview "bat --force-colorization --plain {}" | xargs -0 -I{} open -a "${vsCodePath}" "vscode://file/$(pwd)/{}"`;


export function activate(context: vscode.ExtensionContext) {

    prepareTerminal();
    let d2 = vscode.commands.registerCommand('vscode-ripgrep.shellThing', () => {
        // vscode.window.showInformationMessage('jaja');
        // showWv();
        showNext();
    });
}

// this method is called when your extension is deactivated
export function deactivate() { }

function prepareTerminal() {
    // TODO lazy instantiation in case terminal is closed (first use / user closed terminal)
    vscode.window.showInformationMessage('prep');
    term = vscode.window.createTerminal({
        name: 'RIPPIT!',
        cwd: '/Users/tomrijndorp/Dropbox',
        hideFromUser: true,
        env: { },
    });
}

function showNext() {
    if (term.exitStatus !== undefined) {
        prepareTerminal();
    }
    term.sendText(command);
    term.show();
    vscode.commands.executeCommand('workbench.action.toggleMaximizedPanel');
}





// function stuff() {
//     // Use the console to output diagnostic information (console.log) and errors (console.error)
//     // This line of code will only be executed once when your extension is activated
//     console.log('Congratulations, your extension "vscode-ripgrep" is now active!');

//     // console.log('pid', t.pid);


// }
