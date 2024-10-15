# FindItFaster

[![CI pipeline - release](https://github.com/jellydn/vscode-finditfaster/actions/workflows/ci.yml/badge.svg?branch=release)](https://github.com/jellydn/vscode-finditfaster/actions?query=branch%3Amain)
![Platform support](<https://img.shields.io/badge/platform-macos%20%7C%20linux%20%7C%20windows%20(wsl)%20%7C%20windows%20powershell%20(experimental)-334488>)

Finds files and text within files, but faster than VS Code normally does.

Make sure to check the [Requirements](#requirements) below (TL;DR: have `fzf`, `rg`, `bat` and `node` on your
`PATH`).

## Default Key Bindings

- `cmd+shift+j` / `ctrl+shift+j`: Search files
- `cmd+shift+u` / `ctrl+shift+u`: Search for text within files
- `cmd+shift+ctrl+u` / `ctrl+shift+alt+u`: Search for text within files with type pre-filtering
- `cmd+shift+alt+f` / `ctrl+shift+alt+f`: Pick a file from git status
- `cmd+shift+alt+t` / `ctrl+shift+alt+t`: Find TODO/FIXME comments

You can change these using VS Code's keyboard shortcuts.

## Recommended Settings

```json
{
  // Setup FindItFaster extension
  "find-it-faster.customTasks": [
    // Choose folder to open on new window
    {
      "name": "zoxide",
      "command": "cursor $(zoxide query --interactive)"
    }
  ],
  // Allow top open a file with line number
  "find-it-faster.general.openCommand": "code -g"
}
```

## Features

This plugin is useful for:

- Very large projects with lots of files (which makes VS Code's search functionality quite slow)
- Users who love using `fzf` and `rg` and would like to bring those tools inside VS Code

The extension provides five main commands:

1. Search for files and open them
2. Search within files for text and open them
3. Search within files with file type pre-filtering
4. Pick file from git status
5. Find TODO/FIXME comments

## Demo

<details>
<summary>Search files</summary>

![Search Files Demo](https://raw.githubusercontent.com/jellydn/vscode-finditfaster/main/media/find_files.gif)

</details>

<details>
<summary>Search within files</summary>

![Search Within Files Demo](https://raw.githubusercontent.com/jellydn/vscode-finditfaster/main/media/find_within_files.gif)

</details>

<details>
<summary>Search within files with type pre-filtering</summary>

![Search Within Files with Filter Demo](https://raw.githubusercontent.com/jellydn/vscode-finditfaster/main/media/find_within_files_with_filter.gif)

</details>

<details>
<summary>Pick file from git status</summary>

![Pick File from Git Status Demo](https://i.gyazo.com/22c49d0ffdade4ba52d2cbf79c64990c.gif)

</details>

<details>
<summary>Find TODO/FIXME comments</summary>

![Find TODO/FIXME Demo](https://i.gyazo.com/d73a096b2bb48d1c8baee692097a5427.gif)

</details>

## Requirements

Ensure you can run `fzf`, `rg`, `bat`, and `sed` directly in your terminal. If those work, this plugin will work as expected.

- [`fzf` ("command-line fuzzy finder")](https://github.com/junegunn/fzf)
- [`rg` ("ripgrep")](https://github.com/BurntSushi/ripgrep)
- [`bat` ("a cat clone with wings")](https://github.com/sharkdp/bat)
- [`nodejs`](https://nodejs.dev) LTS

## Extension Settings

This extension contributes various settings. Please refer to the VS Code settings UI for a complete list and descriptions.

### Commands

<!-- commands -->

| Command                                  | Title                                                  |
| ---------------------------------------- | ------------------------------------------------------ |
| `find-it-faster.findFiles`               | Find It Faster: search file                            |
| `find-it-faster.findFilesWithType`       | Find It Faster: search file (with type filter)         |
| `find-it-faster.findWithinFiles`         | Find It Faster: search within files                    |
| `find-it-faster.findWithinFilesWithType` | Find It Faster: search within files (with type filter) |
| `find-it-faster.resumeSearch`            | Find It Faster: resume last search                     |
| `find-it-faster.pickFileFromGitStatus`   | Find It Faster: Pick file from git status              |
| `find-it-faster.findTodoFixme`           | Find It Faster: Find TODO/FIXME comments               |
| `find-it-faster.runCustomTask`           | Find It Faster: Run Custom Task                        |

<!-- commands -->

### Settings

<!-- configs -->

| Key                                                        | Description                                                                                                                 | Type      | Default                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- | ----- | ---- | ---------- |
| `find-it-faster.general.useGitIgnoreExcludes`              |                                                                                                                             | `boolean` | `true`                                                                                   |
| `find-it-faster.general.useWorkspaceSearchExcludes`        |                                                                                                                             | `boolean` | `true`                                                                                   |
| `find-it-faster.general.additionalSearchLocations`         |                                                                                                                             | `array`   | `[]`                                                                                     |
| `find-it-faster.general.additionalSearchLocationsWhen`     |                                                                                                                             | `string`  | `"always"`                                                                               |
| `find-it-faster.general.searchWorkspaceFolders`            |                                                                                                                             | `boolean` | `true`                                                                                   |
| `find-it-faster.general.searchCurrentWorkingDirectory`     |                                                                                                                             | `string`  | `"noWorkspaceOnly"`                                                                      |
| `find-it-faster.general.batTheme`                          |                                                                                                                             | `string`  | `"1337"`                                                                                 |
| `find-it-faster.general.openFileInPreviewEditor`           |                                                                                                                             | `boolean` | `false`                                                                                  |
| `find-it-faster.findFiles.showPreview`                     |                                                                                                                             | `boolean` | `true`                                                                                   |
| `find-it-faster.findFiles.previewCommand`                  |                                                                                                                             | `string`  | `""`                                                                                     |
| `find-it-faster.findFiles.previewWindowConfig`             |                                                                                                                             | `string`  | `""`                                                                                     |
| `find-it-faster.findWithinFiles.showPreview`               |                                                                                                                             | `boolean` | `true`                                                                                   |
| `find-it-faster.findWithinFiles.previewCommand`            |                                                                                                                             | `string`  | `""`                                                                                     |
| `find-it-faster.findWithinFiles.previewWindowConfig`       |                                                                                                                             | `string`  | `""`                                                                                     |
| `find-it-faster.findWithinFiles.fuzzRipgrepQuery`          |                                                                                                                             | `boolean` | `false`                                                                                  |
| `find-it-faster.advanced.useEditorSelectionAsQuery`        |                                                                                                                             | `boolean` | `true`                                                                                   |
| `find-it-faster.general.restoreFocusTerminal`              |                                                                                                                             | `boolean` | `false`                                                                                  |
| `find-it-faster.general.useTerminalInEditor`               |                                                                                                                             | `boolean` | `false`                                                                                  |
| `find-it-faster.general.shellPathForTerminal`              |                                                                                                                             | `string`  | `""`                                                                                     |
| `find-it-faster.pickFileFromGitStatus.showPreview`         |                                                                                                                             | `boolean` | `true`                                                                                   |
| `find-it-faster.pickFileFromGitStatus.previewCommand`      |                                                                                                                             | `string`  | `""`                                                                                     |
| `find-it-faster.pickFileFromGitStatus.previewWindowConfig` |                                                                                                                             | `string`  | `""`                                                                                     |
| `find-it-faster.findTodoFixme.previewEnabled`              | Enable preview for TODO/FIXME search results                                                                                | `boolean` | `true`                                                                                   |
| `find-it-faster.findTodoFixme.previewCommand`              | Preview command for TODO/FIXME search results                                                                               | `string`  | `"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid"` |
| `find-it-faster.findTodoFixme.previewWindowConfig`         | Preview window configuration for TODO/FIXME search results                                                                  | `string`  | `"right:border-left:50%:+{2}+3/3:~3"`                                                    |
| `find-it-faster.findTodoFixme.searchPattern`               | Regular expression pattern for searching TODO/FIXME/HACK comments. Matches keywords followed by a colon and optional space. | `string`  | `"(TODO                                                                                  | FIXME | HACK | FIX):\\s"` |
| `find-it-faster.customTasks`                               | Custom tasks that can be executed by the extension                                                                          | `array`   | `[]`                                                                                     |
| `find-it-faster.general.openCommand`                       | CLI command to open files. Use 'code' for VS Code, 'cursor' for Cursor, or any other custom command.                        | `string`  | `"code -g"`                                                                              |

<!-- configs -->

## FAQ

Please refer to the [FAQ.md](FAQ.md) file for known issues and frequently asked questions.

## Contributing

For information on contributing fixes and features, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Release Notes

For detailed release notes, please see the [CHANGELOG.md](CHANGELOG.md) file.
