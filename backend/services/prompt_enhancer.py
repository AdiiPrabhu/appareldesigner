"""
Prompt Enhancement Service
===========================
Uses Ollama's chat API to enhance user prompts for apparel design image generation.

Ollama is used exclusively for TEXT intelligence:
- Expanding design concepts with visual detail
- Adding appropriate style language for printing techniques
- Suggesting artistic aesthetics and composition
- Generating negative prompts
- Rewriting risky prompts for copyright compliance

Ollama does NOT generate images — that's handled by the diffusers service.
"""
import json
import httpx
from typing import List, Optional

from config import settings


PRODUCT_CONTEXT = {
    "tshirt": "t-shirt front graphic design, typically 12-14 inches wide for print area, centered chest placement",
    "hoodie": "hoodie front/back graphic, large print area, works well with bold graphics and text",
    "jacket": "jacket design, consider sleeve prints, chest logos, and back panel graphics",
    "sweatshirt": "crewneck sweatshirt graphic, medium-large print area, bold graphics work well",
    "cap": "cap embroidery or patch design, typically small format 2-3 inches, must be highly simplified",
    "custom": "custom apparel piece, consider the specific garment characteristics",
}

STYLE_CONTEXT = {
    "flat_graphic": "flat vector graphic style, solid colors, clean shapes, screen-print friendly",
    "streetwear": "bold urban streetwear aesthetic, graphic impact, layered visual elements",
    "embroidery": "embroidery-optimized design: thick outlines, limited colors (max 6), no gradients",
    "minimal_vector": "minimal vector illustration, negative space composition, elegant simplicity",
    "vintage_distressed": "vintage retro aesthetic with aged texture, worn feel, classic color palette",
    "futuristic": "futuristic sci-fi aesthetic, neon accents, tech-inspired elements",
    "anime_inspired": "anime/manga-influenced illustration style, cel-shaded, bold outlines",
    "abstract": "abstract expressionist approach, non-representational forms, dynamic composition",
    "custom": "custom artistic style as specified",
}

SYSTEM_PROMPT = """You are an expert apparel design art director specializing in graphic design for garment printing.

Your role is to enhance user prompts for AI image generation of apparel graphics. When given a design concept:

1. Expand the visual description with specific artistic details
2. Specify composition and layout considerations for garment placement
3. Reference appropriate printing techniques (screen print, DTG, embroidery)
4. Suggest color approach and palette considerations
5. Add artistic style descriptors that improve image generation quality
6. Ensure the design concept is original and avoids direct copying of existing IP
7. Keep language concrete and descriptive for image generation models

Output a JSON object with these fields:
- enhanced_prompt: The improved prompt (200-400 chars)
- negative_prompt: What to avoid (logos, text, watermarks, plus style-specific negatives)
- style_notes: Array of 2-3 brief notes about the artistic approach

IMPORTANT: Never reference specific brand logos, trademarked characters, or directly copy existing artwork.
Keep designs original and inspired rather than derivative."""


async def check_ollama_status() -> dict:
    """Check if Ollama is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.ollama_host}/api/tags")
            return {"connected": resp.status_code == 200}
    except Exception:
        return {"connected": False}


class PromptEnhancerService:
    def __init__(self):
        self.base_url = settings.ollama_host
        self.model = settings.ollama_model

    async def _call_ollama(self, prompt: str, system: str = SYSTEM_PROMPT) -> str:
        """Call Ollama chat API and return the response text."""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.7,
                "num_predict": 600,
            },
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["message"]["content"]

    async def enhance_prompt(
        self,
        prompt: str,
        product_type: str = "tshirt",
        style_tags: Optional[List[str]] = None,
        output_style: str = "flat_graphic",
    ) -> dict:
        """Enhance a prompt for apparel design generation."""
        if not prompt.strip():
            return {
                "original_prompt": prompt,
                "enhanced_prompt": prompt,
                "negative_prompt": self._default_negative_prompt(output_style),
                "style_notes": [],
            }

        product_ctx = PRODUCT_CONTEXT.get(product_type, PRODUCT_CONTEXT["custom"])
        style_ctx = STYLE_CONTEXT.get(output_style, STYLE_CONTEXT["custom"])
        tags_ctx = ", ".join(style_tags) if style_tags else "none specified"

        user_message = f"""Enhance this apparel design prompt for AI image generation:

