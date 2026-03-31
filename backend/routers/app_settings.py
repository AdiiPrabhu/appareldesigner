import json
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, AppSettingModel
from config import settings

router = APIRouter()


class SettingsUpdate(BaseModel):
    backend_port: Optional[int] = None
    ollama_host: Optional[str] = None
    ollama_model: Optional[str] = None
    image_model: Optional[str] = None
    image_model_type: Optional[str] = None
    storage_path: Optional[str] = None
    auto_enhance_prompts: Optional[bool] = None
    safety_filter_enabled: Optional[bool] = None
    safety_sensitivity: Optional[str] = None
    default_product_type: Optional[str] = None
    default_output_style: Optional[str] = None
    default_width: Optional[int] = None
    default_height: Optional[int] = None
    default_steps: Optional[int] = None
    default_guidance_scale: Optional[float] = None
    device: Optional[str] = None


class OllamaTestRequest(BaseModel):
    host: Optional[str] = None
    model: Optional[str] = None


class ModelTestRequest(BaseModel):
    model_path: Optional[str] = None


def get_setting_value(db: Session, key: str, default: Any = None) -> Any:
    row = db.query(AppSettingModel).filter_by(key=key).first()
    if row is None:
        return default
    try:
        return json.loads(row.value)
    except Exception:
        return row.value


def set_setting_value(db: Session, key: str, value: Any):
    row = db.query(AppSettingModel).filter_by(key=key).first()
    serialized = json.dumps(value)
    if row:
        row.value = serialized
    else:
        row = AppSettingModel(key=key, value=serialized)
        db.add(row)
    db.commit()


def get_all_settings(db: Session) -> dict:
    return {
        "backend_port": get_setting_value(db, "backend_port", settings.backend_port),
        "ollama_host": get_setting_value(db, "ollama_host", settings.ollama_host),
        "ollama_model": get_setting_value(db, "ollama_model", settings.ollama_model),
        "image_model": get_setting_value(db, "image_model", settings.image_model_path),
        "image_model_type": get_setting_value(db, "image_model_type", settings.image_model_type),
        "storage_path": get_setting_value(db, "storage_path", settings.storage_path),
        "auto_enhance_prompts": get_setting_value(db, "auto_enhance_prompts", settings.auto_enhance_prompts),
        "safety_filter_enabled": get_setting_value(db, "safety_filter_enabled", settings.safety_filter_enabled),
        "safety_sensitivity": get_setting_value(db, "safety_sensitivity", settings.safety_sensitivity),
        "default_product_type": get_setting_value(db, "default_product_type", settings.default_product_type),
        "default_output_style": get_setting_value(db, "default_output_style", settings.default_output_style),
        "default_width": get_setting_value(db, "default_width", settings.default_width),
        "default_height": get_setting_value(db, "default_height", settings.default_height),
        "default_steps": get_setting_value(db, "default_steps", settings.default_steps),
        "default_guidance_scale": get_setting_value(db, "default_guidance_scale", settings.default_guidance_scale),
        "device": get_setting_value(db, "device", settings.device),
    }


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    return get_all_settings(db)


@router.put("")
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    update_dict = data.model_dump(exclude_none=True)
    for key, value in update_dict.items():
        set_setting_value(db, key, value)
    return get_all_settings(db)


@router.get("/models")
async def list_models(db: Session = Depends(get_db)):
    """List available Ollama models."""
    import httpx
    host = get_setting_value(db, "ollama_host", settings.ollama_host)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{host}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                return data.get("models", [])
    except Exception as e:
        return []
    return []


@router.post("/test-ollama")
async def test_ollama(data: OllamaTestRequest, db: Session = Depends(get_db)):
    import httpx
    host = data.host or get_setting_value(db, "ollama_host", settings.ollama_host)
    model = data.model or get_setting_value(db, "ollama_model", settings.ollama_model)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{host}/api/tags")
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                if model and not any(m.startswith(model.split(":")[0]) for m in models):
                    return {
                        "connected": True,
                        "message": f"Connected but model '{model}' not found. Available: {', '.join(models[:3])}",
                    }
                return {"connected": True, "message": f"Connected. Model '{model}' available."}
            return {"connected": False, "message": f"Ollama returned status {resp.status_code}"}
    except Exception as e:
        return {"connected": False, "message": str(e)}


@router.post("/test-image-model")
async def test_image_model(data: ModelTestRequest):
    from services.image_generator import image_generator_service
    model_path = (data.model_path or settings.image_model_path or "").strip()
    if not model_path:
        return {"loaded": False, "message": "No model path configured."}
    result = await image_generator_service.test_model(model_path)
    return result


@router.post("/load-image-model")
async def load_image_model(data: ModelTestRequest):
    """Explicitly load or reload the image generation model."""
    from services.image_generator import image_generator_service
    model_path = (data.model_path or settings.image_model_path or "").strip()
    if not model_path:
        return {"loaded": False, "message": "No model path provided."}
    result = await image_generator_service.load_model(model_path)
    return result


@router.get("/image-model-status")
async def image_model_status():
    """Return the current state of the image generation pipeline."""
    from services.image_generator import image_generator_service
    return image_generator_service.status()
