import { exec, execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

let lastQueryFile: string;

/**
 * Runs `rg` to search for files and pipes the output to `fzf` to select files.
 * If only one path is provided, it will be used as the working directory.
 * @param paths The paths to search.
 * @param initialQuery The initial query to search for.
 * @returns A promise that resolves with the selected files.
 */
export async function findFiles(
	paths: string[],
	initialQuery?: string,
): Promise<string[]> {
	// TODO: Need to update the test to match the new behavior
	return new Promise((resolve, reject) => {
		const previewEnabled = process.env.FIND_FILES_PREVIEW_ENABLED === "1";
		const previewCommand =
			process.env.FIND_FILES_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always --plain {}";
		const previewWindow =
			process.env.FIND_FILES_PREVIEW_WINDOW_CONFIG || "right:50%:border-left";
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";

		// Navigate to the first path if it's the only one
		let singleDirRoot = "";
		if (paths.length === 1) {
			singleDirRoot = paths[0];
			// biome-ignore lint: it's okay as the path is already set
			paths = [];
			process.chdir(singleDirRoot);
		}

		// Implement resume search with last query file
		const query = initialQuery || "";

		const rgArgs = [
			"--files",
			"--hidden",
			useGitignore ? "" : "--no-ignore",
			"--glob",
			"!**/.git/",
		];
		if (fileTypes) {
			// Split file type `:` and add to rgArgs
			const fileTypesArray = fileTypes.split(":");
			for (const fileType of fileTypesArray) {
				rgArgs.push("--type", fileType);
			}
		}
		rgArgs.push(...paths);
		const rg = spawn("rg", rgArgs.filter(Boolean));

		const fzfArgs = [
			"--cycle",
			"--multi",
			"--query",
			query,
			"--print-query",
			"--layout=reverse",
		];

		if (previewEnabled) {
			fzfArgs.push(
				"--preview",
				previewCommand,
				"--preview-window",
				previewWindow,
			);
		}

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		rg.stdout.pipe(fzf.stdin);

		let output = "";
		let lastQuery = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", (code) => {
			if (code === 0) {
				const lines = output.trim().split("\n");
				lastQuery = lines[0]; // The first line is the query
				let selectedFiles = lines.slice(1); // The rest are selected files
				if (singleDirRoot) {
					// Prepend the single directory root to each selected file
					selectedFiles = selectedFiles.map(
						(file) => `${singleDirRoot}/${file}`,
					);
				}
				resolve(selectedFiles);
				// Save the query for future resume
				if (lastQuery !== null) {
					writeFileSync(lastQueryFile, lastQuery);
				}
			} else {
				reject(new Error("File selection canceled"));
			}
		});

		rg.on("error", (error) => {
			reject(new Error(`Failed to start rg: ${error.message}`));
		});

		fzf.on("error", (error) => {
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});
	});
}

/**
 * Interactive search for text within files using rg and fzf.
 * @param paths - An array of file paths to search within.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 */