Design Brief: {prompt}

Product: {product_type} ({product_ctx})
Output Style: {output_style} ({style_ctx})
Style Tags: {tags_ctx}

Return a JSON object with enhanced_prompt, negative_prompt, and style_notes fields."""

        try:
            response_text = await self._call_ollama(user_message)
            result = json.loads(response_text)
            return {
                "original_prompt": prompt,
                "enhanced_prompt": result.get("enhanced_prompt", prompt),
                "negative_prompt": result.get(
                    "negative_prompt", self._default_negative_prompt(output_style)
                ),
                "style_notes": result.get("style_notes", []),
            }
        except json.JSONDecodeError:
            # Ollama returned non-JSON — use as-is
            return {
                "original_prompt": prompt,
                "enhanced_prompt": prompt,
                "negative_prompt": self._default_negative_prompt(output_style),
                "style_notes": ["Enhancement parsing failed — using original prompt"],
            }
        except Exception as e:
            # Ollama not available — return original
            return {
                "original_prompt": prompt,
                "enhanced_prompt": prompt,
                "negative_prompt": self._default_negative_prompt(output_style),
                "style_notes": [f"Enhancement unavailable: {str(e)[:100]}"],
            }

    async def generate_design_concept(self, brief: str) -> dict:
        """Generate a complete design concept from a brief description."""
        user_message = f"""Create a detailed apparel design concept from this brief:

Brief: {brief}

Return JSON with:
- title: Short design name
- prompt: Detailed image generation prompt
- style_tags: Array of relevant style tags
- output_style: One of: flat_graphic, streetwear, embroidery, minimal_vector, vintage_distressed, futuristic, anime_inspired, abstract
- color_palette: Suggested colors (array of hex codes or color names)
- notes: Designer notes"""

        try:
            response_text = await self._call_ollama(user_message)
            return json.loads(response_text)
        except Exception as e:
            return {
                "title": "Design Concept",
                "prompt": brief,
                "style_tags": [],
                "output_style": "flat_graphic",
                "color_palette": [],
                "notes": f"Auto-generation unavailable: {str(e)[:100]}",
            }

    async def suggest_style_variations(self, prompt: str) -> list:
        """Suggest 3 style variations for a given prompt."""
        user_message = f"""Given this apparel design prompt: "{prompt}"

Suggest 3 distinct style variations. Return JSON array of objects, each with:
- style: The style name
- prompt: Modified prompt for this style
- style_tags: Relevant tags"""

        try:
            response_text = await self._call_ollama(user_message)
            result = json.loads(response_text)
            if isinstance(result, list):
                return result
            return []
        except Exception:
            return []

    def _default_negative_prompt(self, output_style: str = "flat_graphic") -> str:
        base = (
            "text, watermark, logo, brand name, trademark, copyright symbol, "
            "photorealistic, 3d render, blurry, low quality, jpeg artifacts, "
            "signature, artist name, web address, url"
        )
        style_negatives = {
            "flat_graphic": ", gradient mesh, complex shading, photograph",
            "embroidery": ", gradient, thin lines, complex details, photograph",
            "minimal_vector": ", busy, cluttered, complex, detailed",
            "vintage_distressed": ", modern, digital, sharp, clean, high saturation",
            "futuristic": ", vintage, organic, natural, old",
            "anime_inspired": ", photorealistic, western cartoon, childish",
        }
        return base + style_negatives.get(output_style, "")


prompt_enhancer_service = PromptEnhancerService()
