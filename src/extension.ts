import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import assert = require('assert');
// Let's keep it DRY and load the package here
let PACKAGE: any;

interface Command {
    script: string,
    uri: vscode.Uri | undefined,
};
interface Commands { [key: string]: Command };

const commands: Commands = {
    'findFiles': {
        script: 'find_files.sh',
        uri: undefined,
    },
    'findWithinFiles': {
        script: 'find_within_files.sh',
        uri: undefined,
    },
};

function getCommandString(cmd: Command) {
    assert(cmd.uri);
    const str = cmd.uri.fsPath;
    const dirs = getWorkspaceFoldersAsString();
    return str + ' ' + dirs;
}

/**
 * TODO:
 * [ ] Screenshots using asciinema / svg animations
 * [x] Auto hide terminal when done
 * [x] Handle spaces in filenames
 * [x] Preferences / options
 * [ ] Make sure people can still run this if they don't have fd / rg / bat. Or maybe say screw it initially
 *     and see if anybody actually requests it. They'll probably just not request it / install it / not use
 *     this thing instead, which is fine.
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



interface Config {
    extensionName: string | undefined,
    folders: string[],
    vsCodePath: string,
    showPreview: boolean,
    previewCommand: string,
    workspaceSettings: {
        folders: string[],
    },
    canaryFile: string,
    hideTerminalAfterSuccess: boolean,
    hideTerminalAfterFail: boolean,
    clearTerminalAfterUse: boolean,
    maximizeTerminal: boolean,
    debug: object,
};
const CFG: Config = {
    extensionName: undefined,
    folders: [],
    vsCodePath: '',
    showPreview: true,
    previewCommand: '',
    workspaceSettings: {
        folders: [],
    },
    canaryFile: '/tmp/canaryFile',
    hideTerminalAfterSuccess: false,
    hideTerminalAfterFail: false,
    clearTerminalAfterUse: false,
    maximizeTerminal: false,
    debug: {
    },
};

function checkExposedFunctions() {
    for (const x of PACKAGE.contributes.commands) {
        const fName = x.command.substr(PACKAGE.name.length + '.'.length);
        assert(fName in commands);
    }
}

function setupConfig(context: vscode.ExtensionContext) {
    CFG.extensionName = PACKAGE.name;
    assert(CFG.extensionName);
    const local = (x: string) => vscode.Uri.file(path.join(context.extensionPath, x));
    commands.findFiles.uri = local('find_files.sh');
    commands.findWithinFiles.uri = local('find_within_files.sh');
}

function registerCommands() {
    Object.entries(commands).map(([k, v]) => {
        vscode.commands.registerCommand(`${CFG.extensionName}.${k}`, () => {
            executeTerminalCommand(k);
        });
    });
}

// Reference to the terminal we use
let term: vscode.Terminal;

export function activate(context: vscode.ExtensionContext) {
    // Because we can't determine what was going on in the terminal panel before,
    // let's just make it a setting for now.
    // CFG.terminalWasVisibleBeforeCommand = false;  // so now we'll always close it
    const local = (x: string) => vscode.Uri.file(path.join(context.extensionPath, x));

    PACKAGE = JSON.parse(fs.readFileSync(local('package.json').fsPath, 'utf-8'));
    setupConfig(context);
    checkExposedFunctions();

    handleWorkspaceFoldersChanges();
    handleWorkspaceSettingsChanges();

    registerCommands();
    reinitialize();
}

// this method is called when your extension is deactivated
export function deactivate() {
    term.sendText('disposing this terminal...');
    term.dispose();
}

function updateConfigWithUserSettings() {
    CFG.vsCodePath = getCFG('general.VS Code Path');
    CFG.showPreview = getCFG('general.showPreview');
    CFG.previewCommand = getCFG('general.previewCommand');
    CFG.hideTerminalAfterSuccess = getCFG('general.hideTerminalAfterSuccess');
    CFG.hideTerminalAfterFail = getCFG('general.hideTerminalAfterFail');
    CFG.clearTerminalAfterUse = getCFG('general.clearTerminalAfterUse');

    assert(CFG.previewCommand !== '');
}

function getWorkspaceFoldersAsString() {
    // For bash invocation
    return CFG.folders.reduce((x, y) => x + ` ${y}`);
}

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
    console.log('plugin config:', CFG);
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
                    if (CFG.clearTerminalAfterUse) {
                        term.sendText('clear');
                    }

                    if (CFG.hideTerminalAfterSuccess && CFG.hideTerminalAfterFail) {
                        term.hide();
                    } else {
                        // we need to read the file to determine what to do
                        fs.readFile(CFG.canaryFile, { encoding: 'utf-8' }, (err, data) => {
                            if (err) {
                                // We shouldn't really end up here. Maybe leave the terminal around in this case...
                            } else {
                                const commandWasSuccess = data.length > 0 && data[0] === '0';
                                if (commandWasSuccess && CFG.hideTerminalAfterSuccess) {
                                    term.hide();
                                } else if (!commandWasSuccess && CFG.hideTerminalAfterFail) {
                                    term.hide();
                                } else {
                                    // Don't hide the terminal and make clippy angry
                                }
                            }
                        });
                    }
                }
            });
        }
    });

}

function createTerminal() {
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

function executeTerminalCommand(cmd: string) {
    if (!term || term.exitStatus !== undefined) {
        createTerminal();
    }

    assert(cmd in commands);
    term.sendText(getCommandString(commands[cmd]));
    term.show();
}
