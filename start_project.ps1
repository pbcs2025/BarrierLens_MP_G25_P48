# BarrierLens P48 - Startup Script
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Starting BarrierLens P48 Healthcare Access Research Platform     " -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$pythonPath = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonPath = (Get-Command python).Source
} elseif (Test-Path "venv\Scripts\python.exe") {
    $pythonPath = "venv\Scripts\python.exe"
} elseif (Test-Path ".venv\Scripts\python.exe") {
    $pythonPath = ".venv\Scripts\python.exe"
}

# 1. Start Python Flask API Backend
if ($pythonPath) {
    Write-Host "[1/2] Starting Flask Backend on port 5000 using $pythonPath..." -ForegroundColor Green
    Start-Process -FilePath $pythonPath -ArgumentList "backend\app.py" -WindowStyle Minimized
} else {
    Write-Host "[1/2] Python not found; continuing with dashboard..." -ForegroundColor Yellow
}

# 2. Open default browser on the BarrierLens login / landing page
Start-Sleep -Seconds 1
Write-Host "[2/2] Opening BarrierLens Login at http://localhost:3000/login.html ..." -ForegroundColor Green
Start-Process "http://localhost:3000/login.html"

# 3. Start Node.js Web Server in foreground
node server.js
