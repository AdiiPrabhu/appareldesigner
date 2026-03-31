from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import (
    get_db, GeneratedImageModel, GenerationJobModel,
    generate_id, now_iso, parse_json, dump_json
)

router = APIRouter()


def image_to_dict(img: GeneratedImageModel) -> dict:
    return {
        "id": img.id,
        "project_id": img.project_id,
        "prompt": img.prompt,
        "negative_prompt": img.negative_prompt,
        "seed": img.seed,
        "width": img.width,
        "height": img.height,
        "steps": img.steps,
        "guidance_scale": img.guidance_scale,
        "output_style": img.output_style,
        "product_type": img.product_type,
        "file_path": img.file_path,
        "thumbnail_path": img.thumbnail_path,
        "is_favorite": img.is_favorite,
        "created_at": img.created_at,
        "metadata": parse_json(img.metadata_json, {}),
        "references_used": parse_json(img.references_json, []),
    }


@router.get("")
def list_images(
    project_id: Optional[str] = Query(None),
    product_type: Optional[str] = Query(None),
    output_style: Optional[str] = Query(None),
    favorites_only: bool = Query(False),
    search: Optional[str] = Query(None),
    sort: str = Query("newest"),  # newest, oldest, favorites
    page: int = Query(1, ge=1),
    page_size: int = Query(40, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(GeneratedImageModel)

    if project_id:
        query = query.filter(GeneratedImageModel.project_id == project_id)
    if product_type:
        query = query.filter(GeneratedImageModel.product_type == product_type)
    if output_style:
        query = query.filter(GeneratedImageModel.output_style == output_style)
    if favorites_only:
        query = query.filter(GeneratedImageModel.is_favorite == True)
    if search:
        query = query.filter(GeneratedImageModel.prompt.contains(search))

    if sort == "oldest":
        query = query.order_by(GeneratedImageModel.created_at.asc())
    elif sort == "favorites":
        query = query.order_by(
            GeneratedImageModel.is_favorite.desc(),
            GeneratedImageModel.created_at.desc()
        )
    else:
        query = query.order_by(GeneratedImageModel.created_at.desc())

    total = query.count()
    images = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [image_to_dict(img) for img in images],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{image_id}")
def get_image(image_id: str, db: Session = Depends(get_db)):
    img = db.query(GeneratedImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return image_to_dict(img)


@router.put("/{image_id}/favorite")
def toggle_favorite(image_id: str, db: Session = Depends(get_db)):
    img = db.query(GeneratedImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    img.is_favorite = not img.is_favorite
    db.commit()
    return {"is_favorite": img.is_favorite}


@router.delete("/{image_id}", status_code=204)
def delete_image(image_id: str, db: Session = Depends(get_db)):
    img = db.query(GeneratedImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    # Remove file from disk
    import os
    for path in [img.file_path, img.thumbnail_path]:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
    db.delete(img)
    db.commit()


@router.get("/{image_id}/variations")
def get_variations(image_id: str, db: Session = Depends(get_db)):
    img = db.query(GeneratedImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    variations = (
        db.query(GeneratedImageModel)
        .filter(
            GeneratedImageModel.prompt == img.prompt,
            GeneratedImageModel.id != img.id,
        )
        .order_by(GeneratedImageModel.created_at.desc())
        .limit(20)
        .all()
    )
    return [image_to_dict(v) for v in variations]


@router.post("/{image_id}/remix")
async def remix_image(image_id: str, db: Session = Depends(get_db)):
    img = db.query(GeneratedImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    import random
    from database import GenerationJobModel

    job = GenerationJobModel(
        id=generate_id(),
        project_id=img.project_id,
        status="pending",
        prompt=img.prompt,
        negative_prompt=img.negative_prompt,
        settings_json=dump_json({
            "product_type": img.product_type,
            "output_style": img.output_style,
            "width": img.width,
            "height": img.height,
            "steps": img.steps,
            "guidance_scale": img.guidance_scale,
            "seed": random.randint(0, 2147483647),
            "num_outputs": 1,
            "enhance_prompt": False,
            "safety_check": False,
        }),
        progress=0,
        created_at=now_iso(),
        result_image_ids_json=dump_json([]),
    )
    db.add(job)
    db.commit()

    from routers.generation import run_generation_job
    import asyncio
    asyncio.create_task(run_generation_job(job.id))

    return {"job_id": job.id}
