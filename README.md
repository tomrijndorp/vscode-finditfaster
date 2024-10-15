<h1 align="center">Welcome to fzf-picker 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.5.2-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/vscode-%5E1.92.0-blue.svg" />
  <a href="https://github.com/jellydn/vscode-fzf-picker#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/jellydn/vscode-fzf-picker/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
</p>

> File Picker with fzf and rg

## Prerequisites

- vscode ^1.92.0
- fzf
- rg
- bat
- node

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
  "fzf-picker.customTasks": [
    // Choose folder to open on new window
    {
      "name": "zoxide",
      "command": "cursor $(zoxide query --interactive)"
    }
  ],
  // Allow top open a file with line number
  "fzf-picker.general.openCommand": "code -g"
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

| Command                              | Title                                                  |
| ------------------------------------ | ------------------------------------------------------ |
| `fzf-picker.findFiles`               | Find It Faster: search file                            |
| `fzf-picker.findFilesWithType`       | Find It Faster: search file (with type filter)         |
| `fzf-picker.findWithinFiles`         | Find It Faster: search within files                    |
| `fzf-picker.findWithinFilesWithType` | Find It Faster: search within files (with type filter) |
| `fzf-picker.resumeSearch`            | Find It Faster: resume last search                     |
| `fzf-picker.pickFileFromGitStatus`   | Find It Faster: Pick file from git status              |
| `fzf-picker.findTodoFixme`           | Find It Faster: Find TODO/FIXME comments               |
| `fzf-picker.runCustomTask`           | Find It Faster: Run Custom Task                        |

<!-- commands -->

### Settings

<!-- configs -->

| Key                                                    | Description                                                                                                                 | Type      | Default                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `fzf-picker.general.useGitIgnoreExcludes`              |                                                                                                                             | `boolean` | `true`                                                                                   |
| `fzf-picker.general.useWorkspaceSearchExcludes`        |                                                                                                                             | `boolean` | `true`                                                                                   |
| `fzf-picker.general.additionalSearchLocations`         |                                                                                                                             | `array`   | `[]`                                                                                     |
| `fzf-picker.general.additionalSearchLocationsWhen`     |                                                                                                                             | `string`  | `"always"`                                                                               |
| `fzf-picker.general.searchWorkspaceFolders`            |                                                                                                                             | `boolean` | `true`                                                                                   |
| `fzf-picker.general.searchCurrentWorkingDirectory`     |                                                                                                                             | `string`  | `"noWorkspaceOnly"`                                                                      |
| `fzf-picker.general.batTheme`                          |                                                                                                                             | `string`  | `"1337"`                                                                                 |
| `fzf-picker.general.openFileInPreviewEditor`           |                                                                                                                             | `boolean` | `false`                                                                                  |
| `fzf-picker.findFiles.showPreview`                     |                                                                                                                             | `boolean` | `true`                                                                                   |
| `fzf-picker.findFiles.previewCommand`                  |                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.findFiles.previewWindowConfig`             |                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.showPreview`               |                                                                                                                             | `boolean` | `true`                                                                                   |
| `fzf-picker.findWithinFiles.previewCommand`            |                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.previewWindowConfig`       |                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.fuzzRipgrepQuery`          |                                                                                                                             | `boolean` | `false`                                                                                  |
| `fzf-picker.advanced.useEditorSelectionAsQuery`        |                                                                                                                             | `boolean` | `true`                                                                                   |
| `fzf-picker.general.restoreFocusTerminal`              |                                                                                                                             | `boolean` | `false`                                                                                  |
| `fzf-picker.general.useTerminalInEditor`               |                                                                                                                             | `boolean` | `false`                                                                                  |
| `fzf-picker.general.shellPathForTerminal`              |                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.pickFileFromGitStatus.showPreview`         |                                                                                                                             | `boolean` | `true`                                                                                   |
| `fzf-picker.pickFileFromGitStatus.previewCommand`      |                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.pickFileFromGitStatus.previewWindowConfig` |                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.findTodoFixme.previewEnabled`              | Enable preview for TODO/FIXME search results                                                                                | `boolean` | `true`                                                                                   |
| `fzf-picker.findTodoFixme.previewCommand`              | Preview command for TODO/FIXME search results                                                                               | `string`  | `"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid"` |
| `fzf-picker.findTodoFixme.previewWindowConfig`         | Preview window configuration for TODO/FIXME search results                                                                  | `string`  | `"right:border-left:50%:+{2}+3/3:~3"`                                                    |
| `fzf-picker.findTodoFixme.searchPattern`               | Regular expression pattern for searching TODO/FIXME/HACK comments. Matches keywords followed by a colon and optional space. | `string`  | `"(TODO|FIXME|HACK|FIX):\\s"`                                                            |
| `fzf-picker.customTasks`                               | Custom tasks that can be executed by the extension                                                                          | `array`   | `[]`                                                                                     |
| `fzf-picker.general.openCommand`                       | CLI command to open files. Use 'code' for VS Code, 'cursor' for Cursor, or any other custom command.                        | `string`  | `"code -g"`                                                                              |

<!-- configs -->

## FAQ

Please refer to the [FAQ.md](FAQ.md) file for known issues and frequently asked questions.

## Contributing

For information on contributing fixes and features, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Release Notes

For detailed release notes, please see the [CHANGELOG.md](CHANGELOG.md) file.
