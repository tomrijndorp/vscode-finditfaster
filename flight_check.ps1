Write-Host "Pre-Flight check:"
Write-Host "-----------------"

Write-Host "Checking your OS version..."
Write-Host ("OS: " + ([Environment]::OSVersion."VersionString"))
Write-Host "-----------------"

function InPath($tool, $toolAlias = $false) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue) -and ($toolAlias -ne $false) -and !(Get-Command $toolAlias -ErrorAction SilentlyContinue)) {
        Write-Host "$($tool): not installed" -ForegroundColor Red
    } else {
        Write-Host "$($tool): installed" -ForegroundColor Green
    }
}

Write-Host "Checking you have the required command line tools installed..." -ForegroundColor Cyan
InPath "bat"
InPath "fzf"
InPath "rg"
Write-Host "-----------------"

Write-Host "Checking versions of the installed command line tools..."
Write-Host "bat version: $(bat --version)"
Write-Host "fzf version: $(fzf --version)"
Write-Host "rg version: $(rg --version)"
Write-Host "-----------------"

Write-Host "OK"
