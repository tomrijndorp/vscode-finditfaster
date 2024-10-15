import { execSync } from "node:child_process";
import { unlinkSync, watch, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";
import { defineExtension, extensionContext, useCommand } from "reactive-vscode";
import * as vscode from "vscode";

import { CFG, PathOrigin, config } from "./config";
import * as Meta from "./generated/meta";
import { logger } from "./logger";
import { getIgnoreString } from "./utils";

const TERMINAL_NAME = Meta.displayName;

let currentTerminal: vscode.Terminal;

interface Command {
	script?: string;
	command?: string;
	preRunCallback: undefined | (() => boolean | Promise<boolean>);
	postRunCallback: undefined | (() => void);
	isCustomTask?: boolean;
}
const commands: { [key: string]: Command } = {
	findFiles: {
		command: "findFiles",
		preRunCallback: undefined,
		postRunCallback: undefined,
	},
	findFilesWithType: {
		command: "findFiles",
		preRunCallback: selectTypeFilter,
		postRunCallback: () => {
			CFG.useTypeFilter = false;
		},
	},
	findWithinFiles: {
		command: "findWithinFiles",
		preRunCallback: undefined,
		postRunCallback: undefined,
	},
	findWithinFilesWithType: {
		command: "findWithinFiles",
		preRunCallback: selectTypeFilter,
		postRunCallback: () => {
			CFG.useTypeFilter = false;
		},
	},
	resumeSearch: {
		command: "resumeSearch", // Dummy. We will set the uri from the last-run script. But we will use this value to check whether we are resuming.
		preRunCallback: undefined,
		postRunCallback: undefined,
	},
	pickFileFromGitStatus: {
		command: "pickFileFromGitStatus",
		preRunCallback: undefined,
		postRunCallback: undefined,
	},
	findTodoFixme: {
		command: "findTodoFixme",
		preRunCallback: undefined,
		postRunCallback: undefined,
	},
	runCustomTask: {
		command: "runCustomTask",
		preRunCallback: chooseCustomTask,
		postRunCallback: undefined,
		isCustomTask: true,
	},
};

function getTypeOptions() {
	const result = execSync("rg --type-list").toString();
	return result
		.split("\n")
		.map((line) => {
			const [typeStr, typeInfo] = line.split(":");
			return new FileTypeOption(
				typeStr,
				typeInfo,
				CFG.findWithinFilesFilter.has(typeStr),
			);
		})
		.filter((x) => x.label.trim().length !== 0);
}

class FileTypeOption implements vscode.QuickPickItem {
	label: string;
	description: string;
	picked: boolean;

	constructor(typeStr: string, types: string, picked = false) {
		this.label = typeStr;
		this.description = types;
		this.picked = picked;
	}
}

async function selectTypeFilter() {
	const opts = getTypeOptions();
	return await new Promise<boolean>((resolve, _) => {
		const qp = vscode.window.createQuickPick();
		let hasResolved = false; // I don't understand why this is necessary... Seems like I can resolve twice?

		qp.items = opts;
		qp.title = `Type one or more type identifiers below and press Enter,
        OR select the types you want below. Example: typing "py cpp<Enter>"
        (without ticking any boxes will search within python and C++ files.
        Typing nothing and selecting those corresponding entries will do the
        same. Typing "X" (capital x) clears all selections.`;
		qp.placeholder = "enter one or more types...";
		qp.canSelectMany = true;
		// https://github.com/microsoft/vscode/issues/103084
		// https://github.com/microsoft/vscode/issues/119834
		qp.selectedItems = qp.items.filter((x) =>
			CFG.findWithinFilesFilter.has(x.label),
		);
		qp.value = [...CFG.findWithinFilesFilter.keys()].reduce(
			(x, y) => `${x} ${y}`,
			"",
		);
		qp.matchOnDescription = true;
		qp.show();
		qp.onDidChangeValue(() => {
			if (qp.value.length > 0 && qp.value[qp.value.length - 1] === "X") {
				// This is where we're fighting with VS Code a little bit.
				// When you don't reassign the items, the "X" will still be filtering the results,
				// which we obviously don't want. Currently (6/2021), this works as expected.
				qp.value = "";
				qp.selectedItems = [];
				qp.items = [...qp.items]; // Create a new array to trigger update
			}
		});
		qp.onDidAccept(() => {
			CFG.useTypeFilter = true;
			logger.info("Using type filter", qp.activeItems);
			CFG.findWithinFilesFilter.clear(); // reset
			if (qp.selectedItems.length === 0) {
				// If there are no active items, use the string that was entered.
				// split on empty string yields an array with empty string, catch that
				const types = qp.value === "" ? [] : qp.value.trim().split(/\s+/);
				for (const x of types) {
					CFG.findWithinFilesFilter.add(x);
				}
			} else {
				// If there are active items, use those.
				for (const x of qp.selectedItems) {
					CFG.findWithinFilesFilter.add(x.label);
				}
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

/**
 * Map settings from the user-configurable settings to our internal data structure
 */
function updateConfigWithUserSettings() {
	CFG.useEditorSelectionAsQuery = config["advanced.useEditorSelectionAsQuery"];
	CFG.useWorkspaceSearchExcludes = config["general.useWorkspaceSearchExcludes"];
	CFG.useGitIgnoreExcludes = config["general.useGitIgnoreExcludes"];
	CFG.searchCurrentWorkingDirectory =
		config["general.searchCurrentWorkingDirectory"];
	CFG.searchWorkspaceFolders = config["general.searchWorkspaceFolders"];
	CFG.batTheme = config["general.batTheme"];
	CFG.openCommand = config["general.openCommand"];
	CFG.openFileInPreviewEditor = config["general.openFileInPreviewEditor"];
	CFG.findFilesPreviewEnabled = config["findFiles.showPreview"];
	CFG.findFilesPreviewCommand = config["findFiles.previewCommand"];
	CFG.findFilesPreviewWindowConfig = config["findFiles.previewWindowConfig"];
	CFG.findWithinFilesPreviewEnabled = config["findWithinFiles.showPreview"];
	CFG.findWithinFilesPreviewCommand = config["findWithinFiles.previewCommand"];
	CFG.findWithinFilesPreviewWindowConfig =
		config["findWithinFiles.previewWindowConfig"];
	CFG.fuzzRgQuery = config["findWithinFiles.fuzzRipgrepQuery"];
	CFG.findTodoFixmeSearchPattern = config["findTodoFixme.searchPattern"];
	CFG.customTasks = config.customTasks;
}

/**
 * Collect search locations based on the current configuration
 * @returns An array of search locations
 */
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
		case "always":
			addCwd();
			break;
		case "never":
			break;
		case "noWorkspaceOnly":
			if (vscode.workspace.workspaceFolders === undefined) {
				addCwd();
			}
			break;
		default:
			logger.error("Unhandled case");
	}

	// additional search locations from extension settings
	const addSearchLocationsFromSettings = () => {
		locations.push(...CFG.additionalSearchLocations);
		for (const x of CFG.additionalSearchLocations) {
			setOrUpdateOrigin(x, PathOrigin.settings);
		}
	};
	switch (CFG.additionalSearchLocationsWhen) {
		case "always":
			addSearchLocationsFromSettings();
			break;
		case "never":
			break;
		case "noWorkspaceOnly":
			if (vscode.workspace.workspaceFolders === undefined) {
				addSearchLocationsFromSettings();
			}
			break;
		default:
			logger.error("Unhandled case");
	}

	// add the workspace folders
	if (
		CFG.searchWorkspaceFolders &&
		vscode.workspace.workspaceFolders !== undefined
	) {
		const dirs = vscode.workspace.workspaceFolders.map((x) => {
			const uri = decodeURIComponent(x.uri.toString());
			if (uri.substring(0, 7) === "file://") {
				if (platform() === "win32") {
					return uri.substring(8).replace(/\//g, "\\").replace(/%3A/g, ":");
				}
				return uri.substring(7);
			}
			vscode.window.showErrorMessage(
				"Non-file:// uri's not currently supported...",
			);
			logger.error("Non-file:// uri's not currently supported...");
			return "";
		});
		locations.push(...dirs);
		for (const x of dirs) {
			setOrUpdateOrigin(x, PathOrigin.workspace);
		}
	}

	return locations;
}

function handleWorkspaceFoldersChanges() {
	CFG.searchPaths = collectSearchLocations();

	// Also re-update when anything changes
	vscode.workspace.onDidChangeWorkspaceFolders((event) => {
		logger.info("workspace folders changed: ", event);
		CFG.searchPaths = collectSearchLocations();
	});
}

function handleWorkspaceSettingsChanges() {
	updateConfigWithUserSettings();

	// Also re-update when anything changes
	vscode.workspace.onDidChangeConfiguration((_) => {
		updateConfigWithUserSettings();
		// This may also have affected our search paths
		CFG.searchPaths = collectSearchLocations();
		// We need to update the env vars in the terminal
		reinitialize();
	});
}

/**
 * Initialize or reinitialize the extension
 * @returns true if initialization was successful, false otherwise
 */
function reinitialize() {
	updateConfigWithUserSettings();
}

/**
 * Get an existing terminal or create a new one
 * @returns A VS Code terminal instance
 */
function getOrCreateTerminal() {
	const existingTerminal = vscode.window.terminals.find(
		(t) => t.name === TERMINAL_NAME,
	);

	if (existingTerminal) {
		return existingTerminal;
	}

	const terminalOptions: vscode.TerminalOptions = {
		name: TERMINAL_NAME,
		hideFromUser: false,
		location: vscode.TerminalLocation.Editor,
		env: {
			EXTENSION_PATH: CFG.extensionPath,
			// Hide history on terminal
			HISTFILE: "",
			// TODO: Support those settings on commands.ts
			FIND_FILES_PREVIEW_ENABLED: CFG.findFilesPreviewEnabled ? "1" : "0",
			FIND_FILES_PREVIEW_COMMAND: CFG.findFilesPreviewCommand,
			FIND_FILES_PREVIEW_WINDOW_CONFIG: CFG.findFilesPreviewWindowConfig,
			FIND_WITHIN_FILES_PREVIEW_ENABLED: CFG.findWithinFilesPreviewEnabled
				? "1"
				: "0",
			FIND_WITHIN_FILES_PREVIEW_COMMAND: CFG.findWithinFilesPreviewCommand,
			FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG:
				CFG.findWithinFilesPreviewWindowConfig,
			USE_GITIGNORE: CFG.useGitIgnoreExcludes ? "1" : "0",
			GLOBS: CFG.useWorkspaceSearchExcludes ? getIgnoreString() : "",
			BAT_THEME: CFG.batTheme,
			FUZZ_RG_QUERY: CFG.fuzzRgQuery ? "1" : "0",
			FIND_TODO_FIXME_SEARCH_PATTERN: CFG.findTodoFixmeSearchPattern,
			OPEN_COMMAND_CLI: CFG.openCommand,
		},
	};

	return vscode.window.createTerminal(terminalOptions);
}

/**
 * Get the command string for a given command
 * @param cmd - The command object
 * @param withArgs - Whether to include arguments
 * @param withTextSelection - Whether to include text selection
 * @returns The formatted command string
 */
function getCommandString(
	cmd: Command,
	withArgs = true,
	withTextSelection = true,
) {
	let result = "";

	if (CFG.useEditorSelectionAsQuery && withTextSelection) {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			if (!selection.isEmpty) {
				const selectionText = editor.document.getText(selection);
				result += envVarToString("SELECTED_TEXT", selectionText);
			}
		}
	}

	// useTypeFilter should only be try if we activated the corresponding command
	if (CFG.useTypeFilter && CFG.findWithinFilesFilter.size > 0) {
		result += envVarToString(
			"TYPE_FILTER",
			`'${[...CFG.findWithinFilesFilter].reduce((x, y) => `${x}:${y}`)}'`,
		);
	}

	if (withArgs) {
		const paths = CFG.searchPaths.reduce((x, y) => `${x} '${y}'`, "");
		result += ` ${paths}`;
	}
	logger.info("Get command", result);
	return result;
}

/**
 * Execute a terminal command
 * @param cmd - The command to execute
 */
async function executeTerminalCommand(cmd: string) {
	if (cmd === "resumeSearch") {
		// Run the last-run command again
		if (CFG.lastCommand === "") {
			vscode.window.showErrorMessage(
				"Cannot resume the last search because no search was run yet.",
			);
			return;
		}

		await executeCommand({
			name: CFG.lastCommand,
			withTextSelection: true,
			hasFilter: CFG.lastCommand.includes("WithType"),
			isResumeSearch: true,
		});
		return;
	}

	if (cmd.startsWith("find") || cmd === "pickFileFromGitStatus") {
		// Keep track of last-run cmd, but we don't want to resume `listSearchLocations` etc
		CFG.lastCommand = cmd;
	}

	const cb = commands[cmd].preRunCallback;
	let cbResult = true;
	if (cb !== undefined) {
		cbResult = await cb();
	}

	logger.info(`Executing ${cmd} command`);
	currentTerminal = getOrCreateTerminal();
	if (cbResult === true) {
		switch (cmd) {
			case "findFiles":
			case "findFilesWithType":
				await executeCommand({
					name: "findFiles",
					withTextSelection: false,
					hasFilter: cmd === "findFilesWithType",
				});
				break;
			case "findWithinFiles":
			case "findWithinFilesWithType":
				await executeCommand({
					name: "findWithinFiles",
					withTextSelection: true,
					hasFilter: cmd === "findWithinFilesWithType",
				});
				break;
			case "findTodoFixme":
				await executeCommand({
					name: "findTodoFixme",
					withTextSelection: false,
					hasFilter: false,
				});
				break;
			case "pickFileFromGitStatus":
				await executeCommand({
					name: "pickFileFromGitStatus",
					withTextSelection: false,
					hasFilter: false,
				});
				break;
			default:
				currentTerminal.sendText(getCommandString(commands[cmd]));
				currentTerminal.show();
				break;
		}

		const postRunCallback = commands[cmd].postRunCallback;
		if (postRunCallback !== undefined) {
			postRunCallback();
		}
	}
}

/**
 * Convert an environment variable to a string
 * @param name - The name of the environment variable
 * @param value - The value of the environment variable
 * @returns A formatted string representation of the environment variable
 */
function envVarToString(name: string, value: string) {
	// Note we add a space afterwards
	return platform() === "win32"
		? ` $Env:${name}=${value}; `
		: ` ${name}=${value} `;
}

interface CustomTask {
	name: string;
	command: string;
}

/**
 * Execute a custom task
 * @param task - The custom task to execute
 */
async function executeCustomTask(task: CustomTask): Promise<void> {
	currentTerminal = getOrCreateTerminal();

	logger.info(`Executing custom task: ${task.command}`);
	currentTerminal.sendText(task.command);
	currentTerminal.show();
}

/**
 * Present a quick pick menu for the user to choose a custom task
 * @returns A promise that resolves to true if a task was chosen and executed, false otherwise
 */
async function chooseCustomTask(): Promise<boolean> {
	const customTasks = CFG.customTasks;
	if (customTasks.length === 0) {
		vscode.window.showWarningMessage(
			"No custom tasks defined. Add some in the settings.",
		);
		return false;
	}

	const taskItems = customTasks.map((task) => ({
		label: task.name,
		description: task.command,
	}));

	const selectedTask = await vscode.window.showQuickPick(taskItems, {
		placeHolder: "Choose a custom task to run",
	});

	if (selectedTask) {
		const task = customTasks.find((t) => t.name === selectedTask.label);
		if (task) {
			try {
				await executeCustomTask(task);
				return true;
			} catch (error) {
				logger.error("Failed to execute custom task", error);
				return false;
			}
		}
	}

	return false;
}

/**
 * Execute a command with the given name
 * @param name - The name of the command to execute
 * @param withTextSelection - Whether to include text selection
 * @param hasFilter - Whether the command has a filter
 */
async function executeCommand({
	name,
	withTextSelection,
	hasFilter,
	isResumeSearch = false,
}: {
	name: string;
	withTextSelection: boolean;
	hasFilter: boolean;
	isResumeSearch?: boolean;
}) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage("No workspace folder open");
		return;
	}
	const rootPath = workspaceFolders[0].uri.fsPath;

	// Get the path to the commands.js file
	const commandsJsPath = join(CFG.extensionPath, "out", "commands.js");

	let envVars = "";

	if (withTextSelection) {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			if (!selection.isEmpty) {
				const selectionText = editor.document.getText(selection);
				// Add the selected text as an environment variable
				envVars += envVarToString(
					"SELECTED_TEXT",
					`"${selectionText.replace(/"/g, '\\"')}"`,
				);
			}
		}
	}

	if (hasFilter && CFG.findWithinFilesFilter.size > 0) {
		envVars += envVarToString(
			"TYPE_FILTER",
			`'${[...CFG.findWithinFilesFilter].reduce((x, y) => `${x}:${y}`)}'`,
		);
	}

	if (isResumeSearch) {
		envVars += envVarToString("HAS_RESUME", "1");
	}

	// Add PID_FILE to the environment variable so we hide the terminal when the file is deleted (watch file)
	const pidFileName = Date.now().toString();
	envVars += envVarToString("PID_FILE_NAME", pidFileName);
	// Write the PID to a file so we can kill the server later
	const pidFilePath = join(CFG.extensionPath, "out", pidFileName);
	writeFileSync(pidFilePath, process.pid.toString());

	logger.info(`Executing ${name} command`);
	const command = `${envVars} node "${commandsJsPath}" "${name}" "${rootPath}"`;

	// Get or create the terminal and send the command
	currentTerminal = getOrCreateTerminal();
	currentTerminal.sendText(command);

	// Show the terminal
	currentTerminal.show();

	// Hide the terminal after the command is executed when file has been deleted (watch file)
	logger.info("Watching for file", pidFilePath);
	watch(pidFilePath, (e) => {
		logger.info("File changed", e);
		unlinkSync(pidFilePath);
		currentTerminal.hide();
		currentTerminal.dispose();
	});
}

const { activate, deactivate } = defineExtension(() => {
	CFG.extensionPath = extensionContext.value?.extensionPath ?? "";
	reinitialize();
	handleWorkspaceSettingsChanges();
	handleWorkspaceFoldersChanges();

	useCommand(Meta.commands.findFiles, async () => {
		await executeTerminalCommand("findFiles");
	});

	useCommand(Meta.commands.findFilesWithType, async () => {
		await executeTerminalCommand("findFilesWithType");
	});

	useCommand(Meta.commands.findWithinFiles, async () => {
		await executeTerminalCommand("findWithinFiles");
	});

	useCommand(Meta.commands.findWithinFilesWithType, async () => {
		await executeTerminalCommand("findWithinFilesWithType");
	});

	useCommand(Meta.commands.findTodoFixme, async () => {
		await executeTerminalCommand("findTodoFixme");
	});

	useCommand(Meta.commands.pickFileFromGitStatus, async () => {
		await executeTerminalCommand("pickFileFromGitStatus");
	});

	useCommand(Meta.commands.runCustomTask, async () => {
		await executeTerminalCommand("runCustomTask");
	});

	useCommand(Meta.commands.resumeSearch, async () => {
		await executeTerminalCommand("resumeSearch");
	});

	return {
		dispose: () => {
			currentTerminal?.dispose();
		},
	};
});

export { activate, deactivate };
