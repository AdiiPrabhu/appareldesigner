import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db, SessionLocal, PromptPresetModel, AppSettingModel, generate_id, now_iso, dump_json

# Import routers
from routers import projects, generation, references, images, presets, export, app_settings


BUILTIN_PRESETS = [
    {
        "name": "Bold Streetwear",
        "prompt": "Bold graphic streetwear design, urban aesthetic, strong geometric shapes, high contrast colors, distressed texture overlays, urban graffiti influence, screen-print ready, flat graphic art style",
        "negative_prompt": "text, watermark, logo, blurry, photorealistic, 3d render, gradient mesh, low contrast",
        "style_tags": ["bold", "streetwear", "geometric", "urban"],
        "output_style": "streetwear",
        "product_type": "tshirt",
    },
    {
        "name": "Minimal Vector Art",
        "prompt": "Minimal clean vector art design, single color or two-tone, simple elegant linework, negative space composition, modern graphic design aesthetic, screen print compatible, white background",
        "negative_prompt": "complex, detailed, photorealistic, watermark, text, gradient, busy, cluttered",
        "style_tags": ["minimal", "monochrome", "line-art"],
        "output_style": "minimal_vector",
        "product_type": None,
    },
    {
        "name": "Vintage Distressed",
        "prompt": "Vintage retro distressed apparel graphic, aged worn texture, retro color palette, classic americana typography feel, weathered edges, old school aesthetic, suitable for garment printing",
        "negative_prompt": "modern, clean, digital, sharp, high saturation, photorealistic, watermark",
        "style_tags": ["vintage", "retro", "grunge", "distressed"],
        "output_style": "vintage_distressed",
        "product_type": None,
    },
    {
        "name": "Futuristic Cyberpunk",
        "prompt": "Futuristic cyberpunk design, neon color accents on dark background, glitch art elements, circuit board patterns, digital aesthetic, sci-fi inspired, bold and striking, screen print version",
        "negative_prompt": "vintage, organic, natural, watercolor, hand-drawn, pastel, soft",
        "style_tags": ["futuristic", "cyberpunk", "neon", "geometric"],
        "output_style": "futuristic",
        "product_type": None,
    },
    {
        "name": "Nature & Botanical",
        "prompt": "Botanical nature illustration for apparel, detailed plant and floral elements, earthy organic color palette, hand-drawn feel, nature-inspired graphic, suitable for eco-friendly brand aesthetic",
        "negative_prompt": "urban, industrial, geometric, artificial, neon, digital, watermark",
        "style_tags": ["nature", "floral", "watercolor", "organic"],
        "output_style": "flat_graphic",
        "product_type": None,
    },
    {
        "name": "Japanese Aesthetic",
        "prompt": "Japanese aesthetic apparel design, influenced by ukiyo-e woodblock print style, indigo and white color palette, wave patterns, nature motifs, clean graphic composition, modern reinterpretation",
        "negative_prompt": "western, modern tech, photorealistic, watermark, text, logo",
        "style_tags": ["japanese", "minimal", "nature", "geometric"],
        "output_style": "flat_graphic",
        "product_type": None,
    },
    {
        "name": "Gothic Dark Art",
        "prompt": "Gothic dark art design for apparel, intricate ornamental details, dark aesthetic, baroque influences, skull or occult motifs treated artistically, black and white or dark palette, high contrast",
        "negative_prompt": "bright colors, pastel, childish, cartoon, watermark, text",
        "style_tags": ["gothic", "dark", "abstract", "geometric"],
        "output_style": "flat_graphic",
        "product_type": "hoodie",
    },
    {
        "name": "Embroidery Style",
        "prompt": "Design optimized for embroidery on apparel, clean limited color palette, thick bold outlines, simplified shapes, no gradients, stitch-friendly composition, professional embroidery patch aesthetic",
        "negative_prompt": "gradient, photorealistic, complex, thin lines, too detailed, watermark",
        "style_tags": ["minimal", "bold", "geometric"],
        "output_style": "embroidery",
        "product_type": None,
    },
]


def seed_builtin_presets(db):
    """Seed built-in presets if none exist."""
    count = db.query(PromptPresetModel).filter_by(is_builtin=True).count()
    if count == 0:
        for preset_data in BUILTIN_PRESETS:
            preset = PromptPresetModel(
                id=generate_id(),
                name=preset_data["name"],
                prompt=preset_data["prompt"],
                negative_prompt=preset_data["negative_prompt"],
                style_tags_json=dump_json(preset_data["style_tags"]),
                output_style=preset_data["output_style"],
                product_type=preset_data.get("product_type"),
                is_builtin=True,
                created_at=now_iso(),
            )
            db.add(preset)
        db.commit()


def ensure_default_project(db):
    """Create a default project if none exist."""
    from database import ProjectModel
    count = db.query(ProjectModel).count()
    if count == 0:
        default_project = ProjectModel(
            id="default",
            name="My First Project",
            product_type="tshirt",
            description="Default project for getting started",
            created_at=now_iso(),
            updated_at=now_iso(),
        )
        db.add(default_project)
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    db = SessionLocal()
    try:
        seed_builtin_presets(db)
        ensure_default_project(db)
    finally:
        db.close()
    yield
    # Shutdown


app = FastAPI(
    title="Apparel Design Studio API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        f"http://localhost:{settings.backend_port}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for generated images
data_path = Path(settings.storage_path)
data_path.mkdir(parents=True, exist_ok=True)
app.mount("/static/data", StaticFiles(directory=str(data_path)), name="static")

# Include routers
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(generation.router, prefix="/generation", tags=["Generation"])
app.include_router(references.router, prefix="/references", tags=["References"])
app.include_router(images.router, prefix="/images", tags=["Images"])
app.include_router(presets.router, prefix="/presets", tags=["Presets"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(app_settings.router, prefix="/settings", tags=["Settings"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from services.prompt_enhancer import check_ollama_status
    from services.image_generator import image_generator_service

    ollama_ok = False
    ollama_model = None
    try:
        status = await check_ollama_status()
        ollama_ok = status.get("connected", False)
        ollama_model = settings.ollama_model if ollama_ok else None
    except Exception:
        pass

    return {
        "status": "ok",
        "ollama_connected": ollama_ok,
        "image_model_loaded": image_generator_service.model_available,
        "ollama_model": ollama_model,
        "version": "1.0.0",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BACKEND_PORT", settings.backend_port))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False, log_level="info")
