import * as childProcess from "node:child_process";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findFiles, liveGrep } from "./commands";

vi.mock("node:child_process");
vi.mock("node:fs");

describe("findFiles", () => {
	const cwd = process.cwd();
	const testDir = path.join(cwd, "src");

	beforeEach(() => {
		vi.resetAllMocks();
		vi.resetModules();
		vi.spyOn(process, "chdir").mockImplementation(() => {});
		process.chdir(testDir);
	});

	afterEach(() => {
		vi.clearAllMocks();
		process.chdir(cwd);
	});

	it("should use gitignore by default", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");

		// Mock rg and fzf processes
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") callback(0);
			}),
		};

		mockSpawn.mockImplementation((command) => {
			if (command === "rg")
				return mockRg as unknown as childProcess.ChildProcess;
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return {} as childProcess.ChildProcess;
		});

		await findFiles([testDir]);

		expect(mockSpawn).toHaveBeenCalledWith(
			"rg",
			expect.not.arrayContaining(["--no-ignore"]),
		);
	});

	it("should not use gitignore when USE_GITIGNORE is set to 0", async () => {
		process.env.USE_GITIGNORE = "0";
		const mockSpawn = vi.spyOn(childProcess, "spawn");

		// Mock rg and fzf processes
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") callback(0);
			}),
		};

		mockSpawn.mockImplementation((command) => {
			if (command === "rg")
				return mockRg as unknown as childProcess.ChildProcess;
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return {} as childProcess.ChildProcess;
		});

		await findFiles([testDir]);

		expect(mockSpawn).toHaveBeenCalledWith(
			"rg",
			expect.arrayContaining(["--no-ignore"]),
		);
	});

	it("should handle file type filtering", async () => {
		process.env.TYPE_FILTER = "ts:js";
		const mockSpawn = vi.spyOn(childProcess, "spawn");

		// Mock rg and fzf processes
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") callback(0);
			}),
		};

		mockSpawn.mockImplementation((command) => {
			if (command === "rg")
				return mockRg as unknown as childProcess.ChildProcess;
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return {} as childProcess.ChildProcess;
		});

		await findFiles([testDir]);

		expect(mockSpawn).toHaveBeenCalledWith(
			"rg",
			expect.arrayContaining(["--type", "ts", "--type", "js"]),
		);
	});

	it("should reject when fzf process exits with non-zero code", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");

		// Mock rg process
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };

		// Mock fzf process with non-zero exit code
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") {
					callback(1);
				}
			}),
		};

		mockSpawn.mockImplementation((command) => {
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return mockRg as unknown as childProcess.ChildProcess;
		});

		await expect(findFiles([testDir])).rejects.toThrow(
			"File selection canceled",
		);
	});
});

describe("liveGrep", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should handle errors", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");
		mockSpawn.mockImplementation(() => {
			throw new Error("Command failed");
		});

		await expect(liveGrep([process.cwd()], "searchText")).rejects.toThrow(
			"Command failed",
		);
	});
});
