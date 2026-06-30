# ChessMaster Pro - start backend (Windows, no Docker)
# Usage: .\run_backend.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ProjectRoot "backend"
$VenvPython  = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvPip     = Join-Path $BackendDir ".venv\Scripts\pip.exe"
$EnvFile     = Join-Path $ProjectRoot ".env"

function Resolve-PythonLauncher {
    foreach ($ver in @("3.13", "3.12")) {
        try {
            $null = & py "-$ver" --version 2>&1
            if ($LASTEXITCODE -eq 0) { return "py -$ver" }
        }
        catch { }
    }
    throw "Python 3.12 or 3.13 not found."
}

Write-Host "ChessMaster Pro - backend" -ForegroundColor Cyan

if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") $EnvFile
    Write-Host "Created .env from .env.example" -ForegroundColor Yellow
}

$pyLauncher = Resolve-PythonLauncher

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating virtual environment..."
    Push-Location $BackendDir
    Invoke-Expression "$pyLauncher -m venv .venv"
    Pop-Location
}

Write-Host "Installing dependencies..."
Push-Location $BackendDir
& $VenvPip install -q -r requirements.txt
Pop-Location

@("data", "uploads", "stockfish") | ForEach-Object {
    $dir = Join-Path $ProjectRoot $_
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

if (-not $env:SQLITE_DATABASE_URL -and -not $env:DATABASE_URL) {
    $env:SQLITE_DATABASE_URL = "sqlite+aiosqlite:///./data/chessmaster.db"
}
if (-not $env:REDIS_ENABLED) { $env:REDIS_ENABLED = "false" }
if (-not $env:SECRET_KEY) { $env:SECRET_KEY = "dev-secret-change-in-production" }
if (-not $env:DEBUG) { $env:DEBUG = "true" }
if (-not $env:CORS_ORIGINS) { $env:CORS_ORIGINS = '["http://localhost:5173","http://127.0.0.1:5173","http://localhost:5174","http://127.0.0.1:5174","http://localhost:3000","http://127.0.0.1:3000"]' }

Write-Host ""
if ($env:SQLITE_DATABASE_URL) {
    $dbDisplay = $env:SQLITE_DATABASE_URL
} elseif ($env:DATABASE_URL) {
    $dbDisplay = $env:DATABASE_URL
} else {
    $dbDisplay = "sqlite+aiosqlite:///./data/chessmaster.db"
}
Write-Host "Database: $dbDisplay" -ForegroundColor DarkGray
Write-Host "Cache:    in-memory (set REDIS_ENABLED=true and REDIS_URL for Redis)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Starting uvicorn on http://localhost:8001" -ForegroundColor Cyan
Write-Host "Health:   http://localhost:8001/health" -ForegroundColor Cyan
Write-Host "          http://localhost:8001/api/v1/health" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Push-Location $BackendDir
& $VenvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
