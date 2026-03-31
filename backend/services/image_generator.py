"""
Image Generation Service
=========================

ARCHITECTURE NOTE:
==================
Ollama is an excellent LLM server but does NOT natively serve image generation models
like Stable Diffusion or SDXL. This service therefore uses a TWO-TIER approach:

1. OLLAMA (LLM Tier) — handled by prompt_enhancer.py:
   - Prompt enhancement and expansion
   - Safety filtering and rewriting
   - Design concept structuring

2. LOCAL IMAGE GENERATION (Diffusion Tier) — this file:
   - Uses Hugging Face `diffusers` library
   - Supports SDXL, SD 1.5, Flux, and any AutoPipeline-compatible model
   - Runs locally via PyTorch (CUDA / MPS / CPU)
   - Model is downloaded on first use from HuggingFace or loaded from a local path

If diffusers is NOT installed or no model is configured:
   - Generation returns an informative placeholder image
   - The app still functions for prompt engineering and planning

SETUP:
  pip install torch torchvision               # from pytorch.org for your platform
  pip install diffusers transformers accelerate safetensors
  Then set IMAGE_MODEL_PATH in .env (e.g. runwayml/stable-diffusion-v1-5)
"""
import asyncio
import os
import random
import uuid
from pathlib import Path
from typing import Callable, Dict, List, Optional

from PIL import Image, ImageDraw

from config import settings

# ── Optional imports (graceful degradation) ────────────────────────────────────
try:
    from diffusers import (
        AutoPipelineForText2Image,
        AutoPipelineForImage2Image,
        DPMSolverMultistepScheduler,
    )
    import torch
    DIFFUSERS_AVAILABLE = True
except ImportError:
    DIFFUSERS_AVAILABLE = False
    torch = None  # type: ignore


# ─── Placeholder image helper ──────────────────────────────────────────────────

