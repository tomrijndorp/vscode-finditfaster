# Frequently Asked Questions (FAQ)

## How do I control the fuzzy finder view?

Whatever defaults are present on your system (and read by VS Code) are used. For `fzf`, this means <Ctrl+K> moves the selection up, <Ctrl+J> moves down, and <Enter> selects. You can also use the up and down arrows. <TAB> for multiple select when available. Read the `fzf` [documentation](https://github.com/junegunn/fzf#readme) to learn more.

## I'm on Linux and I can't use Ctrl+K to navigate upwards in `fzf`.

Probably VS Code is waiting for you to complete a multi-step keyboard shortcut (chord). Change the following setting in your preferences to disable chords:

```
"terminal.integrated.allowChords": false
```

## I found a bug!

Please file a Github issue. Provide detailed information including:

- OS
- VS Code version
- Does it happen after you reset to default settings (if relevant)?
- Anything special about your configuration / workspace
