
trap
{
    # If we except, lets report it visually. Can help with debugging if there IS a problem
    # in here.
    Write-Host "EXCEPTION: $($PSItem.ToString())" -ForegroundColor Red
    Write-Host "$($PSItem.ScriptStackTrace)"
    Start-Sleep 10
}

# Get an environment variable with default value if not present
function VGet($varname, $default) {
    if (Test-Path "$varname") {
        $val = (Get-Item $varname).Value
        if ("$val".Length -gt 0) {
            return $val
        }
    } 
    return $default
}

# Get an array as an option separated list of values --glob x --glob y etc...
function VOptGet($varname,$opt) {
    $ARR=@()
    $DATA=(VGet "$varname" "")
    if ("$DATA".Length -gt 0) {
        $DATA = $DATA.Split(":")
        foreach ($ENTRY in $DATA) {
            if ("$ENTRY".Length -gt 0) {
                $ARR+=" $opt "
                $ARR+="`"$ENTRY`""
            }
        }
    }
    return $ARR
}

$USE_GITIGNORE_OPT=""
if ( (VGet "env:USE_GITIGNORE" 0) -eq 0) {
    $USE_GITIGNORE_OPT="--no-ignore"
}

$TYPE_FILTER_ARR=VOptGet "env:TYPE_FILTER" "--type"
$GLOBS=VOptGet "env:GLOBS" "--glob"

# If we only have one directory to search, invoke commands relative to that directory
$PATHS=$args
$SINGLE_DIR_ROOT=""
if ($PATHS.Count -eq 1) {
    $SINGLE_DIR_ROOT=$PATHS[0]
    if ( -not (Test-Path "$SINGLE_DIR_ROOT")) {
        Write-Host "Failed to push into: $SINGLE_DIR_ROOT" -ForegroundColor Red
        exit 1
    }
    Push-Location "$SINGLE_DIR_ROOT"
    $PATHS=""
}

# 1. Search for text in files using Ripgrep
# 2. Interactively restart Ripgrep with reload action
# 3. Open the file
$RG_PREFIX="rg "`
    + "--column "`
    + "--hidden "`
    + "$USE_GITIGNORE_OPT "`
    + "--line-number "`
    + "--no-heading "`
    + "--color=always "`
    + "--smart-case "`
    + "--colors `"match:fg:green`" "`
    + "--colors `"path:fg:white`" "`
    + "--colors `"path:style:nobold`" "`
    + "--glob `"!**/.git/`" "`
    + "$GLOBS"

if ($TYPE_FILTER_ARR.Count -gt 0) {
    $RG_PREFIX+="$TYPE_FILTER_ARR"
}
#RG_PREFIX+=(" 2> /dev/null")
$PREVIEW_ENABLED=VGet "env:FIND_WITHIN_FILES_PREVIEW_ENABLED" 0
$PREVIEW_COMMAND=VGet "env:FIND_WITHIN_FILES_PREVIEW_COMMAND"  'bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid'
$PREVIEW_WINDOW=VGet "env:FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG" 'right:border-left:50%:+{2}+3/3:~3'
$HAS_SELECTION=VGet "env:HAS_SELECTION" 0
$SELECTION_FILE=VGet "env:SELECTION_FILE" ""
# We match against the beginning of the line so everything matches but nothing gets highlighted...
$QUERY="`"^`""
$INITIAL_QUERY=""  # Don't show initial "^" regex in fzf
if ($HAS_SELECTION -eq 1 -and "$SELECTION_FILE".Length -gt 0) {
    # ... or against the selection if we have one
    $QUERY="`"$(Get-Content "$SELECTION_FILE" -Raw)`""
    $INITIAL_QUERY="$QUERY" # Do show the initial query when it's not "^"
}

$FZF_CMD="$RG_PREFIX $QUERY $PATHS"
Write-Host "$FZF_CMD"
$Env:FZF_DEFAULT_COMMAND="$FZF_CMD"

$QUERYPARAM=""
if ("$INITIAL_QUERY".Length -gt 0) {
    $QUERYPARAM="--query"
}

if( $QUERYPARAM -ne "" )   
{
    if($PREVIEW_ENABLED -eq 1) {
        # I can't get it not to report an error || true trick doesn't work in powershell.
        # $ErrorActionPreference="SilentlyContinue";
        $result=fzf --delimiter ":" --phony "$QUERYPARAM" "$INITIAL_QUERY" --ansi --cycle --bind "change:reload:powershell -m Start-Sleep .1; $RG_PREFIX {q} $PATHS; ''" --preview "$PREVIEW_COMMAND" --preview-window "$PREVIEW_WINDOW"
    } else {
        $result=fzf --delimiter ":" --phony "$QUERYPARAM" "$INITIAL_QUERY" --ansi --cycle --bind "change:reload:powershell -m Start-Sleep .1; $RG_PREFIX {q} $PATHS; ''" 
    }   
} else {
    if($PREVIEW_ENABLED -eq 1) {
        $result=fzf --delimiter ":" --ansi --cycle --bind "change:reload:powershell -m Start-Sleep .1; $RG_PREFIX {q} $PATHS; ''" --preview "$PREVIEW_COMMAND" --preview-window "$PREVIEW_WINDOW"
    } else {
        $result=fzf --delimiter ":" --ansi --cycle --bind "change:reload:powershell -m Start-Sleep .1; $RG_PREFIX {q} $PATHS; ''" 
    }
}

# Output is filename, line number, character, contents
if ("$result".Length -lt 1) {
    Write-Host canceled
    "1" | Out-File -FilePath "$Env:CANARY_FILE" -Encoding UTF8
    exit 1
} else {
    if ("$SINGLE_DIR_ROOT".Length -gt 0) {
       Join-Path -Path "$SINGLE_DIR_ROOT" -ChildPath "$result" | Out-File -FilePath "$Env:CANARY_FILE" -Encoding UTF8
    } else {
        $result | Out-File -FilePath "$Env:CANARY_FILE" -Encoding UTF8       
    }
}