"""
Reference Manager Service
==========================
Manages reference images for design conditioning.

ARCHITECTURE NOTE - Reference Conditioning (NOT Fine-tuning):
============================================================
This system implements Retrieval-Augmented Prompt Conditioning (RAPC), not fine-tuning:

1. Reference images are stored locally with metadata
2. During generation, selected references are:
   a. Analyzed by Ollama vision (if model supports it) to extract style descriptors
   b. Style descriptors are injected into the generation prompt
   c. If diffusers is available, images can be used for img2img conditioning

This is NOT DreamBooth, LoRA, or any form of model fine-tuning.
Fine-tuning would require:
- Multiple high-quality reference images (15-30+)
- GPU training time (hours)
- Model checkpoint management

The RAPC approach provides lighter-weight style guidance without requiring training.
Architecture is designed so a fine-tuning pipeline can be plugged in later.
"""
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any

import httpx
from PIL import Image
import aiofiles

from config import settings


def generate_thumbnail(source_path: str, thumbnail_path: str, size: tuple = (256, 256)) -> str:
    """Generate a thumbnail for a reference image."""
    try:
        with Image.open(source_path) as img:
            img.thumbnail(size, Image.LANCZOS)
            # Convert to RGB if necessary
            if img.mode in ("RGBA", "P"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "RGBA":
                    bg.paste(img, mask=img.split()[3])
                else:
                    bg.paste(img)
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
            img.save(thumbnail_path, "JPEG", quality=85)
    except Exception as e:
        print(f"Thumbnail generation failed for {source_path}: {e}")
        # Create a placeholder thumbnail
        placeholder = Image.new("RGB", size, (50, 50, 70))
        os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
        placeholder.save(thumbnail_path, "JPEG")
    return thumbnail_path


async def extract_style_descriptors(image_path: str) -> List[str]:
    """
    Extract style descriptors from an image.

    If Ollama supports vision (e.g., llava model), uses it.
    Otherwise, falls back to basic PIL-based color analysis.
    """
    descriptors = []

    # Try Ollama vision first
    try:
        import base64
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "model": settings.ollama_model,
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "Analyze this image and describe its visual style in 5-8 key descriptors "
                        "suitable for an apparel design prompt. Focus on: color palette, artistic technique, "
                        "mood, composition style, and visual aesthetic. "
                        "Return ONLY a comma-separated list of descriptors, nothing else."
                    ),
                    "images": [image_b64],
                }
            ],
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{settings.ollama_host}/api/chat", json=payload)
            if resp.status_code == 200:
                content = resp.json()["message"]["content"]
                descriptors = [d.strip() for d in content.split(",") if d.strip()]
                if descriptors:
                    return descriptors[:8]
    except Exception:
        pass

    # Fallback: PIL color analysis
    try:
        with Image.open(image_path) as img:
            img_small = img.convert("RGB").resize((100, 100))
            pixels = list(img_small.getdata())
            avg_r = sum(p[0] for p in pixels) / len(pixels)
            avg_g = sum(p[1] for p in pixels) / len(pixels)
            avg_b = sum(p[2] for p in pixels) / len(pixels)

            # Basic color mood analysis
            brightness = (avg_r + avg_g + avg_b) / 3
            if brightness < 85:
                descriptors.append("dark tones")
            elif brightness > 170:
                descriptors.append("light bright tones")
            else:
                descriptors.append("mid-tone palette")

            # Dominant channel
            if avg_r > avg_g + 20 and avg_r > avg_b + 20:
                descriptors.append("warm red tones")
            elif avg_b > avg_r + 20 and avg_b > avg_g + 20:
                descriptors.append("cool blue tones")
            elif avg_g > avg_r + 20 and avg_g > avg_b + 20:
                descriptors.append("natural green tones")

            descriptors.append("reference-inspired composition")
    except Exception:
        descriptors = ["reference style"]

    return descriptors


class ReferenceManagerService:
    def __init__(self):
        self.refs_path = Path(settings.references_path)
        self.thumbs_path = Path(settings.thumbnails_path) / "references"

    def _get_ref_dir(self, collection_id: str) -> Path:
        path = self.refs_path / collection_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _get_thumb_dir(self, collection_id: str) -> Path:
        path = self.thumbs_path / collection_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    async def save_uploaded_reference(
        self,
        collection_id: str,
        file,  # UploadFile
        reference_type: str = "inspiration",
    ) -> Dict[str, str]:
        """Save an uploaded reference image and generate thumbnail."""
        ref_dir = self._get_ref_dir(collection_id)
        thumb_dir = self._get_thumb_dir(collection_id)

        # Generate unique filename
        ext = Path(file.filename).suffix.lower()
        if ext not in {".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
            ext = ".png"
        unique_name = f"{uuid.uuid4()}{ext}"
        file_path = ref_dir / unique_name
        thumb_path = thumb_dir / f"{unique_name.replace(ext, '.jpg')}"

        # Save the uploaded file
        content = await file.read()
        async with aiofiles.open(str(file_path), "wb") as f:
            await f.write(content)

        # Generate thumbnail
        generate_thumbnail(str(file_path), str(thumb_path))

        return {
            "file_path": str(file_path),
            "thumbnail_path": str(thumb_path),
            "filename": file.filename,
        }

    async def copy_reference_file(
        self,
        collection_id: str,
        source_path: str,
    ) -> Dict[str, str]:
        """Copy an existing file into a reference collection."""
        ref_dir = self._get_ref_dir(collection_id)
        thumb_dir = self._get_thumb_dir(collection_id)

        source = Path(source_path)
        ext = source.suffix.lower()
        unique_name = f"{uuid.uuid4()}{ext}"
        file_path = ref_dir / unique_name
        thumb_path = thumb_dir / f"{uuid.uuid4()}.jpg"

        shutil.copy2(source_path, str(file_path))
        generate_thumbnail(str(file_path), str(thumb_path))

        return {
            "file_path": str(file_path),
            "thumbnail_path": str(thumb_path),
            "filename": source.name,
        }

    async def get_conditioning_data(
        self,
        reference_ids: List[str],
        reference_records: List[Dict],
        settings_dict: Dict,
    ) -> Dict[str, Any]:
        """
        Prepare conditioning data from selected references.

        Returns:
        - style_descriptors: List of text style descriptors extracted from images
        - reference_images: List of (image_path, weight) for img2img conditioning
        - enhanced_prompt_additions: Text to append to the prompt
        """
        if not reference_records:
            return {
                "style_descriptors": [],
                "reference_images": [],
                "enhanced_prompt_additions": "",
            }

        all_descriptors = []
        reference_images = []

        for ref in reference_records:
            if ref["id"] not in reference_ids:
                continue

            file_path = ref.get("file_path", "")
            if not file_path or not os.path.exists(file_path):
                continue

            weight = ref.get("weight", 0.5)
            reference_images.append((file_path, weight))

            # Extract style descriptors for high-weight references
            if weight >= 0.3:
                try:
                    descriptors = await extract_style_descriptors(file_path)
                    all_descriptors.extend(descriptors)
                except Exception:
                    pass

        # Deduplicate and join descriptors
        unique_descriptors = list(dict.fromkeys(all_descriptors))[:10]
        prompt_additions = ", ".join(unique_descriptors) if unique_descriptors else ""

        return {
            "style_descriptors": unique_descriptors,
            "reference_images": reference_images,
            "enhanced_prompt_additions": prompt_additions,
        }


reference_manager_service = ReferenceManagerService()
