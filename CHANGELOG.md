# Change Log

All notable changes to the "FindItFaster" extension will be documented in this file.

## [0.3.0]

- Added new "Custom Tasks" feature
  - Supports task configuration through settings
  - Executes selected tasks and displays output in VS Code

## [0.2.0]

- Added new "Find TODO/FIXME comments" feature
  - Searches for TODO, FIXME, HACK, and FIX comments in your project
  - Uses `fzf` and `rg` for fast and interactive searching
  - Supports both Unix-based systems (macOS, Linux) and Windows
  - Customizable search pattern through settings
  - Preview window support for quick code inspection
- Improved Windows support for all features

## [0.1.0]

- Added new command: "Pick file from git status"
  - Allows you to select files from the git status output using `fzf`
  - New default keybinding:
    - On macOS: Cmd+Shift+Alt+F
    - On Linux and Windows: Ctrl+Shift+Alt+F
- Added new configuration options for "Pick file from git status"
- Add custom logger for the extension

[For earlier versions, please refer to the original repository's release notes.]

https://github.com/tomrijndorp/vscode-finditfaster#release-notes
