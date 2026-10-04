# ==============================================================================
# GeriSafe CDSS - PowerShell Setup & Initialization Script
# Run with: powershell -ExecutionPolicy Bypass -File setup.ps1
# ==============================================================================

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "GeriSafe CDSS - Environment Setup & Initialization" -ForegroundColor Cyan
Write-Host "==============================================================================`n" -ForegroundColor Cyan

$ProjRoot = $PSScriptRoot
Set-Location -Path $ProjRoot

# 1. Locate Python
Write-Host "[1/5] Detecting Python 3.12+ ..." -ForegroundColor Yellow
$PythonExe = $null

if (Test-Path "$ProjRoot\.venv\Scripts\python.exe") {
    $PythonExe = "$ProjRoot\.venv\Scripts\python.exe"
    Write-Host "  Found existing virtual environment Python at: $PythonExe" -ForegroundColor Green
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonExe = "python"
    Write-Host "  Found system Python in PATH" -ForegroundColor Green
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe") {
    $PythonExe = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
    Write-Host "  Found Python 3.12 at: $PythonExe" -ForegroundColor Green
} elseif (Test-Path "C:\Program Files\Python312\python.exe") {
    $PythonExe = "C:\Program Files\Python312\python.exe"
    Write-Host "  Found Python 3.12 at: $PythonExe" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Python 3.12 was not found. Please install Python 3.12 from python.org." -ForegroundColor Red
    exit 1
}

# 2. Virtual Environment
Write-Host "`n[2/5] Checking Python Virtual Environment (.venv) ..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjRoot\.venv\Scripts\python.exe")) {
    Write-Host "  Creating .venv using $PythonExe ..." -ForegroundColor Gray
    & $PythonExe -m venv "$ProjRoot\.venv"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to create virtual environment." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  Virtual environment .venv already exists." -ForegroundColor Green
}

$VenvPython = "$ProjRoot\.venv\Scripts\python.exe"
$VenvPip = "$ProjRoot\.venv\Scripts\pip.exe"

# 3. Backend Dependencies
Write-Host "`n[3/5] Installing Backend Dependencies ..." -ForegroundColor Yellow
if (Get-Command "uv" -ErrorAction SilentlyContinue) {
    Write-Host "  Using uv sync..." -ForegroundColor Gray
    uv sync
} else {
    Write-Host "  Using pip in .venv..." -ForegroundColor Gray
    & $VenvPip install --upgrade pip
    & $VenvPip install -r "$ProjRoot\requirements.txt"
}

# 4. Frontend Dependencies
Write-Host "`n[4/5] Checking Next.js Clinical Dashboard (frontend/) ..." -ForegroundColor Yellow
if (Get-Command "npm" -ErrorAction SilentlyContinue) {
    if (-not (Test-Path "$ProjRoot\frontend\node_modules")) {
        Write-Host "  Running npm install in frontend/ ..." -ForegroundColor Gray
        Set-Location -Path "$ProjRoot\frontend"
        npm install
        Set-Location -Path $ProjRoot
    } else {
        Write-Host "  Frontend node_modules already exists." -ForegroundColor Green
    }
} else {
    Write-Host "  [WARNING] npm/node not found in PATH. Please install Node.js (18+ or 20+) to run frontend." -ForegroundColor DarkYellow
}

# 5. Config files
Write-Host "`n[5/5] Checking Configuration & Environment Files ..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjRoot\.env") -and (Test-Path "$ProjRoot\.env.example")) {
    Copy-Item "$ProjRoot\.env.example" "$ProjRoot\.env"
    Write-Host "  Created .env from .env.example" -ForegroundColor Green
}
if (-not (Test-Path "$ProjRoot\frontend\.env.local") -and (Test-Path "$ProjRoot\frontend\.env.local.example")) {
    Copy-Item "$ProjRoot\frontend\.env.local.example" "$ProjRoot\frontend\.env.local"
    Write-Host "  Created frontend/.env.local from .env.local.example" -ForegroundColor Green
}

Write-Host "`n==============================================================================" -ForegroundColor Cyan
Write-Host "Setup Completed Successfully!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "Quick Launch Commands:"
Write-Host "  Backend API:   .\run_backend.bat" -ForegroundColor White
Write-Host "  Frontend UI:   .\run_frontend.bat" -ForegroundColor White
Write-Host "  All Services:  .\run_all.bat" -ForegroundColor White
Write-Host "  Streamlit App: .\run_streamlit.bat" -ForegroundColor White
Write-Host "  Test Suite:    .\run_tests.bat" -ForegroundColor White
Write-Host "==============================================================================`n" -ForegroundColor Cyan
