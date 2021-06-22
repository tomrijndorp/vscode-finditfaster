# FindItFaster
Finds it, but faster. Make sure to check the [requirements](#requirements) below.

<hr />

## Features
This plugin is useful if you deal with very large projects with lots of files (which makes VS Code's
search functionality quite slow), or when you simply love using `fzf` and `rg` and would like to
bring those tools inside VS Code, similar to how the excellent `fzf.vim` plugin works for Vim.

This extension exposes two commands:
1. Search for files and open them. Uses a combination of `fzf`, `rg`, and `bat`.
2. Search within files for text and open them. Uses of combination of `fzf`, `rg`, and `bat`.

This extension has also been tested on remote workspaces (e.g. SSH sessions).

<hr />

<a name="requirements"></a>
## Requirements

This plugin opens a terminal inside VS Code. Make sure that you can run `fzf`, `rg`, and `bat` by
running these commands directly in your terminal. If those work, this plugin will work as expected.

If you're not familiar with these command line tools, you might want to check them out. They are
awesome tools that can be individually used and make you more productive. And when combined such as
in this extension, they're amazing. They're available for many platforms and easy to install using
package managers or by installing a simple binary.

- [`fzf` ("command-line fuzzy finder")](https://github.com/junegunn/fzf)
- [`rg` ("ripgrep")](https://github.com/BurntSushi/ripgrep)
- [`bat` ("a cat clone with wings")](https://github.com/sharkdp/bat)

I have no affiliation with any of these tools, but hugely appreciate them, and wanted to bring them
into a VS Code context.

<hr />

## Extension Settings

See the settings for this extension in the GUI.  
You might want to play with `fzf`, `rg` and `bat` on the command line and read their manuals in
order to get a better understanding of some of the settings in this extension. It will be worth
your time.

<hr />

## Known Issues

**See the GUI settings**. VS Code has limited API functionality around how we can manage the
terminal panel, so things are not _quite_ as polished as they could be in terms of managing e.g.
editor focus, but it's close.

**Not tested on Windows**. Likely won't work. I don't know enough about WSL to tell you whether this
could work. If you want to contribute, this would be an awesome place to do it.  

**Older `fzf` versions**. In order to limit some complexity, we ignore some user settings for the
"Find Within Files" command when your `fzf` version is less than 0.26. Things will still work
decently well though and this shouldn't affect most users.

<hr />

## Planned features
- Support for remote sessions: ssh (definitely), docker, codespaces (if it's little overhead)
- See if it's possible to ignore the same files the project settings ignore

## FAQ

### 🕹 _How do I control the fuzzy finder view?_
➥ Whatever defaults are present on your system (and read by VS Code) are used. For `fzf`, this means
&lt;Ctrl+K&gt; moves the selection up, &lt;Ctrl+J&gt; moves down, and &lt;Enter&gt; selects. You can
also use the up and down arrows if that's your thing. &lt;TAB&gt; for multiple select when
available. Read the excellent `fzf` [documentation](https://github.com/junegunn/fzf#readme) to learn
more about using `fzf`.

### 🐞 _I found a bug!_  
➥ Yeah, that's not unlikely. There are a lot of edge cases with this sort of tooling. Three options:
  1. Shrug :)
  2. File a Github issue. Please give detailed information as the devil is in the details. Please
     provide at least:
     - OS
     - VS Code version
     - Does it happen after you reset to default settings (if relevant)?
     - Anything special about your configuration / workspace. Did you have spaces in there? Is it
       on a network share or some other thing I definitely didn't test? Did you modify the extension
       settings?
  3. Create a fix and open a PR. If it's a straightforward fix that doesn't require a lot of testing
     on my side, I'll probably merge it. Please don't underestimate the amount of testing I need to
     do even for a trivial fix, and consider that this is just a tiny side project for me. I might
     not respond that quickly.

### 🖥 _Can I use the scripts you probably run in this extension on the command line, outside of VS Code?_  
➥ You can, actually. Perhaps the easiest thing you can do is give them a more convenient name, so
  you can easily get to them. For instance, you could create a symlink called `fif` (Find In Files)
  somewhere on your `PATH`. Example (you'll need to look up where VS Code stores your extensions!):
  ```bash
  ln -s ~/.vscode/extensions/<PLUGIN_NAME.VERSION>/find_files.sh /usr/local/bin/fif
  ```
  Or copy them, remix, and make your own, of course. These scripts were heavily inspired by
  documentation on `fzf`, `rg`, and `bat` in the first place! Note: these scripts are currently
  really only 50% written with the idea in mind, so you have to know some bash scripting in order
  to get this to work. And really, when you strip out all the VS Code logic, there's not that much
  left.

### 💩 _I don't like `fzf` / `rg` / `bat`. Can I just use `find`, `grep`, and `cat` or something else?_  
➥ This is not impossible for me to do, but realistically, there's little value to it. The experience
  will never be quite as good, and won't be as performant either.  
  `rg` especially is a beast that outperforms `grep` and even tools like `ag`. Give them a try.
  Plus, not supporting additional tools means more time to make this extension better and fewer
  opportunities for creating bugs. You can file a Github issue and see if there's support for it,
  but unless people _really_ want this it's unlikely I'll support it.

### 🧘 _Can you give focus back to my editor / my problems panel / other?_
➥ I don't the VS Code API enables me to do this. Shoot me a message if you think I'm mistaken and
  I'll try to make this better.

### ⬆️ _I'm on Linux and I can't use Ctrl+K to navigate upwards in `fzf`._
➥ Probably VS Code is waiting for you to complete a multi-step keyboard shortcut (chord). Change the
  following setting in your preferences to disable chords:
  ```
  "terminal.integrated.allowChords": false
  ```

### 🎄 <i>I'd like to customize this tool a little but I need access to &lt;insert something here&gt;. Can you expose that?</i>  
➥ I probably can. Maybe create a Github issue and ask for it? Especially if other people vote on it,
  that would be a compelling argument to do it.

### 🪚 _Can I  build in a feature myself / contribute in some way?_
➥ To minimize redundancy, have a look at `CONTRIBUTING.md`.

<hr />

## Release Notes

### 0.0.1
You gotta start somewhere!

Tested on these configurations:

**Mac OS**:
```
OS         : Darwin 20.1.0 (MacOS Big Sur 11.0.1)
bat version: bat 0.18.0
fzf version: 0.27.1 (brew)
rg version : ripgrep 13.0.0
```

**Linux**:
```
OS         : Linux 5.8.0-55-generic (Ubuntu 20.04)
bat version: bat 0.12.1
fzf version: 0.20.0
rg version : ripgrep 12.1.1 (rev 7cb211378a)
```