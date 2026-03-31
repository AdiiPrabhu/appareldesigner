@echo off
setlocal enabledelayedexpansion
title Apparel Design Studio - Development Mode

echo.
echo ==========================================
echo  Apparel Design Studio - Dev Mode
echo ==========================================
echo.

if not exist "backend\venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found.
    echo Please run setup.bat first.
    pause
    exit /b 1
)

if not exist ".env" (
    echo WARNING: .env not found – copying from .env.example
    copy ".env.example" ".env" >nul
)

:: Read BACKEND_PORT from .env (default 8765)
set BACKEND_PORT=8765
for /f "tokens=1,2 delims==" %%A in (.env) do (
    if "%%A"=="BACKEND_PORT" set BACKEND_PORT=%%B
)

echo   Backend API  ^>  http://localhost:%BACKEND_PORT%
echo   Vite dev     ^>  http://localhost:5173
echo.
echo Starting backend in a new window, then Electron+Vite here.
echo Close both windows (or press Ctrl+C) to stop.
echo.

:: Activate venv and start backend in a separate console window
start "Apparel Studio - Backend" cmd /c "call backend\venv\Scripts\activate.bat && set BACKEND_PORT=%BACKEND_PORT% && set PYTHONUNBUFFERED=1 && python backend\main.py"

:: Give backend 3 s to initialise before Electron tries to connect
timeout /t 3 /nobreak >nul

:: Start Electron + Vite in the current window
set NODE_ENV=development
call npm run dev

pause
