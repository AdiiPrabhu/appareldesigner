# Apparel Design Studio

An AI-powered desktop application for generating apparel design concepts — T-shirts, hoodies, jackets, and more. Runs **fully offline** on **Windows, macOS, and Linux**.

Built with Electron + React (frontend) and FastAPI + Python (AI backend).

---

## What It Does

- **AI Prompt Enhancement** — Ollama LLM refines your design brief into detailed generation prompts
- **Copyright Safety Filter** — Detects trademarked brands, characters, logos, and risky phrasing
- **Image Generation** — Stable Diffusion / SDXL via the `diffusers` library (local GPU or CPU)
- **Reference Conditioning** — Use reference images to guide style (RAPC, not fine-tuning)
- **2D Mockup Preview** — Place designs on garment silhouettes with drag, scale, rotate
- **Gallery & Export** — PNG, transparent PNG, JPG, print-ready 300 DPI, project ZIP

---

## Architecture

### Why Electron?

Electron wraps the React frontend into a native desktop app with:
- Native file-system access (open/save dialogs)
- Ability to spawn and manage the Python backend subprocess
- Full offline operation (no cloud required)
- Single distributable installer on every platform

### Cross-Platform Support

| Platform | Shell | Build output |
|----------|-------|-------------|
| Windows 10/11 | `setup.bat` / `start-dev.bat` | NSIS installer `.exe`, portable `.exe` |
| macOS 12+ | `setup.sh` / `start-dev.sh` | DMG (Intel + Apple Silicon) |
| Ubuntu 20.04+ / Fedora | `setup.sh` / `start-dev.sh` | AppImage, `.deb`, `.rpm` |

### Two-Tier AI Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON APP                         │
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │   React/Vite    │    │   Python FastAPI Backend  │   │
│  │   (renderer)    │◄──►│   Port 8765               │   │
│  └─────────────────┘    │                           │   │
│                          │  ┌─────────────────────┐ │   │
│                          │  │  Ollama  (LLM Tier)  │ │   │
│                          │  │  Port 11434          │ │   │
│                          │  │  • Prompt enhance    │ │   │
│                          │  │  • Safety filter     │ │   │
│                          │  └─────────────────────┘ │   │
│                          │  ┌─────────────────────┐ │   │
│                          │  │ diffusers (Img Tier) │ │   │
│                          │  │  • SDXL / SD 1.5     │ │   │
│                          │  │  • Local GPU / CPU   │ │   │
│                          │  └─────────────────────┘ │   │
│                          └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Ollama handles TEXT only** (prompts, safety, concept structuring).
**diffusers handles IMAGE rendering** (Stable Diffusion models, local GPU).

---

## Project Structure

```
apparel-design-studio/
├── electron/
│   ├── main.ts             # App lifecycle, backend spawning, IPC
│   └── preload.ts          # Safe API bridge to renderer
├── src/                    # React + TypeScript frontend
│   ├── api/client.ts
│   ├── store/useAppStore.ts
│   ├── types/index.ts
│   └── components/
│       ├── layout/         # Sidebar, TopBar, Layout
│       ├── Dashboard/
│       ├── DesignWorkspace/
│       ├── Gallery/
│       ├── Mockup/
│       ├── References/
│       ├── Presets/
│       ├── Safety/
│       ├── Settings/
│       └── common/
├── backend/                # Python FastAPI backend
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── routers/
│   └── services/
│       ├── prompt_enhancer.py   # Ollama integration
│       ├── safety_filter.py     # Copyright detection
│       ├── reference_manager.py # Reference image RAPC
│       ├── image_generator.py   # diffusers pipeline
│       └── export_service.py
├── data/                   # Runtime data (gitignored)
├── resources/              # Icons, entitlements
├── setup.bat               # Windows first-run setup
├── setup.sh                # macOS / Linux first-run setup
├── start-dev.bat           # Windows dev start
├── start-dev.sh            # macOS / Linux dev start
└── .env.example
```

---

## Setup

### Prerequisites (all platforms)

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.10+ | Must be on `PATH` |
| Node.js | 18+ | LTS recommended |
| Ollama | latest | For prompt AI features |

---

### Windows

```bat
:: 1. Clone / extract, then:
setup.bat

:: 2. Install Ollama → https://ollama.com/download/windows
ollama pull llama3.2

:: 3. (Optional) image generation
backend\venv\Scripts\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
backend\venv\Scripts\pip install diffusers transformers accelerate

:: 4. Run
start-dev.bat
```

Python is auto-detected as `python3` or `python` — whichever resolves on your `PATH`.

---

### macOS

```bash
# 1. Clone / extract, then make the scripts executable:
chmod +x setup.sh start-dev.sh start-backend.sh

# 2. First-time setup
./setup.sh

# 3. Install Ollama
brew install ollama          # or download from https://ollama.com
ollama pull llama3.2

# 4. (Optional) image generation
#    Intel Mac:
backend/venv/bin/pip install torch torchvision diffusers transformers accelerate
#    Apple Silicon (MPS acceleration included automatically):
backend/venv/bin/pip install torch torchvision diffusers transformers accelerate

# 5. Run
./start-dev.sh
```

