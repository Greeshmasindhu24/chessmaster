# ChessMaster Pro - start backend on Windows (no Docker/WSL)
# Usage: .\scripts\start-windows.ps1
# Prefer run_backend.ps1 at project root for the default SQLite + in-memory setup.
# See docs/WINDOWS-NO-WSL.md for full setup.

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir  = Join-Path $ProjectRoot "backend"
$VenvPython  = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvPip     = Join-Path $BackendDir ".venv\Scripts\pip.exe"
$DocRelPath  = "docs\WINDOWS-NO-WSL.md"
$DocFullPath = Join-Path $ProjectRoot $DocRelPath
$EnvFile     = Join-Path $ProjectRoot ".env"

function Write-SetupError {
    param([string]$Message)
    Write-Host ""
    Write-Host "ERROR: $Message" -ForegroundColor Red
    Write-Host ""
    Write-Host "Setup guide: $DocFullPath" -ForegroundColor Yellow
    Write-Host "Quick start: .\setup-windows.ps1 then .\run_backend.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

function Test-TcpPort {
    param(
        [int]$Port,
        [string]$HostName = "127.0.0.1"
    )
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async  = $client.BeginConnect($HostName, $Port, $null, $null)
        $ok     = $async.AsyncWaitHandle.WaitOne(1500, $false)
        if ($ok -and $client.Connected) {
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    }
    catch {
        return $false
    }
}

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

function Get-DatabasePort {
    if ($env:DATABASE_URL -match '@[^/]+:(\d+)/') {
        return [int]$Matches[1]
    }
    return 5433
}

Write-Host "ChessMaster Pro - Windows backend starter" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") $EnvFile
}

try {
    $pyLauncher = Resolve-PythonLauncher
    $pyVersion = Invoke-Expression "$pyLauncher --version"
    Write-Host "  OK: $pyVersion" -ForegroundColor Green
}
catch {
    Write-SetupError "Python 3.12 or 3.13 not found. Install from https://www.python.org/downloads/"
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating virtual environment in backend\.venv ..."
    Push-Location $BackendDir
    Invoke-Expression "$pyLauncher -m venv .venv"
    Pop-Location
}

Write-Host "Installing/updating Python dependencies..."
Push-Location $BackendDir
& $VenvPip install -q -r requirements.txt
Pop-Location

$useSqlite = $true
if ($env:DATABASE_URL -and -not $env:SQLITE_DATABASE_URL) {
    $useSqlite = $false
}

if ($useSqlite -and -not $env:SQLITE_DATABASE_URL) {
    $env:SQLITE_DATABASE_URL = "sqlite+aiosqlite:///./data/chessmaster.db"
}
if (-not $env:REDIS_ENABLED) {
    $env:REDIS_ENABLED = "false"
}
if (-not $env:SECRET_KEY) {
    $env:SECRET_KEY = "dev-secret-change-in-production"
}
if (-not $env:DEBUG) {
    $env:DEBUG = "true"
}
if (-not $env:CORS_ORIGINS) {
    $env:CORS_ORIGINS = '["http://localhost:5173","http://localhost:3000"]'
}

@("data", "uploads", "stockfish") | ForEach-Object {
    $dir = Join-Path $ProjectRoot $_
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

Write-Host ""
Write-Host "Preflight checks..."

if ($useSqlite) {
    Write-Host "  Database: SQLite ($($env:SQLITE_DATABASE_URL))" -ForegroundColor Green
    Write-Host "  Cache:    in-memory (REDIS_ENABLED=false)" -ForegroundColor Green
}
else {
    $dbPort = Get-DatabasePort
    Write-Host "  DATABASE_URL port: $dbPort"

    $pgOk = Test-TcpPort -Port $dbPort
    if (-not $pgOk -and $dbPort -eq 5433) {
        Write-Host "  Port 5433 closed - trying PostgreSQL on 5432..." -ForegroundColor Yellow
        if (Test-TcpPort -Port 5432) {
            $env:DATABASE_URL = "postgresql+asyncpg://chess:chess@localhost:5432/chessmaster"
            $dbPort = 5432
            $pgOk = $true
            Write-Host "  Using PostgreSQL on port 5432" -ForegroundColor Yellow
        }
    }

    if (-not $pgOk) {
        Write-SetupError "PostgreSQL is not reachable on port $dbPort. Use SQLite (default in .env.example) or create database chessmaster."
    }

    Write-Host "  PostgreSQL: reachable" -ForegroundColor Green

    if ($env:REDIS_ENABLED -eq "true" -and $env:REDIS_URL) {
        $redisPort = 6380
        if ($env:REDIS_URL -match ':(\d+)/') {
            $redisPort = [int]$Matches[1]
        }
        if (-not (Test-TcpPort -Port $redisPort)) {
            Write-Host "  Redis not reachable — falling back to in-memory cache at runtime" -ForegroundColor Yellow
            $env:REDIS_ENABLED = "false"
        }
        else {
            Write-Host "  Redis:      reachable" -ForegroundColor Green
        }
    }
    else {
        Write-Host "  Cache:      in-memory" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Starting uvicorn on http://localhost:8001" -ForegroundColor Cyan
Write-Host "API docs:    http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "Health:      http://localhost:8001/api/v1/health" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Push-Location $BackendDir
& $VenvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
