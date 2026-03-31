from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    get_db, PromptPresetModel,
    generate_id, now_iso, parse_json, dump_json
)

router = APIRouter()


class PresetCreate(BaseModel):
    name: str
    prompt: str
    negative_prompt: str = ""
    style_tags: List[str] = []
    output_style: str = "flat_graphic"
    product_type: Optional[str] = None


class PresetUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    style_tags: Optional[List[str]] = None
    output_style: Optional[str] = None
    product_type: Optional[str] = None


def preset_to_dict(preset: PromptPresetModel) -> dict:
    return {
        "id": preset.id,
        "name": preset.name,
        "prompt": preset.prompt,
        "negative_prompt": preset.negative_prompt,
        "style_tags": parse_json(preset.style_tags_json, []),
        "output_style": preset.output_style,
        "product_type": preset.product_type,
        "is_builtin": preset.is_builtin,
        "created_at": preset.created_at,
    }


@router.get("")
def list_presets(db: Session = Depends(get_db)):
    presets = db.query(PromptPresetModel).order_by(
        PromptPresetModel.is_builtin.desc(),
        PromptPresetModel.name.asc()
    ).all()
    return [preset_to_dict(p) for p in presets]


@router.post("", status_code=201)
def create_preset(data: PresetCreate, db: Session = Depends(get_db)):
    preset = PromptPresetModel(
        id=generate_id(),
        name=data.name,
        prompt=data.prompt,
        negative_prompt=data.negative_prompt,
        style_tags_json=dump_json(data.style_tags),
        output_style=data.output_style,
        product_type=data.product_type,
        is_builtin=False,
        created_at=now_iso(),
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset_to_dict(preset)


@router.put("/{preset_id}")
def update_preset(preset_id: str, data: PresetUpdate, db: Session = Depends(get_db)):
    preset = db.query(PromptPresetModel).filter_by(id=preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    if preset.is_builtin:
        raise HTTPException(status_code=403, detail="Cannot modify built-in presets")
    if data.name is not None:
        preset.name = data.name
    if data.prompt is not None:
        preset.prompt = data.prompt
    if data.negative_prompt is not None:
        preset.negative_prompt = data.negative_prompt
    if data.style_tags is not None:
        preset.style_tags_json = dump_json(data.style_tags)
    if data.output_style is not None:
        preset.output_style = data.output_style
    if data.product_type is not None:
        preset.product_type = data.product_type
    db.commit()
    db.refresh(preset)
    return preset_to_dict(preset)


@router.delete("/{preset_id}", status_code=204)
def delete_preset(preset_id: str, db: Session = Depends(get_db)):
    preset = db.query(PromptPresetModel).filter_by(id=preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    if preset.is_builtin:
        raise HTTPException(status_code=403, detail="Cannot delete built-in presets")
    db.delete(preset)
    db.commit()
