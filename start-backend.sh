#!/usr/bin/env bash
# ============================================================
#  Apparel Design Studio – Start Backend Only (macOS & Linux)
#  Useful for API testing without the Electron shell
# ============================================================
set -euo pipefail

if [ ! -f "backend/venv/bin/python3" ] && [ ! -f "backend/venv/bin/python" ]; then
  echo "ERROR: Virtual environment not found. Run ./setup.sh first."
  exit 1
fi

VENV_PYTHON="backend/venv/bin/python3"
[ -f "$VENV_PYTHON" ] || VENV_PYTHON="backend/venv/bin/python"

BACKEND_PORT=$(grep -E '^BACKEND_PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo "8765")
BACKEND_PORT=${BACKEND_PORT:-8765}

echo "Starting backend on port $BACKEND_PORT  (Ctrl+C to stop)"
echo ""

export BACKEND_PORT
export PYTHONUNBUFFERED=1
"$VENV_PYTHON" backend/main.py
