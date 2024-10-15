import { defineConfigObject } from "reactive-vscode";
import * as Meta from "./generated/meta";

export const config = defineConfigObject<Meta.ScopedConfigKeyTypeMap>(
	Meta.scopedConfigs.scope,
	Meta.scopedConfigs.defaults,
);

type WhenCondition = "always" | "never" | "noWorkspaceOnly";
export enum PathOrigin {
	cwd = 1 << 0,
	workspace = 1 << 1,
	settings = 1 << 2,
}

export interface CustomTask {
	name: string;
	command: string;
}

export interface Config {
	searchPaths: string[];
	searchPathsOrigins: { [key: string]: PathOrigin };
	useEditorSelectionAsQuery: boolean;
	useGitIgnoreExcludes: boolean;
	useWorkspaceSearchExcludes: boolean;
	findFilesPreviewEnabled: boolean;
	findFilesPreviewCommand: string;
	findFilesPreviewWindowConfig: string;
	findWithinFilesPreviewEnabled: boolean;
	findWithinFilesPreviewCommand: string;
	findWithinFilesPreviewWindowConfig: string;
	findWithinFilesFilter: Set<string>;
	workspaceSettings: {
		folders: string[];
	};
	additionalSearchLocations: string[];
	additionalSearchLocationsWhen: WhenCondition;
	searchCurrentWorkingDirectory: WhenCondition;
	searchWorkspaceFolders: boolean;
	extensionPath: string;
	useTypeFilter: boolean;
	lastCommand: string;
	batTheme: string;
	openFileInPreviewEditor: boolean;
	fuzzRgQuery: boolean;
	findTodoFixmeSearchPattern: string;
	customTasks: CustomTask[];
	openCommand: string;
}

export const CFG: Config = {
	searchPaths: [],
	searchPathsOrigins: {},
	useEditorSelectionAsQuery: true,
	useGitIgnoreExcludes: true,
	useWorkspaceSearchExcludes: true,
	findFilesPreviewEnabled: true,
	findFilesPreviewCommand: "",
	findFilesPreviewWindowConfig: "",
	findWithinFilesPreviewEnabled: true,
	findWithinFilesPreviewCommand: "",
	findWithinFilesPreviewWindowConfig: "",
	findWithinFilesFilter: new Set(),
	workspaceSettings: {
		folders: [],
	},
	additionalSearchLocations: [],
	additionalSearchLocationsWhen: "never",
	searchCurrentWorkingDirectory: "never",
	searchWorkspaceFolders: true,
	extensionPath: "",
	useTypeFilter: false,
	lastCommand: "",
	batTheme: "",
	openFileInPreviewEditor: false,
	fuzzRgQuery: false,
	findTodoFixmeSearchPattern: "(TODO|FIXME|HACK|FIX):\\s",
	customTasks: [],
	openCommand: "code -g",
};
