"""
Export Service
==============
Handles exporting generated images in various formats:
- PNG (lossless)
- Transparent PNG (background removal)
- JPG (compressed)
- Print-ready (300 DPI, optimized for production)
- Mockup composite (garment + design overlay)
- Project package (ZIP with all images + metadata)
"""
import json
import os
import shutil
import uuid
import zipfile
from pathlib import Path
from typing import Dict, Any, List, Optional

from PIL import Image, ImageFilter

from config import settings


class ExportService:
    def __init__(self):
        self.exports_path = Path(settings.exports_path)
        self.exports_path.mkdir(parents=True, exist_ok=True)

    def _get_export_path(self, format_suffix: str) -> str:
        """Generate a unique export file path."""
        filename = f"export_{uuid.uuid4().hex[:12]}{format_suffix}"
        return str(self.exports_path / filename)

    async def export_image(
        self,
        image_path: str,
        format: str = "png",
        quality: int = 95,
        dpi: int = 300,
        output_path: Optional[str] = None,
    ) -> str:
        """Export an image in the specified format."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Source image not found: {image_path}")

        if format == "png":
            return self._export_png(image_path, output_path)
        elif format == "transparent_png":
            return self._export_transparent_png(image_path, output_path)
        elif format == "jpg":
            return self._export_jpg(image_path, quality, output_path)
        elif format == "print_ready":
            return self._export_print_ready(image_path, dpi, output_path)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _export_png(self, image_path: str, output_path: Optional[str] = None) -> str:
        """Export as PNG."""
        out = output_path or self._get_export_path(".png")
        with Image.open(image_path) as img:
            img.save(out, "PNG", optimize=True)
        return out

    def _export_transparent_png(self, image_path: str, output_path: Optional[str] = None) -> str:
        """Export as PNG with background removal."""
        out = output_path or self._get_export_path("_transparent.png")
        with Image.open(image_path) as img:
            if img.mode != "RGBA":
                img = img.convert("RGBA")

            data = img.getdata()
            new_data = []

            for pixel in data:
                r, g, b, a = pixel
                # Remove near-white pixels (common for design backgrounds)
                if r > 220 and g > 220 and b > 220:
                    # Make transparent with soft edge
                    alpha = max(0, 255 - max(r - 220, g - 220, b - 220) * 10)
                    new_data.append((r, g, b, alpha))
                elif r > 245 and g > 245 and b > 245:
                    new_data.append((r, g, b, 0))
                else:
                    new_data.append(pixel)

            img.putdata(new_data)
            img.save(out, "PNG", optimize=True)
        return out

    def _export_jpg(
        self,
        image_path: str,
        quality: int = 95,
        output_path: Optional[str] = None,
    ) -> str:
        """Export as JPEG."""
        out = output_path or self._get_export_path(".jpg")
        with Image.open(image_path) as img:
            # JPEG doesn't support transparency — composite on white
            if img.mode in ("RGBA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "RGBA":
                    background.paste(img, mask=img.split()[3])
                else:
                    background.paste(img)
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")
            img.save(out, "JPEG", quality=quality, optimize=True)
        return out

    def _export_print_ready(
        self,
        image_path: str,
        dpi: int = 300,
        output_path: Optional[str] = None,
    ) -> str:
        """
        Export a print-ready version at 300 DPI.

        Note: True CMYK conversion requires a full ICC profile management system.
        This creates a high-quality RGB version at the specified DPI as a starting point.
        For true production printing, consult a professional print service.
        """
        out = output_path or self._get_export_path(f"_print_{dpi}dpi.png")
        with Image.open(image_path) as img:
            # Set DPI metadata
            img_rgb = img.convert("RGB") if img.mode != "RGB" else img

            # Scale up if needed for print resolution
            # Assume source is screen resolution (72-96 DPI), target is 300 DPI
            current_w, current_h = img_rgb.size
            # For 300 DPI on a standard 14"x14" print area = 4200x4200 pixels
            # Scale proportionally to at least 2400px wide
            if current_w < 2400:
                scale = 2400 / current_w
                new_w = int(current_w * scale)
                new_h = int(current_h * scale)
                img_rgb = img_rgb.resize((new_w, new_h), Image.LANCZOS)

            img_rgb.save(out, "PNG", dpi=(dpi, dpi), optimize=True)
        return out

    async def export_mockup(
        self,
        image_path: str,
        placement: Dict[str, Any],
        garment_type: str = "tshirt",
        garment_color: str = "#ffffff",
        output_path: Optional[str] = None,
    ) -> str:
        """
        Export a mockup composite image.

        Creates a simple 2D mockup by compositing the design onto a solid color background
        (representing the garment). For production quality mockups, use dedicated
        mockup template images.
        """
        out = output_path or self._get_export_path("_mockup.png")

        # Parse garment color
        color_hex = garment_color.lstrip("#")
        try:
            garment_rgb = tuple(int(color_hex[i : i + 2], 16) for i in (0, 2, 4))
        except Exception:
            garment_rgb = (255, 255, 255)

        # Create garment background (simplified silhouette)
        canvas_size = (800, 900)
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))

        # Draw garment shape (simplified rectangle representing front panel)
        garment = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(garment)

        # Simple t-shirt shape
        garment_color_full = garment_rgb + (255,)
        draw.rectangle([100, 80, 700, 820], fill=garment_color_full, outline=(200, 200, 200, 100), width=2)
        canvas.paste(garment, (0, 0), garment)

        # Load and composite the design
        x = int(placement.get("x", 200))
        y = int(placement.get("y", 250))
        scale = float(placement.get("scale", 0.4))
        rotation = float(placement.get("rotation", 0))

        try:
            with Image.open(image_path) as design_img:
                if design_img.mode != "RGBA":
                    design_img = design_img.convert("RGBA")

                # Scale design
                new_w = int(design_img.width * scale)
                new_h = int(design_img.height * scale)
                if new_w > 0 and new_h > 0:
                    design_resized = design_img.resize((new_w, new_h), Image.LANCZOS)

                    # Rotate if needed
                    if rotation != 0:
                        design_resized = design_resized.rotate(-rotation, expand=True)

                    # Paste onto canvas
                    canvas.paste(design_resized, (x, y), design_resized)
        except Exception as e:
            print(f"Design composite failed: {e}")

        # Save final composite on white background
        final = Image.new("RGB", canvas_size, (240, 240, 245))
        final.paste(canvas, (0, 0), canvas)
        final.save(out, "PNG", optimize=True)
        return out

    async def export_project_package(
        self,
        project_id: str,
        project_name: str,
        images: List[Dict],
        output_path: Optional[str] = None,
    ) -> str:
        """Export a project as a ZIP package containing all images and metadata."""
        out = output_path or str(self.exports_path / f"project_{project_id}_{uuid.uuid4().hex[:8]}.zip")

        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
            # Write metadata
            metadata = {
                "project_id": project_id,
                "project_name": project_name,
                "image_count": len(images),
                "images": [],
            }

            for img_data in images:
                file_path = img_data.get("file_path", "")
                if file_path and os.path.exists(file_path):
                    arcname = f"images/{Path(file_path).name}"
                    zf.write(file_path, arcname)
                    metadata["images"].append({
                        "id": img_data.get("id"),
                        "filename": Path(file_path).name,
                        "prompt": img_data.get("prompt"),
                        "product_type": img_data.get("product_type"),
                        "output_style": img_data.get("output_style"),
                        "seed": img_data.get("seed"),
                    })

            zf.writestr("metadata.json", json.dumps(metadata, indent=2))

        return out


export_service = ExportService()
