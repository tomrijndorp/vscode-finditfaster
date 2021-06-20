import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import assert = require('assert');
// Let's keep it DRY and load the package here so we can reuse some data from it
let PACKAGE: any;

interface Command {
    script: string,
    uri: vscode.Uri | undefined,
}
interface Commands { [key: string]: Command }

enum Platform {
    mac,
    linux,
    windows,
}

//
// Define the commands we expose. URIs are poopulated upon extension activation
// because only then we'll know the actual paths.
//
const commands: Commands = {
    'findFiles': {
        script: 'find_files.sh',
        uri: undefined,
    },
    'findWithinFiles': {
        script: 'find_within_files.sh',
        uri: undefined,
    },
    'flightCheck': {
        script: 'flight_check.sh',
        uri: undefined,
    }
};

/**
 * TODO:
 * [ ] Screenshots using asciinema / svg animations
 * [x] Auto hide terminal when done
 * [x] Handle spaces in filenames
 * [x] Preferences / options
 * [ ] Linux support
 *     [ ] C-K is default chord in VS Code, so can't use it to navigate up/down in fzf
 *     [ ] bat: force-colorization doesn't work?
 *     [ ] need xdg-open instead of open
 *     [ ] `code` command is not always installed. Doesn't work with vscode:// uris.
 *         But there is a code.url-handler binary that does.
 *     [ ] border-left etc is not supported on default 20.04 install... noborder does work.
 * [ ] SSH session support?
 */

