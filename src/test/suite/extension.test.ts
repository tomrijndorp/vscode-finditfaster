import * as assert from 'assert';
import * as mocha from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as os from 'os';
// import * as extension from '../../extension';
/*
Testing notes:
- There's a difference between running from inside VS Code vs running npm run tests.
  - VS Code: debug instance's workspace is undefined
  - npm run tests (on mac): workspace has two folders:
    1. / (yes, root)
    2. the repo root
  - VS Code: process.cwd() is /
  - npm run tests: process.cwd() is repo root.
*/

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });

    test('Activate', async () => {
        console.log('ws folders: ', vscode.workspace.workspaceFolders);
        console.log('dirname: ', __dirname);
        console.log('cwd: ', process.cwd());

        doTheThings();

        await(sleep(2000));
    });
});

async function doTheThings() {
        const extension = vscode.extensions.getExtension('TomRijndorp.find-it-faster');
        assert(extension);
        const path = extension.extensionPath;
        assert(path);
        // assert (vscode.workspace.workspaceFolders === undefined);
    // vscode.workspace.getconfiguration().update('find-it-faster.general.defaultsearchlocation', __dirname, vscode.configurationtarget.global)
    // .then(() => {
        vscode.commands.executeCommand('find-it-faster.listSearchLocations');
    // })
    // .then(() => {
        // return vscode.window.activeTerminal?.sendText("flight_check.sh\n");
    // })
    // .then(() => {
        // assert.ok(vscode.window.activeTextEditor?.document.fileName.indexOf('flight_check.sh') !== undefined);
        // console.log(vscode.window.activeTextEditor.document.fileName.indexOf('flight_check.sh'));
    // });
}