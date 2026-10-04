@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo GeriSafe CDSS - Environment Setup & Initialization
echo ==============================================================================
echo.

set "PROJ_ROOT=%~dp0"
cd /d "%PROJ_ROOT%"

:: 1. Locate Python
echo [1/5] Detecting Python 3.12+ ...
set "PYTHON_EXE="

:: Check virtualenv first
if exist "%PROJ_ROOT%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJ_ROOT%.venv\Scripts\python.exe"
    echo   Found virtual environment Python at: !PYTHON_EXE!
) else (
    :: Check standard system locations
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_EXE=python"
        echo   Found system Python in PATH
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        echo   Found Python 3.12 at: !PYTHON_EXE!
    ) else if exist "C:\Program Files\Python312\python.exe" (
        set "PYTHON_EXE=C:\Program Files\Python312\python.exe"
        echo   Found Python 3.12 at: !PYTHON_EXE!
    ) else (
        echo   [ERROR] Python 3.12 was not found. Please install Python 3.12 from python.org or Microsoft Store.
        pause
        exit /b 1
    )
)

:: 2. Create or verify .venv
echo.
echo [2/5] Initializing Python Virtual Environment (.venv) ...
if not exist "%PROJ_ROOT%.venv\Scripts\python.exe" (
    echo   Creating .venv using !PYTHON_EXE! ...
    "!PYTHON_EXE!" -m venv "%PROJ_ROOT%.venv"
    if !errorlevel! neq 0 (
        echo   [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo   Created .venv successfully.
) else (
    echo   Virtual environment .venv already exists.
)

set "VENV_PYTHON=%PROJ_ROOT%.venv\Scripts\python.exe"
set "VENV_PIP=%PROJ_ROOT%.venv\Scripts\pip.exe"

:: 3. Install Python Dependencies
echo.
echo [3/5] Installing Backend Dependencies ...
where uv >nul 2>&1
if !errorlevel! equ 0 (
    echo   Using uv to sync dependencies...
    uv sync
) else (
    echo   Using pip to install requirements...
    "!VENV_PIP!" install --upgrade pip
    "!VENV_PIP!" install -r "%PROJ_ROOT%requirements.txt"
)
if !errorlevel! neq 0 (
    echo   [WARNING] Dependency installation finished with warnings or non-zero status.
) else (
    echo   Backend dependencies verified.
)

:: 4. Setup Frontend (Node.js & npm)
echo.
echo [4/5] Setting up Next.js Clinical Dashboard (frontend/) ...
where npm >nul 2>&1
if !errorlevel! equ 0 (
    if not exist "%PROJ_ROOT%frontend\node_modules" (
        echo   Installing frontend npm dependencies...
        cd /d "%PROJ_ROOT%frontend"
        call npm install
        cd /d "%PROJ_ROOT%"
    ) else (
        echo   Frontend node_modules already exists.
    )
) else (
    echo   [WARNING] npm/node was not detected in PATH.
    echo   If Node.js is installed in a custom location, add it to your PATH or run 'npm install' inside the frontend directory.
)

:: 5. Ensure Environment Configurations Exist
echo.
echo [5/5] Checking configuration files ...
if not exist "%PROJ_ROOT%.env" (
    if exist "%PROJ_ROOT%.env.example" (
        echo   Creating .env from .env.example ...
        copy "%PROJ_ROOT%.env.example" "%PROJ_ROOT%.env" >nul
    )
)
if not exist "%PROJ_ROOT%frontend\.env.local" (
    if exist "%PROJ_ROOT%frontend\.env.local.example" (
        echo   Creating frontend/.env.local from .env.local.example ...
        copy "%PROJ_ROOT%frontend\.env.local.example" "%PROJ_ROOT%frontend\.env.local" >nul
    )
)

echo.
echo ==============================================================================
echo Setup Complete!
echo ==============================================================================
echo To start developing:
echo   1. Backend API:      Run run_backend.bat  (or: uvicorn src.api.main:app)
echo   2. Frontend UI:      Run run_frontend.bat (or: cd frontend ^&^& npm run dev)
echo   3. Both at once:     Run run_all.bat
echo   4. Streamlit App:    Run run_streamlit.bat
echo   5. Verification:     Run run_tests.bat
echo ==============================================================================
pause
