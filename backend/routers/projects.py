from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    get_db, ProjectModel, GeneratedImageModel,
    generate_id, now_iso, parse_json
)

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    product_type: str = "tshirt"
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    product_type: Optional[str] = None
    description: Optional[str] = None


def project_to_dict(project: ProjectModel, db: Session) -> dict:
    image_count = db.query(GeneratedImageModel).filter_by(project_id=project.id).count()
    # Get thumbnail from most recent image
    latest_image = (
        db.query(GeneratedImageModel)
        .filter_by(project_id=project.id)
        .order_by(GeneratedImageModel.created_at.desc())
        .first()
    )
    return {
        "id": project.id,
        "name": project.name,
        "product_type": project.product_type,
        "description": project.description,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "image_count": image_count,
        "thumbnail_url": latest_image.thumbnail_path if latest_image else None,
    }


@router.get("")
def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(ProjectModel).order_by(ProjectModel.updated_at.desc())
    total = query.count()
    projects = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [project_to_dict(p, db) for p in projects],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = ProjectModel(
        id=generate_id(),
        name=data.name,
        product_type=data.product_type,
        description=data.description,
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project_to_dict(project, db)


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_to_dict(project, db)


@router.put("/{project_id}")
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if data.name is not None:
        project.name = data.name
    if data.product_type is not None:
        project.product_type = data.product_type
    if data.description is not None:
        project.description = data.description
    project.updated_at = now_iso()
    db.commit()
    db.refresh(project)
    return project_to_dict(project, db)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project_id == "default":
        raise HTTPException(status_code=400, detail="Cannot delete the default project")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/duplicate", status_code=201)
def duplicate_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    new_project = ProjectModel(
        id=generate_id(),
        name=f"{project.name} (Copy)",
        product_type=project.product_type,
        description=project.description,
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return project_to_dict(new_project, db)
