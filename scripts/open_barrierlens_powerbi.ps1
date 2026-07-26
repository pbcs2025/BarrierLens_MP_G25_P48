# Open BarrierLens Power BI project
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Pbip = Join-Path $ProjectRoot "powerbi\BarrierLens.pbip"

Write-Host "Building Power BI tables and project..."
python (Join-Path $ProjectRoot "scripts\generate_powerbi_project.py")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$PbiPaths = @(
    "${env:ProgramFiles}\Microsoft Power BI Desktop\bin\PBIDesktop.exe",
    "${env:ProgramFiles(x86)}\Microsoft Power BI Desktop\bin\PBIDesktop.exe",
    "${env:LOCALAPPDATA}\Microsoft\WindowsApps\PBIDesktop.exe"
)

$Pbi = $PbiPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($Pbi) {
    Write-Host "Opening Power BI Desktop -> $Pbip"
    Start-Process -FilePath $Pbi -ArgumentList "`"$Pbip`""
} else {
    Write-Host ""
    Write-Host "Power BI Desktop is NOT installed."
    Write-Host "Install from: https://aka.ms/pbidesktop"
    Write-Host "Or run:  winget install --id Microsoft.PowerBI -e"
    Write-Host ""
    Write-Host "After install, double-click:"
    Write-Host "  $Pbip"
}
