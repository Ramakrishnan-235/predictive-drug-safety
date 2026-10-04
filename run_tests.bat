@echo off
set "PROJ_ROOT=%~dp0"
cd /d "%PROJ_ROOT%"

set "PYTHON=%PROJ_ROOT%.venv\Scripts\python.exe"

echo ==============================================================================
echo Running GeriSafe Verification & Test Suite
echo ==============================================================================
echo.

echo [1/3] Testing GNN Inference Engine & What-If Simulation...
"%PYTHON%" scripts/test_gnn_inference.py
if %errorlevel% neq 0 (
    echo [ERROR] GNN inference test failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Testing LLM Explainer & Clinical Guideline Synthesis...
"%PYTHON%" src/explainability/test_llm_explainer.py
if %errorlevel% neq 0 (
    echo [ERROR] LLM explainer test failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Running Pytest Suite...
"%PYTHON%" -m pytest tests -v
if %errorlevel% neq 0 (
    echo [ERROR] Pytest failed.
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo All Verification Checks Completed!
echo ==============================================================================
pause
exit /b 0
