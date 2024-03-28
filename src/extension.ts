/**
 * TODO:
 * [ ] Show relative paths whenever possible
 *     - This might be tricky. I could figure out the common base path of all dirs we search, I guess?
 *
 * Feature options:
 * [ ] Buffer of open files / show currently open files / always show at bottom => workspace.textDocuments is a bit curious / borked
 */

import { tmpdir } from 'os';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as assert from 'assert';

// Let's keep it DRY and load the package here so we can reuse some data from it
let PACKAGE: any;
// Reference to the terminal we use
let term: vscode.Terminal;
let previousActiveTerminal: vscode.Terminal | null;
let isExtensionChangedTerminal = false;

//
// Define the commands we expose. URIs are populated upon extension activation
// because only then we'll know the actual paths.
//
interface Command {
    script: string,
    uri: vscode.Uri | undefined,
    preRunCallback: undefined | (() => boolean | Promise<boolean>),
    postRunCallback: undefined | (() => void),
}
const commands: { [key: string]: Command } = {
    findFiles: {
        script: 'find_files',  // we append a platform-specific extension later
        uri: undefined,
        preRunCallback: undefined,
        postRunCallback: undefined,
    },
    findFilesWithType: {
        script: 'find_files',
        uri: undefined,
        preRunCallback: selectTypeFilter,
        postRunCallback: () => { CFG.useTypeFilter = false; },
    },
    findWithinFiles: {
        script: 'find_within_files',
        uri: undefined,
        preRunCallback: undefined,
        postRunCallback: undefined,
    },
    findWithinFilesWithType: {
        script: 'find_within_files',
        uri: undefined,
        preRunCallback: selectTypeFilter,
        postRunCallback: () => { CFG.useTypeFilter = false; },
    },
    findWithinSingleFile: {
        // script: 'find_within_single_file',
        script: 'find_within_single_file_simple',
        uri: undefined,
        preRunCallback: undefined,
        postRunCallback: undefined,
    },
    listSearchLocations: {
        script: 'list_search_locations',
        uri: undefined,
        preRunCallback: writePathOriginsFile,
        postRunCallback: undefined,
    },
    flightCheck: {
        script: 'flight_check',
        uri: undefined,
        preRunCallback: undefined,
        postRunCallback: undefined,
    },
    resumeSearch: {
        script: 'resume_search', // Dummy. We will set the uri from the last-run script. But we will use this value to check whether we are resuming.
        uri: undefined,
        preRunCallback: undefined,
        postRunCallback: undefined,
    },
};

type WhenCondition = 'always' | 'never' | 'noWorkspaceOnly';
enum PathOrigin {
    cwd = 1 << 0,
    workspace = 1 << 1,
    settings = 1 << 2,
}

function getTypeOptions() {
    const result = cp.execSync('rg --type-list').toString();
    return result.split('\n').map(line => {
        const [typeStr, typeInfo] = line.split(':');
        return new FileTypeOption(typeStr, typeInfo, CFG.findWithinFilesFilter.has(typeStr));
    }).filter(x => x.label.trim().length !== 0);
}

class FileTypeOption implements vscode.QuickPickItem {
    label: string;
    description: string;
    picked: boolean;

    constructor(typeStr: string, types: string, picked: boolean = false) {
        this.label = typeStr;
        this.description = types;
        this.picked = picked;
    }
}

