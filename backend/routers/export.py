import os
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    get_db, GeneratedImageModel, ExportHistoryModel,
    generate_id, now_iso
)
from services.export_service import export_service

router = APIRouter()


class ExportRequest(BaseModel):
    format: str = "png"  # png, transparent_png, jpg, print_ready
    quality: int = 95
    dpi: int = 300
    output_path: Optional[str] = None


class MockupExportRequest(BaseModel):
    image_id: str
    placement: Dict[str, Any]
    garment_type: str = "tshirt"
    garment_color: str = "#ffffff"
    output_path: Optional[str] = None


@router.post("/image/{image_id}")
async def export_image(
    image_id: str,
    data: ExportRequest,
    db: Session = Depends(get_db),
):
    img = db.query(GeneratedImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    if not os.path.exists(img.file_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    try:
        export_path = await export_service.export_image(
            image_path=img.file_path,
            format=data.format,
            quality=data.quality,
            dpi=data.dpi,
            output_path=data.output_path,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Record in export history
    history = ExportHistoryModel(
        id=generate_id(),
        image_id=image_id,
        export_path=export_path,
        export_format=data.format,
        created_at=now_iso(),
    )
    db.add(history)
    db.commit()

    return {"export_path": export_path}


@router.post("/mockup")
async def export_mockup(data: MockupExportRequest, db: Session = Depends(get_db)):
    img = db.query(GeneratedImageModel).filter_by(id=data.image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        export_path = await export_service.export_mockup(
            image_path=img.file_path,
            placement=data.placement,
            garment_type=data.garment_type,
            garment_color=data.garment_color,
            output_path=data.output_path,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"export_path": export_path}


@router.post("/project/{project_id}/package")
async def export_project_package(project_id: str, db: Session = Depends(get_db)):
    from database import ProjectModel
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    images = db.query(GeneratedImageModel).filter_by(project_id=project_id).all()
    image_dicts = []
    for img in images:
        image_dicts.append({
            "id": img.id,
            "file_path": img.file_path,
            "prompt": img.prompt,
            "product_type": img.product_type,
            "output_style": img.output_style,
            "seed": img.seed,
        })

    try:
        export_path = await export_service.export_project_package(
            project_id=project_id,
            project_name=project.name,
            images=image_dicts,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"export_path": export_path}


@router.get("/history")
def get_export_history(db: Session = Depends(get_db)):
    history = (
        db.query(ExportHistoryModel)
        .order_by(ExportHistoryModel.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": h.id,
            "image_id": h.image_id,
            "export_path": h.export_path,
            "export_format": h.export_format,
            "created_at": h.created_at,
        }
        for h in history
    ]
