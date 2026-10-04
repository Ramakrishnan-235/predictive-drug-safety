@echo off
set "PROJ_ROOT=%~dp0"
cd /d "%PROJ_ROOT%"

echo ==============================================================================
echo Launching GeriSafe Full Stack (FastAPI Backend + Next.js Frontend)
echo ==============================================================================

start "GeriSafe FastAPI Backend (:8000)" cmd /k "call run_backend.bat"
timeout /t 3 /nobreak >nul
start "GeriSafe Next.js Frontend (:3000)" cmd /k "call run_frontend.bat"

echo.
echo Both services have been launched in separate windows:
echo   - Backend:  http://127.0.0.1:8000 (Swagger: http://127.0.0.1:8000/docs)
echo   - Frontend: http://localhost:3000
echo.
