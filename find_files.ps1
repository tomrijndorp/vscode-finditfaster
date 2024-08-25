


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
                $ARR+="'$ENTRY'"
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

$PREVIEW_ENABLED=VGet "env:FIND_FILES_PREVIEW_ENABLED" 0
$PREVIEW_COMMAND=VGet "env:FIND_FILES_PREVIEW_COMMAND"  'bat --decorations=always --color=always --plain {}'
$PREVIEW_WINDOW=VGet "env:FIND_FILES_PREVIEW_WINDOW_CONFIG" 'right:50%:border-left'
$HAS_SELECTION=VGet "env:HAS_SELECTION" 0
$SELECTION_FILE=VGet "env:SELECTION_FILE" ""
$QUERY=""
if ($HAS_SELECTION -eq 1 -and "$SELECTION_FILE".Length -gt 0) {
    $QUERY="`"$(Get-Content "$SELECTION_FILE" -Raw)`""
}

$fzf_command = "fzf --cycle --multi"
if ("$QUERY".Length -gt 0) {
    $fzf_command+=" --query"
    $fzf_command+=" "
    $fzf_command+="${QUERY}"
}

if ( $PREVIEW_ENABLED -eq 1){
    $fzf_command+=" --preview '$PREVIEW_COMMAND' --preview-window $PREVIEW_WINDOW"
} 

$expression = "rg --files --hidden $USE_GITIGNORE_OPT --glob '!**/.git/' $GLOBS $TYPE_FILTER_ARR $PATHS" + " | " + $fzf_command
$result = Invoke-Expression( $expression )

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
