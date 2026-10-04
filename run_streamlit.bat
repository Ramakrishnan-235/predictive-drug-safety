@echo off
set "PROJ_ROOT=%~dp0"
cd /d "%PROJ_ROOT%"

echo ==============================================================================
echo Launching GeriSafe Streamlit Explorer on http://localhost:8501
echo ==============================================================================

if exist "%PROJ_ROOT%.venv\Scripts\python.exe" (
    "%PROJ_ROOT%.venv\Scripts\python.exe" -m streamlit run app/gnn_app.py
) else (
    echo Virtual environment .venv not found. Running setup.bat first...
    call "%PROJ_ROOT%setup.bat"
    "%PROJ_ROOT%.venv\Scripts\python.exe" -m streamlit run app/gnn_app.py
)
