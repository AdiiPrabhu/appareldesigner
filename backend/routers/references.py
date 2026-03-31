import os
import shutil
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    get_db, ReferenceCollectionModel, ReferenceImageModel,
    generate_id, now_iso, parse_json, dump_json
)
from config import settings
from services.reference_manager import reference_manager_service

router = APIRouter()


class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: List[str] = []


class ImageUpdate(BaseModel):
    reference_type: Optional[str] = None
    weight: Optional[float] = None
    tags: Optional[List[str]] = None


class FolderAdd(BaseModel):
    folder_path: str


def collection_to_dict(col: ReferenceCollectionModel, db: Session) -> dict:
    image_count = db.query(ReferenceImageModel).filter_by(collection_id=col.id).count()
    return {
        "id": col.id,
        "name": col.name,
        "description": col.description,
        "tags": parse_json(col.tags_json, []),
        "image_count": image_count,
        "created_at": col.created_at,
    }


def image_to_dict(img: ReferenceImageModel) -> dict:
    return {
        "id": img.id,
        "collection_id": img.collection_id,
        "file_path": img.file_path,
        "thumbnail_path": img.thumbnail_path,
        "filename": img.filename,
        "reference_type": img.reference_type,
        "weight": img.weight,
        "tags": parse_json(img.tags_json, []),
        "created_at": img.created_at,
    }


@router.get("/collections")
def list_collections(db: Session = Depends(get_db)):
    collections = db.query(ReferenceCollectionModel).order_by(ReferenceCollectionModel.created_at.desc()).all()
    return [collection_to_dict(c, db) for c in collections]


@router.post("/collections", status_code=201)
def create_collection(data: CollectionCreate, db: Session = Depends(get_db)):
    col = ReferenceCollectionModel(
        id=generate_id(),
        name=data.name,
        description=data.description,
        tags_json=dump_json(data.tags),
        created_at=now_iso(),
    )
    db.add(col)
    db.commit()
    db.refresh(col)
    return collection_to_dict(col, db)


@router.delete("/collections/{collection_id}", status_code=204)
def delete_collection(collection_id: str, db: Session = Depends(get_db)):
    col = db.query(ReferenceCollectionModel).filter_by(id=collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    # Delete all associated image files
    images = db.query(ReferenceImageModel).filter_by(collection_id=collection_id).all()
    for img in images:
        for path in [img.file_path, img.thumbnail_path]:
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
    db.delete(col)
    db.commit()


@router.post("/collections/{collection_id}/images", status_code=201)
async def upload_images(
    collection_id: str,
    files: List[UploadFile] = File(...),
    reference_type: str = Form("inspiration"),
    db: Session = Depends(get_db),
):
    col = db.query(ReferenceCollectionModel).filter_by(id=collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    results = []
    for file in files:
        try:
            ref_image = await reference_manager_service.save_uploaded_reference(
                collection_id=collection_id,
                file=file,
                reference_type=reference_type,
            )
            img_record = ReferenceImageModel(
                id=generate_id(),
                collection_id=collection_id,
                file_path=ref_image["file_path"],
                thumbnail_path=ref_image["thumbnail_path"],
                filename=ref_image["filename"],
                reference_type=reference_type,
                weight=0.5,
                tags_json=dump_json([]),
                created_at=now_iso(),
            )
            db.add(img_record)
            db.commit()
            db.refresh(img_record)
            results.append(image_to_dict(img_record))
        except Exception as e:
            print(f"Error uploading {file.filename}: {e}")

    return results


@router.post("/collections/{collection_id}/folder")
async def add_folder(
    collection_id: str,
    data: FolderAdd,
    db: Session = Depends(get_db),
):
    col = db.query(ReferenceCollectionModel).filter_by(id=collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    folder_path = Path(data.folder_path)
    if not folder_path.exists() or not folder_path.is_dir():
        raise HTTPException(status_code=400, detail="Folder not found or not a directory")

    extensions = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
    image_files = [f for f in folder_path.iterdir() if f.suffix.lower() in extensions]

    results = []
    for img_file in image_files[:100]:  # limit to 100 images per folder
        try:
            ref_image = await reference_manager_service.copy_reference_file(
                collection_id=collection_id,
                source_path=str(img_file),
            )
            img_record = ReferenceImageModel(
                id=generate_id(),
                collection_id=collection_id,
                file_path=ref_image["file_path"],
                thumbnail_path=ref_image["thumbnail_path"],
                filename=img_file.name,
                reference_type="inspiration",
                weight=0.5,
                tags_json=dump_json([]),
                created_at=now_iso(),
            )
            db.add(img_record)
            results.append(img_record)
        except Exception as e:
            print(f"Error adding {img_file}: {e}")

    db.commit()
    return [image_to_dict(r) for r in results]


@router.get("/collections/{collection_id}/images")
def list_images(
    collection_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    col = db.query(ReferenceCollectionModel).filter_by(id=collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    query = db.query(ReferenceImageModel).filter_by(collection_id=collection_id)
    total = query.count()
    images = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [image_to_dict(img) for img in images],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/images/{image_id}")
def update_image(image_id: str, data: ImageUpdate, db: Session = Depends(get_db)):
    img = db.query(ReferenceImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    if data.reference_type is not None:
        img.reference_type = data.reference_type
    if data.weight is not None:
        img.weight = max(0.0, min(1.0, data.weight))
    if data.tags is not None:
        img.tags_json = dump_json(data.tags)
    db.commit()
    db.refresh(img)
    return image_to_dict(img)


@router.delete("/images/{image_id}", status_code=204)
def delete_image(image_id: str, db: Session = Depends(get_db)):
    img = db.query(ReferenceImageModel).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    for path in [img.file_path, img.thumbnail_path]:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
    db.delete(img)
    db.commit()
