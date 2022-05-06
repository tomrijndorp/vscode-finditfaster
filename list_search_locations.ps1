
$PATHS=$args

clear
Write-Host "----------"
Write-Host "The following files are on your search path:" -ForegroundColor Cyan
foreach ($P in $PATHS) {
    Write-Host "- $P"
}
$fc=Get-Content "$Env:EXPLAIN_FILE" -Raw
Write-Host ""
Write-Host "$fc"
Write-Host "----------"
Write-Host ""
Write-Host "All these paths are configurable. If you are expecting a path but not seeing it here,"
Write-Host "it may be turned off in the settings.\n\n"