async function selectTypeFilter() {
    const opts = getTypeOptions();
    return await new Promise<boolean>((resolve, _) => {
        const qp = vscode.window.createQuickPick();
        let hasResolved = false;  // I don't understand why this is necessary... Seems like I can resolve twice?

        qp.items = opts;
        qp.title = `Type one or more type identifiers below and press Enter,
        OR select the types you want below. Example: typing "py cpp<Enter>"
        (without ticking any boxes will search within python and C++ files.
        Typing nothing and selecting those corresponding entries will do the
        same. Typing "X" (capital x) clears all selections.`;
        qp.placeholder = 'enter one or more types...';
        qp.canSelectMany = true;
        // https://github.com/microsoft/vscode/issues/103084
        // https://github.com/microsoft/vscode/issues/119834
        qp.selectedItems = qp.items.filter(x => CFG.findWithinFilesFilter.has(x.label));
        qp.value = [...CFG.findWithinFilesFilter.keys()].reduce((x, y) => x + ' ' + y, '');
        qp.matchOnDescription = true;
        qp.show();
        qp.onDidChangeValue(() => {
            if (qp.value.length > 0 && qp.value[qp.value.length - 1] === 'X') {
                // This is where we're fighting with VS Code a little bit.
                // When you don't reassign the items, the "X" will still be filtering the results,
                // which we obviously don't want. Currently (6/2021), this works as expected.
                qp.value = '';
                qp.selectedItems = [];
                qp.items = qp.items;  // keep this
            }
        });
        qp.onDidAccept(() => {
            CFG.useTypeFilter = true;
            console.log(qp.activeItems);
            CFG.findWithinFilesFilter.clear();  // reset
            if (qp.selectedItems.length === 0) {
                // If there are no active items, use the string that was entered.
                // split on empty string yields an array with empty string, catch that
                const types = qp.value === '' ? [] : qp.value.trim().split(/\s+/);
                types.forEach(x => CFG.findWithinFilesFilter.add(x));
            } else {
                // If there are active items, use those.
                qp.selectedItems.forEach(x => CFG.findWithinFilesFilter.add(x.label));
            }
            hasResolved = true;
            resolve(true);
            qp.dispose();
        });
        qp.onDidHide(() => {
            qp.dispose();
            if (!hasResolved) {
                resolve(false);
            }
        });
    });
}

/** Global variable cesspool erm, I mean, Configuration Data Structure! It does the job for now. */
interface Config {
    extensionName: string | undefined,
    searchPaths: string[],
    searchPathsOrigins: { [key: string]: PathOrigin },
    disableStartupChecks: boolean,
    useEditorSelectionAsQuery: boolean,
    useGitIgnoreExcludes: boolean,
    useWorkspaceSearchExcludes: boolean,
    findFilesPreviewEnabled: boolean,
    findFilesPreviewCommand: string,
    findFilesPreviewWindowConfig: string,
    findWithinFilesPreviewEnabled: boolean,
    findWithinFilesPreviewCommand: string,
    findWithinFilesPreviewWindowConfig: string,
    findWithinFilesFilter: Set<string>,
    workspaceSettings: {
        folders: string[],
    },
    canaryFile: string,
    selectionFile: string,
    lastQueryFile: string,
    lastPosFile: string,
    shellDebugFile: string,
    hideTerminalAfterSuccess: boolean,
    hideTerminalAfterFail: boolean,
    clearTerminalAfterUse: boolean,
    showMaximizedTerminal: boolean,
    flightCheckPassed: boolean,
    additionalSearchLocations: string[],
    additionalSearchLocationsWhen: WhenCondition,
    searchCurrentWorkingDirectory: WhenCondition,
    searchWorkspaceFolders: boolean,
    extensionPath: string,
    tempDir: string,
    useTypeFilter: boolean,
    lastCommand: string,
    batTheme: string,
    openFileInPreviewEditor: boolean,
    killTerminalAfterUse: boolean,
    fuzzRipgrepQuery: boolean,
    restoreFocusTerminal: boolean,
};
const CFG: Config = {
    extensionName: undefined,
    searchPaths: [],
    searchPathsOrigins: {},
    disableStartupChecks: false,
    useEditorSelectionAsQuery: true,
    useGitIgnoreExcludes: true,
    useWorkspaceSearchExcludes: true,
    findFilesPreviewEnabled: true,
    findFilesPreviewCommand: '',
    findFilesPreviewWindowConfig: '',
    findWithinFilesPreviewEnabled: true,
    findWithinFilesPreviewCommand: '',
    findWithinFilesPreviewWindowConfig: '',
    findWithinFilesFilter: new Set(),
    workspaceSettings: {
        folders: [],
    },
    canaryFile: '',
    selectionFile: '',
    lastQueryFile: '',
    lastPosFile: '',
    // DEBUG: This will set a file that contains the output of the shell script >>'s
    shellDebugFile: '',
    hideTerminalAfterSuccess: false,
    hideTerminalAfterFail: false,
    clearTerminalAfterUse: false,
    showMaximizedTerminal: false,
    flightCheckPassed: false,
    additionalSearchLocations: [],
    additionalSearchLocationsWhen: 'never',
    searchCurrentWorkingDirectory: 'never',
    searchWorkspaceFolders: true,
    extensionPath: '',
    tempDir: '',
    useTypeFilter: false,
    lastCommand: '',
    batTheme: '',
    openFileInPreviewEditor: false,
    killTerminalAfterUse: false,
    fuzzRipgrepQuery: false,
    restoreFocusTerminal: false,
};

