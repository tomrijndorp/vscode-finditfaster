
Write-Host "Pre-Flight check:"
Write-Host "-----------------"

function InPath($tool) {
    Write-Host "which ${tool}: " -NoNewline
    if ((Get-Command "$tool" -ErrorAction SilentlyContinue) -eq $null) 
    { 
        Write-Host "undefined"
    } else {
        Write-Host "found"
    }
}

Write-Host "Checking you have the required command line tools installed..." -ForegroundColor Cyan
InPath "bat"
InPath "fzf"
InPath "rg"
Write-Host "-----------------"

#echo "Checking versions of the installed command line tools..."
#echo "bat version: $(bat --version)"
#echo "fzf version: $(fzf --version)"
#echo "rg version: $(rg --version)"
#echo "-----------------"

echo "OK"