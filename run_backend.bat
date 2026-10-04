@echo off
set "PROJ_ROOT=%~dp0"
cd /d "%PROJ_ROOT%"

echo ==============================================================================
echo Launching GeriSafe FastAPI Backend Service on http://127.0.0.1:8000
echo ==============================================================================

if exist "%PROJ_ROOT%.venv\Scripts\python.exe" (
    "%PROJ_ROOT%.venv\Scripts\python.exe" -m uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8000
) else (
    echo Virtual environment .venv not found. Running setup.bat first...
    call "%PROJ_ROOT%setup.bat"
    "%PROJ_ROOT%.venv\Scripts\python.exe" -m uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8000
)
