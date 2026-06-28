# Clear all registered users from local ChessMaster Pro SQLite (dev only).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
& python (Join-Path $PSScriptRoot "clear_users.py") @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
