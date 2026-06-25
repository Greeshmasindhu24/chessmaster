# ChessMaster Pro — one-time Windows setup (no Docker / WSL)
# Usage: .\setup-windows.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$BackendDir  = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$EnvFile     = Join-Path $ProjectRoot ".env"
$EnvExample  = Join-Path $ProjectRoot ".env.example"

Write-Host "ChessMaster Pro — Windows setup" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Python..."
$pyCmd = $null
foreach ($ver in @("3.13", "3.12")) {
    try {
        $out = & py "-$ver" --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pyCmd = "py -$ver"
            Write-Host "  OK: $out" -ForegroundColor Green
            break
        }
    }
    catch { }
}
if (-not $pyCmd) {
    Write-Host "ERROR: Python 3.12 or 3.13 required. Install from https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

Write-Host "Checking Node.js..."
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "  OK: Node $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Node.js 20+ required. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    Write-Host "Created .env from .env.example" -ForegroundColor Green
}
else {
    Write-Host ".env already exists — leaving unchanged" -ForegroundColor DarkGray
}

@("data", "uploads", "stockfish") | ForEach-Object {
    $dir = Join-Path $ProjectRoot $_
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "Created $_\" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Setting up Python virtual environment..."
Push-Location $BackendDir
if (-not (Test-Path ".venv")) {
    Invoke-Expression "$pyCmd -m venv .venv"
}
& .\.venv\Scripts\pip.exe install -r requirements.txt
Pop-Location

Write-Host ""
Write-Host "Installing frontend dependencies..."
Push-Location $FrontendDir
& npm install
Pop-Location

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  Terminal 1: .\run_backend.ps1"
Write-Host "  Terminal 2: .\run_frontend.ps1"
Write-Host ""
Write-Host "Open http://localhost:5173 — API docs at http://localhost:8001/docs"
