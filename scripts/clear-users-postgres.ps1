# Clear all registered users from ChessMaster Pro PostgreSQL (Neon / production).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "backend"
Set-Location $Root

function Invoke-PythonQuiet {
    param(
        [Parameter(Mandatory = $true)][string]$PythonExe,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList
    )
    $prevNative = $PSNativeCommandUseErrorActionPreference
    $prevError = $ErrorActionPreference
      try {
        $PSNativeCommandUseErrorActionPreference = $false
        $ErrorActionPreference = "Continue"
        & $PythonExe @ArgumentList 2>$null
        return $LASTEXITCODE
    }
    finally {
        $PSNativeCommandUseErrorActionPreference = $prevNative
        $ErrorActionPreference = $prevError
    }
}

function Invoke-PythonVisible {
    param(
        [Parameter(Mandatory = $true)][string]$PythonExe,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList
    )
    $prevNative = $PSNativeCommandUseErrorActionPreference
    $prevError = $ErrorActionPreference
    try {
        $PSNativeCommandUseErrorActionPreference = $false
        $ErrorActionPreference = "Continue"
        $lines = & $PythonExe @ArgumentList 2>&1
        foreach ($line in $lines) {
            if ($line -is [System.Management.Automation.ErrorRecord]) {
                Write-Host $line.ToString()
            }
            else {
                Write-Host $line
            }
        }
        $code = $LASTEXITCODE
        if ($null -eq $code) { $code = 0 }
        return $code
    }
    finally {
        $PSNativeCommandUseErrorActionPreference = $prevNative
        $ErrorActionPreference = $prevError
    }
}

function Test-PythonModule {
    param(
        [Parameter(Mandatory = $true)][string]$PythonExe,
        [Parameter(Mandatory = $true)][string]$ModuleName
    )
    $code = Invoke-PythonQuiet -PythonExe $PythonExe -ArgumentList @("-c", "import $ModuleName")
    return ($code -eq 0)
}

function Ensure-Psycopg2 {
    param([Parameter(Mandatory = $true)][string]$PythonExe)
    if (Test-PythonModule -PythonExe $PythonExe -ModuleName "psycopg2") {
        return
    }
    Write-Host "Installing psycopg2-binary for admin script..." -ForegroundColor DarkGray
    $pipCode = Invoke-PythonQuiet -PythonExe $PythonExe -ArgumentList @("-m", "pip", "install", "--quiet", "psycopg2-binary")
    if ($pipCode -ne 0) {
        Write-Error "Failed to install psycopg2-binary. Run: $PythonExe -m pip install psycopg2-binary"
    }
    if (-not (Test-PythonModule -PythonExe $PythonExe -ModuleName "psycopg2")) {
        Write-Error "psycopg2 still unavailable after pip install."
    }
}

$Python = "python"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
if (Test-Path $VenvPython) {
    $Python = $VenvPython
}
Ensure-Psycopg2 -PythonExe $Python

$scriptPath = Join-Path $PSScriptRoot "clear_users_postgres.py"
$pythonArgs = @("-u", $scriptPath)
if ($args.Count -gt 0) { $pythonArgs += $args }

Write-Host "Running clear_users_postgres.py..." -ForegroundColor DarkGray
$exitCode = Invoke-PythonVisible -PythonExe $Python -ArgumentList $pythonArgs
if ($exitCode -ne 0) { exit $exitCode }
