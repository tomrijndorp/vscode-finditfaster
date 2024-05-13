Write-Host "Pre-Flight check:"
Write-Host "-----------------"

function InPath($tool) {
    Write-Host "${tool}: " -NoNewline
    if ($null -eq (Get-Command "$tool" -ErrorAction SilentlyContinue)) 
    { 
        Write-Host "not installed"
    } else {
        Write-Host "installed"
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