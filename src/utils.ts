import { workspace } from "vscode";

/**
 * Given the `search.exclude` configuration object, returns the globs that VS Code uses to exclude files
 * from its native search. We convert the configuration object to an array of globs by prepending a
 * bang to each key. If a value is a function, we ignore it.
 *
 * @returns An array of globs that VS Code uses to exclude files from its native search.
 */
export function getIgnoreGlobs(): string[] {
	const exclude = workspace.getConfiguration("search.exclude");
	const globs: string[] = [];
	for (const [k, v] of Object.entries(exclude)) {
		if (typeof v === "function") {
			continue;
		}
		if (v) {
			globs.push(`!${k}`);
		}
	}
	return globs;
}

/**
 * Given the `search.exclude` configuration object, returns a colon-separated string of globs that VS Code uses to exclude files
 * from its native search. We convert the configuration object to an array of globs by prepending a bang to each key. If a value is
 * a function, we ignore it.
 *
 * @returns A colon-separated string of globs that VS Code uses to exclude files from its native search.
 */
export function getIgnoreString() {
	const globs = getIgnoreGlobs();
	// We separate by colons so we can have spaces in the globs
	return globs?.reduce((x, y) => `${x}${y}:`, "") ?? "";
}
