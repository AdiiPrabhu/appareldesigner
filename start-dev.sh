#!/usr/bin/env bash
# ============================================================
#  Apparel Design Studio – Start Development Mode
#  Works on macOS and Linux
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

if [ ! -f "backend/venv/bin/python3" ] && [ ! -f "backend/venv/bin/python" ]; then
  echo -e "${RED}ERROR:${RESET} Virtual environment not found."
  echo "Please run ./setup.sh first."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "WARNING: .env not found – copying from .env.example"
  cp .env.example .env
fi

# Read BACKEND_PORT from .env (default 8765)
BACKEND_PORT=$(grep -E '^BACKEND_PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo "8765")
BACKEND_PORT=${BACKEND_PORT:-8765}

# Resolve python binary inside venv
VENV_PYTHON="backend/venv/bin/python3"
[ -f "$VENV_PYTHON" ] || VENV_PYTHON="backend/venv/bin/python"

echo ""
echo "=============================================="
echo "  Apparel Design Studio – Dev Mode"
echo "=============================================="
echo ""
echo -e "  Backend API  →  ${GREEN}http://localhost:${BACKEND_PORT}${RESET}"
echo -e "  Vite dev     →  ${GREEN}http://localhost:5173${RESET}"
echo ""
echo "Press Ctrl+C to stop both processes."
echo ""

# Start backend in background, capture its PID
export BACKEND_PORT
export PYTHONUNBUFFERED=1

"$VENV_PYTHON" backend/main.py &
BACKEND_PID=$!
echo -e "${BOLD}[Backend]${RESET} Started (PID $BACKEND_PID)"

# Ensure backend is killed when this script exits (Ctrl+C or error)
cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

# Give the backend a moment to start before launching Electron+Vite
sleep 2

# Start Electron + Vite (foreground, so Ctrl+C propagates)
NODE_ENV=development npm run dev
