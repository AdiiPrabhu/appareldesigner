@echo off
setlocal enabledelayedexpansion
title Apparel Design Studio - Setup

echo.
echo ==========================================
echo  Apparel Design Studio - First-Time Setup
echo ==========================================
echo.

:: ── 1. Find Python (try python3 first, then python) ──────────────────────────
echo [1/7] Checking Python 3.10+...
set PYTHON_CMD=

python3 --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON_CMD=python3
    goto :python_found
)

python --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON_CMD=python
    goto :python_found
)

echo ERROR: Python is not installed or not in PATH.
echo Please install Python 3.10+ from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation.
pause
exit /b 1

:python_found
for /f "tokens=2" %%i in ('%PYTHON_CMD% --version 2^>^&1') do set PYTHON_VERSION=%%i
echo OK: Found %PYTHON_CMD% (%PYTHON_VERSION%)

:: Verify 3.10+
%PYTHON_CMD% -c "import sys; exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.10 or higher is required. Found %PYTHON_VERSION%
    pause
    exit /b 1
)

:: ── 2. Node.js ────────────────────────────────────────────────────────────────
echo [2/7] Checking Node.js 18+...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
for /f %%i in ('node --version') do set NODE_VERSION=%%i
echo OK: Found Node.js %NODE_VERSION%

:: ── 3. Python virtual environment ────────────────────────────────────────────
echo [3/7] Creating Python virtual environment...
if exist "backend\venv" (
    echo venv already exists – skipping
) else (
    %PYTHON_CMD% -m venv backend\venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo OK: Created backend\venv
)

:: ── 4. Python dependencies ────────────────────────────────────────────────────
echo [4/7] Installing Python dependencies...
call backend\venv\Scripts\activate.bat
pip install --upgrade pip --quiet
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies.
    pause
    exit /b 1
)
echo OK: Python dependencies installed

:: ── 5. Node.js dependencies ───────────────────────────────────────────────────
echo [5/7] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies.
    pause
    exit /b 1
)
echo OK: Node.js dependencies installed

:: ── 6. Data directories ───────────────────────────────────────────────────────
echo [6/7] Creating data directories...
mkdir data\images 2>nul
mkdir data\exports 2>nul
mkdir data\references 2>nul
mkdir data\thumbnails 2>nul
mkdir data\models 2>nul
echo OK: Data directories created

:: ── 7. .env file ──────────────────────────────────────────────────────────────
echo [7/7] Setting up configuration...
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo OK: .env created from template
) else (
    echo .env already exists – skipping
)

echo.
echo ==========================================
echo  Setup Complete!
echo ==========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Install Ollama (for AI prompt enhancement):
echo    ^> Download from: https://ollama.com/download/windows
echo    ^> After installing run:  ollama pull llama3.2
echo.
echo 2. (Optional) Install image generation:
echo    ^> Install PyTorch: https://pytorch.org/get-started/locally/
echo    ^> Then:  backend\venv\Scripts\pip install diffusers transformers accelerate
echo    ^> Set IMAGE_MODEL_PATH in .env to your SDXL model folder
echo.
echo 3. Start the app:
echo    ^> Run:  start-dev.bat
echo.
echo See README.md for full documentation.
echo.
pause