The app adapts its title bar to macOS style (traffic-light buttons with `hiddenInset`).

---

### Ubuntu / Debian

```bash
# 0. Install system dependencies
sudo apt update
sudo apt install python3.12 python3.12-venv python3-pip nodejs npm

# 1. Clone / extract
chmod +x setup.sh start-dev.sh start-backend.sh
./setup.sh

# 2. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2

# 3. (Optional) image generation (NVIDIA GPU)
backend/venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
backend/venv/bin/pip install diffusers transformers accelerate

# 4. Run
./start-dev.sh
```

---

### Fedora / RHEL

```bash
sudo dnf install python3.12 nodejs npm
# Then follow the Ubuntu steps above
```

---

## Running

### Development mode

```bash
# macOS / Linux
./start-dev.sh

# Windows
start-dev.bat
```

This starts:
- Python backend on port `8765`
- Vite dev server on port `5173`
- Electron app (loads from Vite)

### Backend only (for API testing)

```bash
./start-backend.sh     # macOS / Linux
start-backend.bat      # Windows
```

---

## Building Distributables

### Windows installer + portable exe

```bat
npm run dist:win
```

Output: `release/Apparel Design Studio Setup X.X.X.exe`

### macOS DMG (Intel + Apple Silicon)

```bash
npm run dist:mac
```

Output: `release/Apparel Design Studio-X.X.X.dmg`

> Notarization: set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` env vars before building for distribution.

### Linux AppImage + .deb + .rpm

```bash
npm run dist:linux
```

Output: `release/Apparel Design Studio-X.X.X.AppImage`, `.deb`, `.rpm`

### All platforms at once (CI)

```bash
npm run dist:all
```

---

## Image Generation Model Setup

**diffusers is NOT required** — the app works for prompt engineering and planning without it. Image generation just returns an error until a model is configured.

### Recommended models

| Model | Size | Notes |
|-------|------|-------|
| `stabilityai/stable-diffusion-xl-base-1.0` | ~7 GB | Best quality |
| `runwayml/stable-diffusion-v1-5` | ~4 GB | Faster, lower VRAM |

### Auto-download from HuggingFace

In Settings → Image Generation, enter the model ID. The first generation will download it automatically (~7 GB). Set `HF_HOME` env var to control the download location.

### Local `.safetensors` file

Download a model from [civitai.com](https://civitai.com) or HuggingFace, then enter the full path in Settings.

---

## Reference Image Conditioning (RAPC)

The app uses **Retrieval-Augmented Prompt Conditioning**, not fine-tuning:

1. You add reference images to a collection
2. Before generating, the app extracts style descriptors from references (via Ollama vision or PIL color analysis)
3. Descriptors are injected into the generation prompt
4. High-weight references can drive img2img conditioning

**What it does NOT do:**
- No model training (no LoRA, no DreamBooth)
- Does not permanently alter the base model
- Style guidance is approximate, not exact

The architecture has a clean plug-in point for a future LoRA pipeline.

---

## Copyright Safety System

The safety filter **reduces** risk but **cannot guarantee** copyright-free output.

| Check type | Method |
|-----------|--------|
| Brand/logo names | Static blocklist (200+ terms) |
| Character names | Static blocklist |
| Subtle requests | Ollama semantic analysis |
| Artist-style copying | Warning on living artist name mentions |

> **Always review designs before commercial use. Consult legal counsel for commercial applications.**

---

## Limitations

1. **Image generation requires separate setup** — diffusers + a model download
2. **Ollama for text only** — does not generate images itself
3. **Reference conditioning ≠ fine-tuning** — style guidance is approximate
4. **CPU generation is slow** — NVIDIA GPU (CUDA) strongly recommended; Apple Silicon (MPS) supported
5. **Safety filter is not foolproof** — manual legal review required before commercial use
6. **Cross-platform builds** — macOS builds must be done on macOS; Linux builds on Linux (electron-builder limitation)

---

## Future Improvements

- [ ] LoRA / DreamBooth fine-tuning pipeline
- [ ] True CMYK export with ICC profiles
- [ ] Additional garment templates (full photo mockups)
- [ ] Batch generation jobs
- [ ] Vector export (SVG via potrace)
- [ ] Team collaboration / cloud sync (optional)
- [ ] Auto-updater via electron-builder publish

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 29 (cross-platform) |
| Frontend | React 18 + TypeScript |
| Build Tool | Vite + electron-vite |
| Styling | Tailwind CSS (dark theme) |
| State Management | Zustand |
| Data Fetching | TanStack Query |
| Canvas / Mockup | React-Konva |
| Backend API | FastAPI (Python 3.10+) |
| Database | SQLite + SQLAlchemy |
| LLM Integration | Ollama HTTP API |
| Image Generation | HuggingFace diffusers |
| Installer | electron-builder (NSIS / DMG / AppImage) |
# appareldesigner
