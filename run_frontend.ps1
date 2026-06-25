# ChessMaster Pro - start frontend (Windows)
# Usage: .\run_frontend.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ProjectRoot "frontend"

Write-Host "ChessMaster Pro - frontend" -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Running npm install..."
    Push-Location $FrontendDir
    & npm install
    Pop-Location
}

Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "API URL:  (Vite proxy -> http://127.0.0.1:8001)" -ForegroundColor DarkGray
Write-Host "Starting Vite on http://localhost:5173 (see below if port is in use)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Push-Location $FrontendDir
& npm run dev