/**
 * Couple of observations:
 *
 * 1. On Mac OS, opening using open with a URI is _way_ faster than using the
 *    `code` command.
 * 2. Depending on the file extension, XCode (?!) will complain that no
 *    application is registered, _even though_ the URI starts with vscode://.
 *    Therefore, we'll pass in the application path using open -a.
 *    Unfortunately, we can't use the `code` command for this either, and we'll
 *    have to know where VS Code is installed.
 * 3. The same is kind of true for Linux, where we need to find code.url-handler.
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
    findFilesPreviewCommand: string,
    findFilesPreviewWindowConfig: string,
    findWithinFilesPreviewCommand: string,
    findWithinFilesPreviewWindowConfig: string,
    workspaceSettings: {
        folders: string[],
    },
    canaryFile: string,
    hideTerminalAfterSuccess: boolean,
    hideTerminalAfterFail: boolean,
    clearTerminalAfterUse: boolean,
    platform: Platform | undefined,
    debug: object,
    isFirstExecution: boolean,
    linuxVsCodeCommand: string,
    macOsVsCodePath: string,
    macOsVsCodeBundleIdentifier: string,
};
const CFG: Config = {
    extensionName: undefined,
    folders: [],
    vsCodePath: '',
    findFilesPreviewCommand: '',
    findFilesPreviewWindowConfig: '',
    findWithinFilesPreviewCommand: '',
    findWithinFilesPreviewWindowConfig: '',
    workspaceSettings: {
        folders: [],
    },
    canaryFile: '/tmp/canaryFile',
    hideTerminalAfterSuccess: false,
    hideTerminalAfterFail: false,
    clearTerminalAfterUse: false,
    platform: undefined,
    debug: {
    },
    isFirstExecution: true,
    linuxVsCodeCommand: '',
    macOsVsCodePath: '',
    macOsVsCodeBundleIdentifier: '',
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
    commands.flightCheck.uri = local('flight_check.sh');
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
    term?.dispose();
    // clean up canaryFile?
}

function updateConfigWithUserSettings() {
    CFG.findFilesPreviewCommand = getCFG('findFiles.previewCommand');
    CFG.findFilesPreviewWindowConfig = getCFG('findFiles.previewWindowConfig');
    CFG.findWithinFilesPreviewCommand = getCFG('findWithinFiles.previewCommand');
    CFG.findWithinFilesPreviewWindowConfig = getCFG('findWithinFiles.previewWindowConfig');
    CFG.hideTerminalAfterSuccess = getCFG('general.hideTerminalAfterSuccess');
    CFG.hideTerminalAfterFail = getCFG('general.hideTerminalAfterFail');
    CFG.clearTerminalAfterUse = getCFG('general.clearTerminalAfterUse');
    CFG.linuxVsCodeCommand = getCFG('linux.VS Code command');
    CFG.macOsVsCodeBundleIdentifier = getCFG('macOS.VS Code bundle identifier');
    CFG.macOsVsCodePath = getCFG('macOS.VS Code path');
}

function getWorkspaceFoldersAsString() {
    // For bash invocation
    return CFG.folders.reduce((x, y) => x + ` '${y}'`, '');
}

function handleWorkspaceFoldersChanges() {
    const updateFolders = () => {
        const dirs = vscode.workspace.workspaceFolders;
        if (dirs === undefined) {
            CFG.folders = ['.'];   // best we can do
        } else {
            CFG.folders = dirs.map(x => {
                const uri = decodeURI(x.uri.toString());
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

        // For good measure; we need to update the env vars in the terminal
        reinitialize();
    });
}

function doFlightCheck() {
    const parseKeyValue = (line: string) => {
        return line.split(': ', 2);
    };

    try {
        let errStr = '';
        const kvs: any = {};
        const out = cp.execFileSync(getCommandString(commands.flightCheck, false), { shell: true }).toString('utf-8');
        out.split('\n').map(x => {
            const maybeKV = parseKeyValue(x);
            if (maybeKV.length === 2) {
                kvs[maybeKV[0]] = maybeKV[1];
            }
        });
        console.log(kvs);
        if (kvs['which bat'] === undefined || kvs['which bat'] === '') {
            errStr += 'bat not found on your PATH\n. ';
        }
        if (kvs['which fzf'] === undefined || kvs['which fzf'] === '') {
            errStr += 'fzf not found on your PATH\n. ';
        }
        if (kvs['which rg'] === undefined || kvs['which rg'] === '') {
            errStr += 'rg not found on your PATH\n. ';
        }
        if (errStr !== '') {
            vscode.window.showErrorMessage(`Failed to activate plugin: ${errStr}\nMake sure you have the required command line tools installed as outlined in the README.`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to run checks before starting extension. Maybe this is helpful: ${error}`);
    }
}


function reinitialize() {

    term?.dispose();
    updateConfigWithUserSettings();
    console.log('plugin config:', CFG);
    if (CFG.isFirstExecution) {
        doFlightCheck();
        CFG.isFirstExecution = false;
    }
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
            /* eslint-disable @typescript-eslint/naming-convention */
            FIND_FILES_PREVIEW_COMMAND: CFG.findFilesPreviewCommand,
            FIND_FILES_PREVIEW_WINDOW_CONFIG: CFG.findFilesPreviewWindowConfig,
            FIND_WITHIN_FILES_PREVIEW_COMMAND: CFG.findWithinFilesPreviewCommand,
            FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG: CFG.findWithinFilesPreviewWindowConfig,
            LINUX_VSCODE_REF: CFG.linuxVsCodeCommand,
            OSX_VSCODE_REF: CFG.macOsVsCodePath !== '' ? CFG.macOsVsCodePath
                                                       : CFG.macOsVsCodeBundleIdentifier,
            VSCODE_PATH: CFG.vsCodePath,
            CANARY_FILE: CFG.canaryFile,
            /* eslint-enable @typescript-eslint/naming-convention */
        },
    });
}

function getCommandString(cmd: Command, withArgs: boolean = true) {
    assert(cmd.uri);
    const str = cmd.uri.fsPath;
    if (withArgs) {
        const dirs = getWorkspaceFoldersAsString();
        return `${str} ${dirs}`;
    } else {
        return str;
    }
}

function executeTerminalCommand(cmd: string) {
    if (!term || term.exitStatus !== undefined) {
        createTerminal();
    }

    assert(cmd in commands);
    term.sendText(getCommandString(commands[cmd]));
    term.show();
}