export async function liveGrep(
	paths: string[],
	initialQuery?: string,
): Promise<string[]> {
	// TODO: Need to update the test to match the new behavior
	return new Promise((resolve, reject) => {
		const previewCommand =
			process.env.FIND_WITHIN_FILES_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid";
		const previewWindow =
			process.env.FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG ||
			"right:border-left:50%:+{2}+3/3:~3";
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";
		const fuzzRgQuery = process.env.FUZZ_RG_QUERY === "1";

		// Navigate to the first path if it's the only one
		let singleDirRoot = "";
		if (paths.length === 1) {
			singleDirRoot = paths[0];
			process.chdir(singleDirRoot);
			// biome-ignore lint: it's okay as the path is already set
			paths = [];
		}

		const query = initialQuery || "";

		const rgArgs = [
			"--column",
			"--line-number",
			"--no-heading",
			"--color=always",
			"--smart-case",
			useGitignore ? "" : "--no-ignore",
			"--glob",
			"!**/.git/",
		];

		if (fileTypes) {
			const fileTypesArray = fileTypes.split(":");
			for (const fileType of fileTypesArray) {
				rgArgs.push("--type", fileType);
			}
		}

		rgArgs.push(...paths);

		// Create a string of all rgArgs, properly escaped
		const rgArgsString = rgArgs
			.filter(Boolean)
			.map((arg) => `'${arg.replace(/'/g, "'\\''")}'`)
			.join(" ");

		const searchCommand = `rg ${rgArgsString} ${fuzzRgQuery ? "-e" : ""} {q} || true`;

		const fzfArgs = [
			"--ansi",
			"--multi",
			"--delimiter",
			":",
			"--preview",
			previewCommand,
			"--preview-window",
			previewWindow,
			"--query",
			query,
			"--print-query",
			"--bind",
			`change:reload:${searchCommand}`,
			"--layout=reverse",
		];

		if (initialQuery) {
			fzfArgs.push("--bind", `start:reload:${searchCommand}`);
		}

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		// If there's an initial query, perform the search immediately
		if (initialQuery) {
			const initialSearch = spawn("sh", [
				"-c",
				searchCommand.replace("{q}", query),
			]);
			initialSearch.stdout.pipe(fzf.stdin);
			initialSearch.stderr.pipe(process.stderr);
		} else {
			const rg = spawn("rg", rgArgs.filter(Boolean));
			rg.stdout.pipe(fzf.stdin);
		}

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", (code) => {
			if (code === 0) {
				const lines = output.trim().split("\n");
				const lastQuery = lines[0]; // The first line is the query
				let selectedFiles = lines.slice(1); // The rest are selected files
				if (singleDirRoot) {
					selectedFiles = selectedFiles.map(
						(file) =>
							`${singleDirRoot}/${file.split(":")[0]}:${file.split(":")[1]}:${file.split(":")[2]}`,
					);
				}
				writeFileSync(lastQueryFile, lastQuery);
				resolve(selectedFiles);
			} else {
				reject(new Error("Search canceled"));
			}
		});

		fzf.on("error", (error) => {
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});
	});
}

/**
 * Searches for TODO/FIXME comments in files using rg and fzf.
 * @param paths - An array of file paths to search within.
 * @param initialQuery - The initial query to search for.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 */
export async function findTodoFixme(
	paths: string[],
	// TODO: Support initialQuery for resume search
	initialQuery?: string,
): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";
		const searchPattern =
			process.env.FIND_TODO_FIXME_SEARCH_PATTERN || "(TODO|FIXME|HACK|FIX):s";
		const rgArgs = [
			"--column",
			"--line-number",
			"--no-heading",
			"--color=always",
			"--smart-case",
			"--glob",
			useGitignore ? "" : "--no-ignore",
			"!**/.git/",
			searchPattern,
		];

		if (fileTypes) {
			const fileTypesArray = fileTypes.split(":");
			for (const fileType of fileTypesArray) {
				rgArgs.push("--type", fileType);
			}
		}

		rgArgs.push(...paths);

		const rg = spawn("rg", rgArgs.filter(Boolean));

		const previewCommand =
			process.env.FIND_TODO_FIXME_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid";
		const previewWindow =
			process.env.FIND_TODO_FIXME_PREVIEW_WINDOW_CONFIG ||
			"right:border-left:50%:+{2}+3/3:~3";

		const fzfArgs = [
			"--ansi",
			"--multi",
			"--delimiter",
			":",
			"--preview",
			previewCommand,
			"--preview-window",
			previewWindow,
			"--layout=reverse",
		];

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		rg.stdout.pipe(fzf.stdin);

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", (code) => {
			if (code === 0) {
				resolve(output.trim().split("\n"));
			} else {
				reject(new Error("Search canceled"));
			}
		});
	});
}

/**
 * Picks files from git status using fzf.
 * If no file is selected, it will return an empty array.
 * @returns A promise that resolves to an array of selected file paths.
 */
