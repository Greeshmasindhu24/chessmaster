# ChessMaster Pro - start frontend (Windows)
# Usage: .\run_frontend.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ProjectRoot "frontend"
$EnvLocal = Join-Path $FrontendDir ".env.local"

Write-Host "ChessMaster Pro - frontend" -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Running npm install..."
    Push-Location $FrontendDir
    & npm install
    Pop-Location
}

# Ensure local env file exists and does not point at Render (CORS breaks sign-in from localhost).
if (-not (Test-Path $EnvLocal)) {
    @(
        "# Created by run_frontend.ps1 — leave VITE_API_URL empty for Vite proxy."
        "VITE_API_URL="
    ) | Set-Content -Path $EnvLocal -Encoding utf8
    Write-Host "Created frontend/.env.local (VITE_API_URL empty)" -ForegroundColor Green
}
elseif (Select-String -Path $EnvLocal -Pattern 'VITE_API_URL\s*=\s*https?://' -Quiet) {
    Write-Host "WARNING: frontend/.env.local sets VITE_API_URL to a remote host." -ForegroundColor Yellow
    Write-Host "         Local dev will still use the Vite proxy on localhost (see src/config/apiUrl.ts)." -ForegroundColor Yellow
}

# Force empty for this process (npm run dev also reads .env.development / .env.local).
$env:VITE_API_URL = ""

Write-Host ""
Write-Host "API URL:  (Vite proxy -> http://127.0.0.1:8001)" -ForegroundColor DarkGray
Write-Host "Open:     http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  run .\run_backend.ps1 in another terminal (port 8001)" -ForegroundColor DarkGray
Write-Host "If sign-in still fails, stop ALL Vite/node windows and run this script again." -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Push-Location $FrontendDir
& npm run dev