/** Ensure that whatever command we expose in package.json actually exists */
function checkExposedFunctions() {
    for (const x of PACKAGE.contributes.commands) {
        const fName = x.command.substring(PACKAGE.name.length + '.'.length);
        assert(fName in commands);
    }
}

/** We need the extension context to get paths to our scripts. We do that here. */
function setupConfig(context: vscode.ExtensionContext) {
    CFG.extensionName = PACKAGE.name;
    assert(CFG.extensionName);
    const localScript = (x: string) => vscode.Uri.file(path.join(context.extensionPath, x) + (os.platform() === 'win32' ? '.ps1' : '.sh'));
    commands.findFiles.uri = localScript(commands.findFiles.script);
    commands.findFilesWithType.uri = localScript(commands.findFiles.script);
    commands.findWithinFiles.uri = localScript(commands.findWithinFiles.script);
    commands.findWithinFilesWithType.uri = localScript(commands.findWithinFiles.script);
    commands.listSearchLocations.uri = localScript(commands.listSearchLocations.script);
    commands.flightCheck.uri = localScript(commands.flightCheck.script);
    commands.findWithinSingleFile.uri = localScript(commands.findWithinSingleFile.script);
}

/** Register the commands we defined with VS Code so users have access to them */
function registerCommands() {
    Object.keys(commands).map((k) => {
        vscode.commands.registerCommand(`${CFG.extensionName}.${k}`, () => {
            executeTerminalCommand(k);
        });
    });
}

/** Entry point called by VS Code */
export function activate(context: vscode.ExtensionContext) {
    CFG.extensionPath = context.extensionPath;
    const local = (x: string) => vscode.Uri.file(path.join(CFG.extensionPath, x));

    // Load our package.json
    PACKAGE = JSON.parse(fs.readFileSync(local('package.json').fsPath, 'utf-8'));
    setupConfig(context);
    checkExposedFunctions();

    handleWorkspaceSettingsChanges();
    handleWorkspaceFoldersChanges();

    registerCommands();
    reinitialize();
}

/* Called when extension is deactivated by VS Code */
export function deactivate() {
    term?.dispose();
    fs.rmSync(CFG.canaryFile, { force: true });
    fs.rmSync(CFG.selectionFile, { force: true });
    if (fs.existsSync(CFG.lastQueryFile)) {
        fs.rmSync(CFG.lastQueryFile, { force: true });
    }
    if (fs.existsSync(CFG.lastPosFile)) {
        fs.rmSync(CFG.lastPosFile, { force: true });
    }
}