async function pickFilesFromGitStatus(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const previewEnabled =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_ENABLED !== "0";
		const previewCommand =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND ||
			"git diff --color=always -- {}";
		const previewWindow =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_WINDOW_CONFIG ||
			"right:50%:border-left";

		try {
			// Change to the root directory of the git repository
			const gitRoot = execSync("git rev-parse --show-toplevel", {
				encoding: "utf-8",
			}).trim();
			process.chdir(gitRoot);

			// Get git status
			const gitStatus = execSync("git status --porcelain", {
				encoding: "utf-8",
			});

			if (!gitStatus.trim()) {
				console.log("No changes in the git repository.");
				resolve([]);
				return;
			}

			const fzfArgs = ["--cycle", "--multi", "--layout=reverse"];

			if (previewEnabled) {
				fzfArgs.push(
					"--preview",
					previewCommand,
					"--preview-window",
					previewWindow,
				);
			}

			const fzf = spawn("fzf", fzfArgs, {
				stdio: ["pipe", "pipe", process.stderr],
			});

			// Prepare git status for fzf input and exclude deleted files
			const fzfInput = gitStatus
				.split("\n")
				.filter(Boolean)
				.filter((line) => !line.startsWith("D ") && !line.startsWith(" D"))
				.map((line) => line.slice(3))
				.join("\n");

			fzf.stdin.write(fzfInput);
			fzf.stdin.end();

			let output = "";
			fzf.stdout.on("data", (data) => {
				output += data.toString();
			});

			fzf.on("close", (code) => {
				if (code === 0 && output.trim()) {
					const selectedFiles = output.trim().split("\n");
					const fullPaths = selectedFiles.map((file) =>
						path.join(gitRoot, file),
					);
					resolve(fullPaths);
				} else {
					console.log("No file selected.");
					resolve([]);
				}
			});

			fzf.on("error", (error) => {
				reject(new Error(`Failed to start fzf: ${error.message}`));
			});
		} catch (error) {
			reject(
				new Error(
					`Error in pickFilesFromGitStatus: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
		}
	});
}

export function openFiles(filePath: string) {
	let [file, lineTmp, charTmp] = filePath.split(":", 3);

	file = file.trim();
	let selection = undefined;
	if (lineTmp !== undefined) {
		let char = 0;
		if (charTmp !== undefined) {
			char = Number.parseInt(charTmp);
		}
		const line = Number.parseInt(lineTmp);
		if (line >= 0 && char >= 0) {
			selection = {
				start: {
					line,
					character: char,
				},
				end: {
					line,
					character: char,
				},
			};
		}
	}

	return {
		file,
		selection,
	};
}

if (require.main === module) {
	const command = process.argv[2];
	const args = process.argv.slice(3);
	lastQueryFile = path.join(
		process.env.EXTENSION_PATH || process.cwd(),
		".last_query",
	);
	const executeCommand = async (
		func: (paths: string[], selectedText?: string) => Promise<string[]>,
	) => {
		try {
			const isResumeSearch = process.env.HAS_RESUME === "1";
			let initialQuery = "";
			if (isResumeSearch && existsSync(lastQueryFile)) {
				initialQuery = readFileSync(lastQueryFile, "utf-8").trim();
			} else if (process.env.SELECTED_TEXT) {
				initialQuery = process.env.SELECTED_TEXT;
			}
			const files = await func(args, initialQuery);
			const openCommand = process.env.OPEN_COMMAND_CLI || "code";
			const openPromises = files.map((filePath) => {
				return new Promise<void>((resolve, reject) => {
					const { file, selection } = openFiles(filePath);
					exec(
						`${openCommand} ${selection ? `${file}:${selection.start.line}` : file}`,
						(error: Error | null, stdout: string) => {
							if (error) {
								console.error("Error opening file", error);
								reject(error);
							} else {
								console.log(stdout);
								resolve();
							}
						},
					);
				});
			});

			Promise.all(openPromises).catch(console.error);

			const pidFilePath = path.join(
				process.env.EXTENSION_PATH || process.cwd(),
				"out",
				process.env.PID_FILE_NAME || "",
			);
			// Update the PID file to 0 so the extension knows the command is done
			if (existsSync(pidFilePath)) {
				writeFileSync(pidFilePath, "0");
			}
			process.exit(0);
		} catch (error) {
			console.error("Error:", error);
			process.exit(1);
		}
	};

	switch (command) {
		case "findFiles":
			executeCommand(findFiles);
			break;
		case "findWithinFiles":
			executeCommand(liveGrep);
			break;
		case "pickFileFromGitStatus":
			executeCommand(pickFilesFromGitStatus);
			break;
		case "findTodoFixme":
			executeCommand(findTodoFixme);
			break;
		default:
			console.error("Unknown command");
			process.exit(1);
	}
}
