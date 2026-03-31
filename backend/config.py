import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Suppress pydantic warning: fields starting with "model_" conflict
        # with pydantic's protected namespace. We own these fields intentionally.
        protected_namespaces=(),
    )

    backend_port: int = 8765
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    storage_path: str = "./data"
    images_path: str = "./data/images"
    exports_path: str = "./data/exports"
    references_path: str = "./data/references"
    thumbnails_path: str = "./data/thumbnails"

    database_url: str = "sqlite:///./data/apparel_studio.db"

    image_model_path: str = ""
    image_model_type: str = "sdxl"  # sdxl, sd15, sd21
    device: str = "auto"  # auto, cuda, cpu

    auto_enhance_prompts: bool = True
    safety_filter_enabled: bool = True
    safety_sensitivity: str = "medium"  # low, medium, high

    default_product_type: str = "tshirt"
    default_output_style: str = "flat_graphic"
    default_width: int = 512   # SD 1.5 native resolution; SDXL auto-clamps up to 1024
    default_height: int = 512
    default_steps: int = 30
    default_guidance_scale: float = 7.5

    def ensure_dirs(self):
        dirs = [
            self.storage_path,
            self.images_path,
            self.exports_path,
            self.references_path,
            self.thumbnails_path,
        ]
        for d in dirs:
            Path(d).mkdir(parents=True, exist_ok=True)


settings = Settings()