def create_placeholder_image(
    message: str,
    width: int = 512,
    height: int = 512,
    filename: Optional[str] = None,
) -> str:
    """Create an informative placeholder image when generation isn't available."""
    img = Image.new("RGB", (width, height), color=(15, 15, 19))
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, width - 10, height - 10], outline=(42, 42, 58), width=2)
    draw.text((width // 2, height // 3), "Apparel Design Studio", fill=(108, 99, 255), anchor="mm")
    draw.text((width // 2, height // 2), "Image Generation", fill=(232, 232, 240), anchor="mm")

    words = message.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > 38:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)

    y_start = int(height * 2 / 3)
    for i, line in enumerate(lines[:6]):
        draw.text((width // 2, y_start + i * 20), line, fill=(136, 136, 170), anchor="mm")

    save_path = filename or str(Path(settings.images_path) / f"placeholder_{uuid.uuid4()}.png")
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    img.save(save_path, "PNG")
    return save_path


# ─── Device detection ──────────────────────────────────────────────────────────

def get_device() -> str:
    if not DIFFUSERS_AVAILABLE or torch is None:
        return "cpu"
    cfg = settings.device
    if cfg != "auto":
        return cfg
    if torch.cuda.is_available():
        return "cuda"
    # Apple Silicon MPS
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


# ─── Prompt builder ────────────────────────────────────────────────────────────

def build_full_prompt(
    prompt: str,
    style_tags: Optional[List[str]] = None,
    product_type: str = "tshirt",
    output_style: str = "flat_graphic",
) -> str:
    parts = [prompt]
    if style_tags:
        parts.append(", ".join(style_tags))

    product_additions = {
        "tshirt": "apparel graphic design, t-shirt print",
        "hoodie": "hoodie graphic design, garment print",
        "jacket": "jacket graphic design, apparel print",
        "sweatshirt": "sweatshirt graphic, garment design",
        "cap": "cap embroidery design, small format badge",
        "custom": "custom apparel graphic",
    }
    parts.append(product_additions.get(product_type, "apparel graphic design"))

    style_additions = {
        "flat_graphic": "flat vector art, screen print ready, bold colors, clean graphic",
        "streetwear": "streetwear aesthetic, urban graphic, bold impact",
        "embroidery": "embroidery design, thick outlines, limited colors, stitch-friendly",
        "minimal_vector": "minimal vector, negative space, elegant simplicity",
        "vintage_distressed": "vintage aesthetic, aged texture, retro palette",
        "futuristic": "futuristic design, sci-fi aesthetic, neon accents",
        "anime_inspired": "anime illustration style, cel shaded, bold outlines",
        "abstract": "abstract art, non-representational, dynamic composition",
    }
    if output_style in style_additions:
        parts.append(style_additions[output_style])

    parts.append("high quality, professional design, suitable for printing")
    return ", ".join(parts)


# ─── Main service ──────────────────────────────────────────────────────────────

class ImageGeneratorService:
    def __init__(self):
        self.pipeline = None
        self.model_available = False
        self.loaded_model_path: Optional[str] = None
        self._loading = False

    # ── Model loading ─────────────────────────────────────────────────────────

    async def _try_load_model(self, model_path: str) -> tuple[bool, str]:
        """
        Load a diffusion model from a HuggingFace ID or local path.

        Returns (success: bool, message: str).
        Uses AutoPipelineForText2Image so we never need to know the
        architecture up front — it reads the model_index.json / config and
        instantiates the right class automatically.
        """
        model_path = model_path.strip()  # remove accidental leading/trailing spaces
        if not DIFFUSERS_AVAILABLE:
            return False, (
                "diffusers is not installed. "
                "Run: pip install diffusers transformers accelerate safetensors"
            )
        if not model_path:
            return False, "No model path provided."
        if self._loading:
            return False, "A model is already loading, please wait."

        self._loading = True
        try:
            loop = asyncio.get_event_loop()
            pipeline, err = await loop.run_in_executor(
                None, self._load_pipeline_sync, model_path
            )
            if pipeline is None:
                self.model_available = False
                return False, err or "Unknown error during model load."

            self.pipeline = pipeline
            self.loaded_model_path = model_path
            self.model_available = True
            device = get_device()
            return True, f"Model loaded successfully on {device}: {model_path}"
        except Exception as exc:
            self.model_available = False
            return False, f"Unexpected error loading model: {exc}"
        finally:
            self._loading = False

    def _load_pipeline_sync(self, model_path: str):
        """
        Blocking model load (runs in a thread executor).

        Strategy:
          1. Use AutoPipelineForText2Image — detects SD 1.x / SDXL / Flux etc.
          2. Try safetensors first; fall back to .bin if unavailable.
          3. Use float16 on CUDA, float32 elsewhere (MPS float16 support is patchy).
        """
        device = get_device()
        # float16 is safe on CUDA; use float32 on MPS / CPU to avoid precision issues
        dtype = torch.float16 if device == "cuda" else torch.float32

        load_kwargs: dict = {
            "torch_dtype": dtype,
            "low_cpu_mem_usage": True,
        }

        # --- Attempt 1: safetensors preferred ---
        try:
            pipeline = AutoPipelineForText2Image.from_pretrained(
                model_path,
                **load_kwargs,
                use_safetensors=True,
            )
        except (OSError, ValueError, Exception) as e1:
            # --- Attempt 2: fall back to .bin weights ---
            try:
                pipeline = AutoPipelineForText2Image.from_pretrained(
                    model_path,
                    **load_kwargs,
                    use_safetensors=False,
                )
            except Exception as e2:
                return None, (
                    f"Could not load model '{model_path}'.\n"
                    f"  First attempt (safetensors): {e1}\n"
                    f"  Second attempt (bin):        {e2}\n\n"
                    "Common causes:\n"
                    "  • Model ID is wrong or the repo is private\n"
                    "  • No internet connection for first-time download\n"
                    "  • Disk space insufficient\n"
                    "  • diffusers/torch version mismatch\n"
                    "Install tips: pip install -U diffusers transformers accelerate safetensors"
                )

        # Use a fast sampler
        try:
            pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
                pipeline.scheduler.config,
                use_karras_sigmas=True,
            )
        except Exception:
            pass  # keep original scheduler if swap fails

        pipeline = pipeline.to(device)

        # ── Memory optimisations (applied for every device) ───────────────────
        # attention_slicing: breaks the attention matrix into chunks → huge VRAM
        #   savings on MPS/CPU, moderate on CUDA.  slice_size=1 is the most
        #   aggressive (slowest but lowest peak memory).
        try:
            pipeline.enable_attention_slicing(slice_size=1)
        except Exception:
            pass

        # VAE slicing: decodes one image at a time instead of the whole batch.
        try:
            pipeline.enable_vae_slicing()
        except Exception:
            pass

        # xformers: CUDA-only kernel, skip silently on MPS/CPU.
        if device == "cuda":
            try:
                pipeline.enable_xformers_memory_efficient_attention()
            except Exception:
                pass

        return pipeline, None

    # ── Resolution guard ──────────────────────────────────────────────────────

    def _safe_dimensions(self, requested_w: int, requested_h: int) -> tuple[int, int]:
        """
        Clamp width/height to what the loaded model can handle without OOM.

        SD 1.x: native 512×512. MPS/CPU can push to 768 with slicing; 1024
                immediately causes the '16 GiB buffer' MPS error.
        SDXL  : native 1024×1024. Fine on CUDA; 1024 also works on MPS with
                slicing but is slow.
        Unknown: be conservative.
        """
        if self.pipeline is None:
            return min(requested_w, 512), min(requested_h, 512)

        pipeline_class = type(self.pipeline).__name__
        device = get_device()

        if "XL" in pipeline_class or "SDXL" in pipeline_class:
            # SDXL — cap at 1024 everywhere; must be multiple of 8
            max_side = 1024
        else:
            # SD 1.x / SD 2.x — cap based on device
            # MPS and CPU can't handle >768 without huge memory pressure
            max_side = 768 if device == "cuda" else 512

        def _clamp(v: int) -> int:
            v = max(64, min(v, max_side))
            return (v // 8) * 8  # must be divisible by 8 (VAE constraint)

        return _clamp(requested_w), _clamp(requested_h)

    # ── Generation ────────────────────────────────────────────────────────────

    async def generate(
        self,
        job_id: str,
        prompt: str,
        negative_prompt: str = "",
        settings_dict: Optional[Dict] = None,
        on_progress: Optional[Callable] = None,
    ) -> List[str]:
        """Generate images. Returns list of saved file paths."""
        if settings_dict is None:
            settings_dict = {}

        model_path = (settings_dict.get("image_model") or settings.image_model_path or "").strip()
        if model_path and not self.model_available:
            ok, msg = await self._try_load_model(model_path)
            if not ok:
                # Surface the real error as a placeholder image
                return [create_placeholder_image(
                    message=msg,
                    width=settings_dict.get("width", 512),
                    height=settings_dict.get("height", 512),
                )]

        if not self.model_available or not DIFFUSERS_AVAILABLE:
            msg = (
                "diffusers is not installed. Install it to enable image generation."
                if not DIFFUSERS_AVAILABLE
                else "No image model loaded. Configure a model in Settings."
            )
            return [create_placeholder_image(
                message=msg,
                width=settings_dict.get("width", 512),
                height=settings_dict.get("height", 512),
            )]

        raw_w = settings_dict.get("width", 512)
        raw_h = settings_dict.get("height", 512)
        width, height = self._safe_dimensions(raw_w, raw_h)
        if (width, height) != (raw_w, raw_h):
            print(f"[ImageGen] Resolution clamped {raw_w}×{raw_h} → {width}×{height} "
                  f"(model: {type(self.pipeline).__name__}, device: {get_device()})")
        steps = settings_dict.get("steps", 30)
        guidance_scale = settings_dict.get("guidance_scale", 7.5)
        seed_val = settings_dict.get("seed", -1)
        num_outputs = settings_dict.get("num_outputs", 1)
        product_type = settings_dict.get("product_type", "tshirt")
        output_style = settings_dict.get("output_style", "flat_graphic")
        style_tags = settings_dict.get("style_tags", [])
        background_mode = settings_dict.get("background_mode", "white")

        full_prompt = build_full_prompt(prompt, style_tags, product_type, output_style)

        from services.safety_filter import SafetyFilterService
        safety_neg = SafetyFilterService().build_safety_negative_prompt()
        full_negative = f"{negative_prompt}, {safety_neg}" if negative_prompt else safety_neg

        if seed_val == -1:
            seed_val = random.randint(0, 2_147_483_647)

        loop = asyncio.get_event_loop()

        def _generate_sync():
            images = []
            for i in range(num_outputs):
                gen = torch.Generator().manual_seed(seed_val + i)

                def _step_cb(pipe, step, timestep, kwargs):
                    if on_progress:
                        loop.call_soon_threadsafe(on_progress, int(step / steps * 100))
                    return kwargs

                out = self.pipeline(
                    prompt=full_prompt,
                    negative_prompt=full_negative,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=guidance_scale,
                    generator=gen,
                    callback_on_step_end=_step_cb,
                )
                images.append(out.images[0])
            return images

        try:
            images = await loop.run_in_executor(None, _generate_sync)
        except Exception as exc:
            raise RuntimeError(f"Generation failed: {exc}") from exc

        image_paths = []
        for i, img in enumerate(images):
            if background_mode == "transparent":
                img = self._make_transparent(img)
                ext = ".png"
            else:
                if background_mode == "white" and img.mode == "RGBA":
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    bg.paste(img, mask=img.split()[3])
                    img = bg
                ext = ".png"

            filename = f"gen_{job_id}_{i}_{uuid.uuid4().hex[:8]}{ext}"
            file_path = str(Path(settings.images_path) / filename)
            os.makedirs(settings.images_path, exist_ok=True)
            img.save(file_path, "PNG")
            self._save_thumbnail(file_path)
            image_paths.append(file_path)

        return image_paths

    # ── Public helpers ────────────────────────────────────────────────────────

    async def test_model(self, model_path: str) -> dict:
        """Test if a model can be loaded. Returns {loaded, message}."""
        if not DIFFUSERS_AVAILABLE:
            return {
                "loaded": False,
                "message": (
                    "diffusers is not installed.\n"
                    "Run: pip install diffusers transformers accelerate safetensors"
                ),
            }
        if not model_path:
            return {"loaded": False, "message": "No model path provided."}

        ok, msg = await self._try_load_model(model_path)
        return {"loaded": ok, "message": msg}

    async def load_model(self, model_path: str) -> dict:
        """Explicitly load (or reload) a model. Returns {loaded, message}."""
        # Unload existing pipeline first to free memory
        if self.pipeline is not None:
            del self.pipeline
            self.pipeline = None
            self.model_available = False
            self.loaded_model_path = None
            if DIFFUSERS_AVAILABLE and torch and torch.cuda.is_available():
                torch.cuda.empty_cache()

        ok, msg = await self._try_load_model(model_path)
        return {"loaded": ok, "message": msg}

    def status(self) -> dict:
        return {
            "diffusers_available": DIFFUSERS_AVAILABLE,
            "model_available": self.model_available,
            "loaded_model": self.loaded_model_path,
            "device": get_device() if DIFFUSERS_AVAILABLE else "n/a",
            "loading": self._loading,
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    def _make_transparent(self, img: Image.Image) -> Image.Image:
        """Remove near-white pixels to produce a transparent background."""
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        data = list(img.getdata())
        new_data = [
            (255, 255, 255, 0) if (px[0] > 230 and px[1] > 230 and px[2] > 230) else px
            for px in data
        ]
        img.putdata(new_data)
        return img

    def _save_thumbnail(self, image_path: str, size: tuple = (256, 256)) -> str:
        try:
            p = Path(image_path)
            thumb_p = Path(settings.thumbnails_path) / p.name
            os.makedirs(settings.thumbnails_path, exist_ok=True)
            with Image.open(image_path) as im:
                im.thumbnail(size)
                im.save(str(thumb_p), "PNG")
            return str(thumb_p)
        except Exception as exc:
            print(f"Thumbnail creation failed: {exc}")
            return image_path


# Singleton
image_generator_service = ImageGeneratorService()
