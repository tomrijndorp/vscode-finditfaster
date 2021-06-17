import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import assert = require('assert');

/**
 * TODO:
 * [x] Auto hide terminal when done
 * [x] Handle spaces in filenames
 * [x] Preferences / options
 * [ ] Linux support
 * [ ] SSH session support?
 * [ ] Windows support
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
function getCFG<T>(key: string, def?: T) {
    const userCfg = vscode.workspace.getConfiguration();
    const ret = userCfg.get<T>(`${CFG.extensionName}.${key}`);
    assert(ret !== undefined);
    return ret;
}

const CFG: {
    extensionName: string,
    folders: string[],
    vsCodePath: string,
    showPreview: boolean,
    previewCommand: string,
    workspaceSettings: {
        folders: string[],
    },
    canaryFile: string,
    hideTerminalAfterUse: boolean,
    alsoHideTerminalAfterCancel: boolean,
    maximizeTerminal: boolean,
    debug: object,
    scriptUri: vscode.Uri | undefined,
    findWithinUri: vscode.Uri | undefined,
} = {
    extensionName: 'find-it-faster',
    folders: [],
    vsCodePath: '',
    showPreview: true,
    previewCommand: '',
    workspaceSettings: {
        folders: [],
    },
    canaryFile: '/tmp/canaryFile',
    hideTerminalAfterUse: false,
    alsoHideTerminalAfterCancel: false,
    maximizeTerminal: false,
    debug: {
        // Because debugging / iterating is such a pain, I'll only occasionally paste the script source in here.
        useExternalScript: true,
    },
};

// Reference to the terminal we use
let term: vscode.Terminal;

export function activate(context: vscode.ExtensionContext) {
    // Because we can't determine what was going on in the terminal panel before,
    // let's just make it a setting for now.
    // CFG.terminalWasVisibleBeforeCommand = false;  // so now we'll always close it
    CFG.scriptUri = vscode.Uri.file(
        path.join(context.extensionPath, 'find_it_faster.sh'));
    CFG.findWithinUri = vscode.Uri.file(
        path.join(context.extensionPath, 'find_it_faster_within.sh'));
    handleWorkspaceFoldersChanges();
    handleWorkspaceSettingsChanges();
    reinitialize();
    vscode.commands.registerCommand(`${CFG.extensionName}.invoke`, () => {
        showNext();
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function updateConfigWithUserSettings() {
    CFG.vsCodePath = getCFG('general.VS Code Path');
    CFG.showPreview = getCFG('general.showPreview');
    CFG.previewCommand = getCFG('general.previewCommand');
    CFG.hideTerminalAfterUse = getCFG('general.hideTerminalAfterUse');
    CFG.maximizeTerminal = getCFG('general.maximizeTerminal');
    CFG.alsoHideTerminalAfterCancel = getCFG('general.alsoHideTerminalAfterCancel');

    assert(CFG.previewCommand !== '');
}

function getWorkspaceFoldersAsString() {
    // For bash invocation
    // return CFG.folders.reduce((x, y) => x + `'${y}' `, '');
    return CFG.folders.reduce((x, y) => x + ` ${y}`);
}

function getFindWithinCommand() {
    assert(CFG.findWithinUri !== undefined);
    const theScript = CFG.findWithinUri.fsPath;
    const wsFoldersStr = getWorkspaceFoldersAsString();
    const cmd = `${theScript} ${wsFoldersStr}`;
    console.log(cmd);
    return cmd;
}

const getCommand = () => {
    assert(CFG.scriptUri !== undefined);
    const theScript = CFG.scriptUri.fsPath;
    const wsFoldersStr = getWorkspaceFoldersAsString();
    const cmd = `${theScript} ${wsFoldersStr}`;
    console.log(cmd);
    return cmd;
};

function handleWorkspaceFoldersChanges() {
    const updateFolders = () => {
        const dirs = vscode.workspace.workspaceFolders;
        if (dirs === undefined) {
            CFG.folders = ['.'];   // best we can do
        } else {
            CFG.folders = dirs.map(x => {
                const uri = x.uri.toString();
                if (uri.substr(0, 7) === 'file://') {
                    return uri.substr(7);
                } else {
                    vscode.window.showErrorMessage('Non-file:// uri\'s not currently supported...');
                    return '';
                }
            });
            console.log('workspace folders:', CFG.folders);
        }
    };

    updateFolders();

    // Also re-update when anything changes
    vscode.workspace.onDidChangeWorkspaceFolders(event => {
        console.log('workspace folders changed: ', event);
        updateFolders();
    });
}

function handleWorkspaceSettingsChanges() {
    vscode.workspace.onDidChangeConfiguration(e => {
        updateConfigWithUserSettings();
    });
}


function reinitialize() {

    updateConfigWithUserSettings();
    console.log('plugin config:' ,CFG);
    //
    // Set up a file watcher. Any time there is output to our "canary file", we hide the terminal (because the command was completed)
    //
    let watcher: fs.FSWatcher;
    const cmd = CFG.canaryFile ? 'true' : 'mktemp';
    cp.exec(cmd, (err, stdout, stderr) => {
        if (err) {
            vscode.window.showErrorMessage(`Failed to initialize plugin (failed to create file watcher: "${stdout}${stderr}")`);
        } else {
            if (!CFG.canaryFile) {
                CFG.canaryFile = stdout.trim();
            }
            console.log('canary file:', CFG.canaryFile);
            watcher = fs.watch(CFG.canaryFile, (eventType, fileName) => {
                if (eventType === 'change') {
                    if (CFG.hideTerminalAfterUse) {
                        if (CFG.alsoHideTerminalAfterCancel) {
                            // always hide
                            term.hide();
                        } else {  // don't hide after cancel
                            // we need to read the file to determine what to do
                            fs.readFile(CFG.canaryFile, {encoding: 'utf-8'}, (err, data) => {
                                if (err) {
                                    // do nothing
                                } else {
                                    console.log('file contents: ', data);
                                    if (data.length > 0 && data[0] === '0') {
                                        term.hide();
                                    }
                                }
                            });
                        }
                    }
                }
            });

            //
            // Prepare the terminal for first use. We already enter the command so the user doesn't have to wait.
            //
            prepareTerminal();

        }
    });

}

function prepareTerminal() {
    // TODO lazy instantiation in case terminal is closed (first use / user closed terminal)
    term = vscode.window.createTerminal({
        name: '⚡ F️indItFaster',
        hideFromUser: true,
        env: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            PREVIEW_COMMAND: CFG.previewCommand,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            VSCODE_PATH: CFG.vsCodePath,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            CANARY_FILE: CFG.canaryFile,
        }
    });
}

function showNext() {
    if (!term || term.exitStatus !== undefined) {
        prepareTerminal();
    }
    const cmd = getCommand();
    // const cmd = getFindWithinCommand();
    term.sendText(cmd);
    // We can't, with vscode's API, I think, determine whether the terminal panel was open or
    // not, or what it was showing before we took over. This is unfortunate, not sure how to
    // fix it.
    if (CFG.maximizeTerminal) {
        vscode.commands.executeCommand('workbench.action.toggleMaximizedPanel');
    }
    term.show();
}
