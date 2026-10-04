@echo off
set "PROJ_ROOT=%~dp0"
cd /d "%PROJ_ROOT%frontend"

echo ==============================================================================
echo Launching GeriSafe Next.js Clinical Dashboard on http://localhost:3000
echo ==============================================================================

if not exist "%PROJ_ROOT%frontend\node_modules" (
    echo Frontend node_modules not found. Installing packages...
    call npm install
)

call npm run dev