/** Map settings from the user-configurable settings to our internal data structure */
function updateConfigWithUserSettings() {
    function getCFG<T>(key: string) {
        const userCfg = vscode.workspace.getConfiguration();
        const ret = userCfg.get<T>(`${CFG.extensionName}.${key}`);
        assert(ret !== undefined);
        return ret;
    }

    CFG.disableStartupChecks = getCFG('advanced.disableStartupChecks');
    CFG.useEditorSelectionAsQuery = getCFG('advanced.useEditorSelectionAsQuery');
    CFG.useWorkspaceSearchExcludes = getCFG('general.useWorkspaceSearchExcludes');
    CFG.useGitIgnoreExcludes = getCFG('general.useGitIgnoreExcludes');
    CFG.additionalSearchLocations = getCFG('general.additionalSearchLocations');
    CFG.additionalSearchLocationsWhen = getCFG('general.additionalSearchLocationsWhen');
    CFG.searchCurrentWorkingDirectory = getCFG('general.searchCurrentWorkingDirectory');
    CFG.searchWorkspaceFolders = getCFG('general.searchWorkspaceFolders');
    CFG.hideTerminalAfterSuccess = getCFG('general.hideTerminalAfterSuccess');
    CFG.hideTerminalAfterFail = getCFG('general.hideTerminalAfterFail');
    CFG.clearTerminalAfterUse = getCFG('general.clearTerminalAfterUse');
    CFG.killTerminalAfterUse = getCFG('general.killTerminalAfterUse');
    CFG.showMaximizedTerminal = getCFG('general.showMaximizedTerminal');
    CFG.batTheme = getCFG('general.batTheme');
    CFG.openFileInPreviewEditor = getCFG('general.openFileInPreviewEditor'),
    CFG.findFilesPreviewEnabled = getCFG('findFiles.showPreview');
    CFG.findFilesPreviewCommand = getCFG('findFiles.previewCommand');
    CFG.findFilesPreviewWindowConfig = getCFG('findFiles.previewWindowConfig');
    CFG.findWithinFilesPreviewEnabled = getCFG('findWithinFiles.showPreview');
    CFG.findWithinFilesPreviewCommand = getCFG('findWithinFiles.previewCommand');
    CFG.findWithinFilesPreviewWindowConfig = getCFG('findWithinFiles.previewWindowConfig');
    CFG.fuzzRipgrepQuery = getCFG('findWithinFiles.fuzzRipgrepQuery');
    CFG.restoreFocusTerminal = getCFG('general.restoreFocusTerminal');
}

