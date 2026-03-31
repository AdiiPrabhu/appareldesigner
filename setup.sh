#!/usr/bin/env bash
# ============================================================
#  Apparel Design Studio – First-Time Setup (macOS & Linux)
# ============================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${BOLD}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
error()   { echo -e "${RED}[ERR]${RESET}  $*"; }

echo ""
echo "=============================================="
echo "  Apparel Design Studio – First-Time Setup"
echo "=============================================="
echo ""

# ── 1. Python ────────────────────────────────────────────────────────────────
info "Checking Python 3.10+..."
PYTHON=""
for cmd in python3.12 python3.11 python3.10 python3 python; do
  if command -v "$cmd" &>/dev/null; then
    version=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    if [ "$major" -ge 3 ] && [ "$minor" -ge 10 ]; then
      PYTHON="$cmd"
      success "Found $cmd ($version)"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  error "Python 3.10+ is required but not found."
  echo ""
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  Install with Homebrew:  brew install python@3.12"
    echo "  Or download from:       https://www.python.org/downloads/macos/"
  else
    echo "  Ubuntu/Debian:  sudo apt install python3.12 python3.12-venv"
    echo "  Fedora/RHEL:    sudo dnf install python3.12"
    echo "  Arch:           sudo pacman -S python"
  fi
  exit 1
fi

# ── 2. Node.js ───────────────────────────────────────────────────────────────
info "Checking Node.js 18+..."
if ! command -v node &>/dev/null; then
  error "Node.js is not installed."
  echo ""
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  Install with Homebrew:  brew install node"
    echo "  Or download from:       https://nodejs.org/"
  else
    echo "  Ubuntu/Debian:  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    echo "  Or download from:       https://nodejs.org/"
  fi
  exit 1
fi
NODE_VER=$(node --version)
success "Found Node.js $NODE_VER"

# ── 3. Python virtual environment ────────────────────────────────────────────
info "Creating Python virtual environment..."
if [ -d "backend/venv" ]; then
  warn "backend/venv already exists – skipping creation"
else
  "$PYTHON" -m venv backend/venv
  success "Created backend/venv"
fi

# ── 4. Python dependencies ───────────────────────────────────────────────────
info "Installing Python dependencies..."
# Use pip from the venv directly
VENV_PIP="backend/venv/bin/pip"
"$VENV_PIP" install --upgrade pip --quiet
"$VENV_PIP" install -r backend/requirements.txt
success "Python dependencies installed"

# ── 5. Node.js dependencies ──────────────────────────────────────────────────
info "Installing Node.js dependencies..."
npm install
success "Node.js dependencies installed"

# ── 6. Data directories ──────────────────────────────────────────────────────
info "Creating data directories..."
mkdir -p data/images data/exports data/references data/thumbnails data/models
success "Data directories ready"

# ── 7. .env file ─────────────────────────────────────────────────────────────
info "Setting up configuration..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  success ".env created from template"
else
  warn ".env already exists – skipping"
fi

# ── 8. macOS: check for Rosetta on Apple Silicon ─────────────────────────────
if [[ "$OSTYPE" == "darwin"* ]]; then
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    info "Apple Silicon detected (arm64)"
    echo "  PyTorch natively supports Apple Silicon via the MPS backend."
    echo "  Install PyTorch:  pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu"
    echo "  (The 'cpu' wheel on macOS includes MPS acceleration automatically)"
  fi
fi

echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Install Ollama for AI prompt enhancement:"
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "       brew install ollama   (or download from https://ollama.com)"
else
  echo "       curl -fsSL https://ollama.com/install.sh | sh"
fi
echo "     Then run:  ollama pull llama3.2"
echo ""
echo "  2. (Optional) Install image generation support:"
echo "       backend/venv/bin/pip install torch torchvision diffusers transformers accelerate"
echo "     Then set IMAGE_MODEL_PATH in .env to your SDXL model directory."
echo ""
echo "  3. Start the app:"
echo "       ./start-dev.sh"
echo ""
echo "See README.md for full instructions."
echo ""
