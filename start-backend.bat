@echo off
title Apparel Design Studio - Backend Only

if not exist "backend\venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found. Run setup.bat first.
    pause
    exit /b 1
)

set BACKEND_PORT=8765
if exist ".env" (
    for /f "tokens=1,2 delims==" %%A in (.env) do (
        if "%%A"=="BACKEND_PORT" set BACKEND_PORT=%%B
    )
)

echo Starting backend on port %BACKEND_PORT%  (Ctrl+C to stop)
echo.

call backend\venv\Scripts\activate.bat
set PYTHONUNBUFFERED=1
python backend\main.py

pause