function collectSearchLocations() {
    const locations: string[] = [];
    // searchPathsOrigins is for diagnostics only
    CFG.searchPathsOrigins = {};
    const setOrUpdateOrigin = (path: string, origin: PathOrigin) => {
        if (CFG.searchPathsOrigins[path] === undefined) {
            CFG.searchPathsOrigins[path] = origin;
        } else {
            CFG.searchPathsOrigins[path] |= origin;
        }
    };
    // cwd
    const addCwd = () => {
        const cwd = process.cwd();
        locations.push(cwd);
        setOrUpdateOrigin(cwd, PathOrigin.cwd);
    };
    switch (CFG.searchCurrentWorkingDirectory) {
        case 'always':
            addCwd();
            break;
        case 'never':
            break;
        case 'noWorkspaceOnly':
            if (vscode.workspace.workspaceFolders === undefined) {
                addCwd();
            }
            break;
        default:
            assert(false, 'Unhandled case');
    }

    // additional search locations from extension settings
    const addSearchLocationsFromSettings = () => {
        locations.push(...CFG.additionalSearchLocations);
        CFG.additionalSearchLocations.forEach(x => setOrUpdateOrigin(x, PathOrigin.settings));
    };
    switch (CFG.additionalSearchLocationsWhen) {
        case 'always':
            addSearchLocationsFromSettings();
            break;
        case 'never':
            break;
        case 'noWorkspaceOnly':
            if (vscode.workspace.workspaceFolders === undefined) {
                addSearchLocationsFromSettings();
            }
            break;
        default:
            assert(false, 'Unhandled case');
    }

    // add the workspace folders
    if (CFG.searchWorkspaceFolders && vscode.workspace.workspaceFolders !== undefined) {
        const dirs = vscode.workspace.workspaceFolders.map(x => {
            const uri = decodeURI(x.uri.toString());
            if (uri.substring(0, 7) === 'file://') {
                if(os.platform() === 'win32') {
                    return uri.substring(8)
                              .replace(/\//g, "\\")
                              .replace(/%3A/g, ":");
                } else {
                    return uri.substring(7);
                }
            } else {
                vscode.window.showErrorMessage('Non-file:// uri\'s not currently supported...');
                return '';
            }
        });
        locations.push(...dirs);
        dirs.forEach(x => setOrUpdateOrigin(x, PathOrigin.workspace));
    }

    return locations;
}

/** Produce a human-readable string explaining where the search paths come from */
function explainSearchLocations(useColor = false) {
    const listDirs = (which: PathOrigin) => {
        let str = '';
        Object.entries(CFG.searchPathsOrigins).forEach(([k, v]) => {
            if ((v & which) !== 0) {
                str += `- ${k}\n`;
            }
        });
        if (str.length === 0) {
            str += '- <none>\n';
        }
        return str;
    };

    const maybeBlue = (s: string) => {
        return useColor ? `\\033[36m${s}\\033[0m` : s;
    };

    let ret = '';
    ret += maybeBlue('Paths added because they\'re the working directory:\n');
    ret += listDirs(PathOrigin.cwd);
    ret += maybeBlue('Paths added because they\'re defined in the workspace:\n');
    ret += listDirs(PathOrigin.workspace);
    ret += maybeBlue('Paths added because they\'re the specified in the settings:\n');
    ret += listDirs(PathOrigin.settings);

    return ret;
}

function writePathOriginsFile() {
    fs.writeFileSync(path.join(CFG.tempDir, 'paths_explain'), explainSearchLocations(os.platform() !== 'win32'));
    return true;
}

function handleWorkspaceFoldersChanges() {

    CFG.searchPaths = collectSearchLocations();

    // Also re-update when anything changes
    vscode.workspace.onDidChangeWorkspaceFolders(event => {
        console.log('workspace folders changed: ', event);
        CFG.searchPaths = collectSearchLocations();
    });
}

function handleWorkspaceSettingsChanges() {
    updateConfigWithUserSettings();

    // Also re-update when anything changes
    vscode.workspace.onDidChangeConfiguration(_ => {
        updateConfigWithUserSettings();
        // This may also have affected our search paths
        CFG.searchPaths = collectSearchLocations();
        // We need to update the env vars in the terminal
        reinitialize();
    });
}

/** Check seat belts are on. Also, check terminal commands are on PATH */
function doFlightCheck(): boolean {
    const parseKeyValue = (line: string) => {
        return line.split(': ', 2);
    };

    try {
        let errStr = '';
        const kvs: any = {};
        let out = "";
        if(os.platform() === 'win32') {
            out = cp.execFileSync("powershell " + getCommandString(commands.flightCheck, false, false), { shell: true }).toString('utf-8');
        } else {
            out = cp.execFileSync(getCommandString(commands.flightCheck, false, false), { shell: true }).toString('utf-8');
        }
        out.split('\n').map(x => {
            const maybeKV = parseKeyValue(x);
            if (maybeKV.length === 2) {
                kvs[maybeKV[0]] = maybeKV[1];
            }
        });
        if (kvs['which bat'] === undefined || kvs['which bat'] === '') {
            errStr += 'bat not found on your PATH\n. ';
        }
        if (kvs['which fzf'] === undefined || kvs['which fzf'] === '') {
            errStr += 'fzf not found on your PATH\n. ';
        }
        if (kvs['which rg'] === undefined || kvs['which rg'] === '') {
            errStr += 'rg not found on your PATH\n. ';
        }
        if (os.platform() !== 'win32' && (kvs['which sed'] === undefined || kvs['which sed'] === '')) {
            errStr += 'sed not found on your PATH\n. ';
        }
        if (errStr !== '') {
            vscode.window.showErrorMessage(`Failed to activate plugin: ${errStr}\nMake sure you have the required command line tools installed as outlined in the README.`);
        }

        return errStr === '';
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to run checks before starting extension. Maybe this is helpful: ${error}`);
        return false;
    }
}

/**
 * All the logic that's the same between starting the plugin and re-starting
 * after user settings change
 */
function reinitialize() {

    term?.dispose();
    updateConfigWithUserSettings();
    // console.log('plugin config:', CFG);
    if (!CFG.flightCheckPassed && !CFG.disableStartupChecks) {
        CFG.flightCheckPassed = doFlightCheck();
    }

    if (!CFG.flightCheckPassed && !CFG.disableStartupChecks) {
        return false;
    }

    //
    // Set up a file watcher. Its contents tell us what files the user selected.
    // It also means the command was completed so we can do stuff like
    // optionally hiding the terminal.
    //
    CFG.tempDir = fs.mkdtempSync(`${tmpdir()}${path.sep}${CFG.extensionName}-`);
    // DEBUG: Send debug output to a stable file folder so you can inspect it
    CFG.tempDir = '/tmp/find-it-faster';
    CFG.canaryFile = path.join(CFG.tempDir, 'snitch');
    CFG.selectionFile = path.join(CFG.tempDir, 'selection');
    CFG.lastQueryFile = path.join(CFG.tempDir, 'last_query');
    CFG.lastPosFile = path.join(CFG.tempDir, 'last_position');
    // DEBUG: This will set a file that contains the output of the shell script >>'s
    CFG.shellDebugFile = path.join(CFG.tempDir, 'shell_debug');
    fs.writeFileSync(CFG.canaryFile, '');
    fs.watch(CFG.canaryFile, (eventType) => {
        if (eventType === 'change') {
            handleCanaryFileChange();
        } else if (eventType === 'rename') {
            vscode.window.showErrorMessage(`Issue detected with extension ${CFG.extensionName}. You may have to reload it.`);
        }
    });
    return true;
}

/** Interpreting the terminal output and turning them into a vscode command */
function openFiles(data: string) {
    const filePaths = data.split('\n').filter(s => s !== '');
    assert(filePaths.length > 0);
    filePaths.forEach(p => {
        let [file, lineTmp, charTmp] = p.split(':', 3);
        // TODO: We might want to just do this the RE way on all platforms?
        //       On Windows at least the c: makes the split approach problematic.
        if (os.platform() === 'win32') {
            let re = /^\s*(?<file>([a-zA-Z][:])?[^:]+)([:](?<lineTmp>\d+))?\s*([:](?<charTmp>\d+))?.*/;
            let v = p.match(re);
            if(v && v.groups) {
                file = v.groups['file'];
                lineTmp = v.groups['lineTmp'];
                charTmp = v.groups['charTmp'];
                //vscode.window.showWarningMessage('File: ' + file + "\nlineTmp: " + lineTmp + "\ncharTmp: " + charTmp);
            } else {
                vscode.window.showWarningMessage('Did not match anything in filename: [' + p + "] could not open file!");
            }
        }
        // On windows we sometimes get extra characters that confound
        // the file lookup.
        file = file.trim();
        let line = 0, char = 0;
        let range = new vscode.Range(0, 0, 0, 0);
        if (lineTmp !== undefined) {
            if (charTmp !== undefined) {
                char = parseInt(charTmp) - 1;  // 1 based in rg, 0 based in VS Code
            }
            line = parseInt(lineTmp) - 1;  // 1 based in rg, 0 based in VS Code
            assert(line >= 0);
            assert(char >= 0);
        }
        vscode.window.showTextDocument(
            vscode.Uri.file(file),
            { preview: CFG.openFileInPreviewEditor, selection: new vscode.Range(line, char, line, char) });
    });
}

/** Logic of what to do when the user completed a command invocation on the terminal */
function handleCanaryFileChange() {
    if (CFG.clearTerminalAfterUse) {
        term.sendText('clear');
    }

    if (CFG.killTerminalAfterUse) {
        // Some folks like having a constant terminal open. This will kill ours such that VS Code will
        // switch back to theirs. We don't have more control over the terminal so this is the best we
        // can do. This is not the default because creating a new terminal is sometimes expensive when
        // people use e.g. powerline or other fancy PS1 stuff.
        //
        // We set a timeout here to address #56. Don't have a good hypothesis as to why this works but
        // it seems to fix the issue consistently.
        setTimeout(() => term.dispose(), 100);
    }

    fs.readFile(CFG.canaryFile, { encoding: 'utf-8' }, (err, data) => {
        if (err) {
            // We shouldn't really end up here. Maybe leave the terminal around in this case...
            vscode.window.showWarningMessage('Something went wrong but we don\'t know what... Did you clean out your /tmp folder?');
        } else {
            const commandWasSuccess = data.length > 0 && data[0] !== '1';

            // open the file(s)
            if (commandWasSuccess) {
                openFiles(data);
            }

            if (CFG.restoreFocusTerminal && previousActiveTerminal) {
                handleTerminalFocusRestore(commandWasSuccess);
                return;
            }

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

function handleTerminalFocusRestore(commandWasSuccess: boolean) {
    const shouldHideTerminal = (commandWasSuccess && CFG.hideTerminalAfterSuccess) || (!commandWasSuccess && CFG.hideTerminalAfterFail);

    if (shouldHideTerminal) {
        const disposable = vscode.window.onDidChangeActiveTerminal(activeTerminal => {
            if (isExtensionChangedTerminal && activeTerminal === previousActiveTerminal) {
                previousActiveTerminal?.hide();
                previousActiveTerminal = null;
                isExtensionChangedTerminal = false;
                disposable.dispose();
            }
        });
    }

    isExtensionChangedTerminal = true;
    previousActiveTerminal?.show();
}

function createTerminal() {
    term = vscode.window.createTerminal({
        name: 'F️indItFaster',
        hideFromUser: true,
        env: {
            /* eslint-disable @typescript-eslint/naming-convention */
            FIND_IT_FASTER_ACTIVE: '1',
            HISTCONTROL: 'ignoreboth',  // bash
            // HISTORY_IGNORE: '*',        // zsh
            EXTENSION_PATH: CFG.extensionPath,
            FIND_FILES_PREVIEW_ENABLED: CFG.findFilesPreviewEnabled ? '1' : '0',
            FIND_FILES_PREVIEW_COMMAND: CFG.findFilesPreviewCommand,
            FIND_FILES_PREVIEW_WINDOW_CONFIG: CFG.findFilesPreviewWindowConfig,
            FIND_WITHIN_FILES_PREVIEW_ENABLED: CFG.findWithinFilesPreviewEnabled ? '1' : '0',
            FIND_WITHIN_FILES_PREVIEW_COMMAND: CFG.findWithinFilesPreviewCommand,
            FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG: CFG.findWithinFilesPreviewWindowConfig,
            USE_GITIGNORE: CFG.useGitIgnoreExcludes ? '1' : '0',
            GLOBS: CFG.useWorkspaceSearchExcludes ? getIgnoreString() : '',
            CANARY_FILE: CFG.canaryFile,
            SELECTION_FILE: CFG.selectionFile,
            LAST_QUERY_FILE: CFG.lastQueryFile,
            LAST_POS_FILE: CFG.lastPosFile,
            // DEBUG: This passes the var to the shell script to write debug output to a file
            SHELL_DEBUG_FILE: CFG.shellDebugFile,
            EXPLAIN_FILE: path.join(CFG.tempDir, 'paths_explain'),
            BAT_THEME: CFG.batTheme,
            FUZZ_RG_QUERY: CFG.fuzzRipgrepQuery ? '1' : '0',
            //DEBUG: This turns on fuzzy only for single file search
            FUZZ_RG_QUERY_SINGLE_FILE: '1',
            /* eslint-enable @typescript-eslint/naming-convention */
        },
    });
}

function getWorkspaceFoldersAsString() {
    // For bash invocation. Need to wrap in quotes so spaces within paths don't
    // split the path into two strings.
    return CFG.searchPaths.reduce((x, y) => x + ` '${y}'`, '');
}

function getCommandString(cmd: Command, withArgs: boolean = true, withTextSelection: boolean = true, searchInCurrentEditor: boolean = false) {
    assert(cmd.uri);
    let ret = '';
    const currentEditorPath = vscode.window.activeTextEditor?.document.uri.fsPath;
    const cmdPath = cmd.uri.fsPath;
    if (CFG.useEditorSelectionAsQuery && withTextSelection) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            if (!selection.isEmpty) {
                //
                // Fun story on text selection:
                // My first idea was to use an env var to capture the selection.
                // My first test was to use a selection that contained shell script...
                // This breaks. And fixing it is not easy. See https://unix.stackexchange.com/a/600214/128132.
                // So perhaps we should write this to file, and see if we can get bash to interpret this as a
                // string. We'll use an env var to indicate there is a selection so we don't need to read a
                // file in the general no-selection case, and we don't have to clear the file after having
                // used the selection.
                //
                const selectionText = editor.document.getText(selection);
                fs.writeFileSync(CFG.selectionFile, selectionText);
                ret += 'HAS_SELECTION=1 ';
            }
        }
    }
    // useTypeFilter should only be try if we activated the corresponding command
    if (CFG.useTypeFilter && CFG.findWithinFilesFilter.size > 0) {
        if(os.platform() === 'win32') {
            ret += '$Env:TYPE_FILTER=' + "'" +[...CFG.findWithinFilesFilter].reduce((x, y) => x + ':' + y) + "'; ";
        } else {
            ret += 'TYPE_FILTER=' + [...CFG.findWithinFilesFilter].reduce((x, y) => x + ':' + y) + ' ';
        }
    }
    if (cmd.script === 'resume_search') {
        ret += 'RESUME_SEARCH=1 ';
    }
    ret += cmdPath;
    if (withArgs && !searchInCurrentEditor) {
        let paths = getWorkspaceFoldersAsString();
        ret += ` ${paths}`;
    }
    // Add current file arg to make single file search set variable
    if (searchInCurrentEditor && currentEditorPath) {
        ret += ` '${currentEditorPath}'`;
    }
    return ret;
}

function getIgnoreGlobs() {
    const exclude = vscode.workspace.getConfiguration('search.exclude');  // doesn't work though the docs say it should?
    const globs: string[] = [];
    Object.entries(exclude).forEach(([k, v]) => {
        // Messy proxy object stuff
        if (typeof v === 'function') { return; }
        if (v) { globs.push(`!${k}`); }
    });
    return globs;
}

function getIgnoreString() {
    const globs = getIgnoreGlobs();
    // We separate by colons so we can have spaces in the globs
    return globs.reduce((x, y) => x + `${y}:`, '');
}

async function executeTerminalCommand(cmd: string) {
    getIgnoreGlobs();
    if (!CFG.flightCheckPassed && !CFG.disableStartupChecks) {
        if (!reinitialize()) {
            return;
        }
    }

    if (cmd === "resumeSearch") {
        // Run the last-run command again
        if (os.platform() === 'win32') {
            vscode.window.showErrorMessage('Resume search is not implemented on Windows. Sorry! PRs welcome.');
            return;
        }
        if (CFG.lastCommand === '') {
            vscode.window.showErrorMessage('Cannot resume the last search because no search was run yet.');
            return;
        }
        commands["resumeSearch"].uri = commands[CFG.lastCommand].uri;
        commands["resumeSearch"].preRunCallback = commands[CFG.lastCommand].preRunCallback;
        commands["resumeSearch"].postRunCallback = commands[CFG.lastCommand].postRunCallback;
    } else if (cmd.startsWith("find")) { // Keep track of last-run cmd, but we don't want to resume `listSearchLocations` etc
        CFG.lastCommand = cmd;
    }

    if (!term || term.exitStatus !== undefined) {
        createTerminal();
        if (os.platform() !== 'win32')
        {
            term.sendText('bash');
            term.sendText('export PS1="::: Terminal allocated for FindItFaster. Do not use. ::: "; clear');
        }
    }

    assert(cmd in commands);
    const cb = commands[cmd].preRunCallback;
    let cbResult = true;
    if (cb !== undefined) { cbResult = await cb(); }

    // Single file search mode
    let searchInCurrentEditor = false;
    if (cmd === 'findWithinSingleFile') { searchInCurrentEditor = true; }

    if (cbResult === true) {
        term.sendText(getCommandString(commands[cmd], true, true, searchInCurrentEditor));
        if (CFG.showMaximizedTerminal) {
            vscode.commands.executeCommand('workbench.action.toggleMaximizedPanel');
        }
        if (CFG.restoreFocusTerminal) {
            previousActiveTerminal = vscode.window.activeTerminal ?? null;
        }
        term.show();
        const postRunCallback = commands[cmd].postRunCallback;
        if (postRunCallback !== undefined) { postRunCallback(); }
    }
}
