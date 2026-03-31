import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    get_db, GenerationJobModel, ProjectModel,
    generate_id, now_iso, dump_json, parse_json
)
from config import settings

router = APIRouter()


class GenerationSettingsSchema(BaseModel):
    product_type: str = "tshirt"
    output_style: str = "flat_graphic"
    background_mode: str = "transparent"
    width: int = 1024
    height: int = 1024
    steps: int = 30
    guidance_scale: float = 7.5
    seed: int = -1
    num_outputs: int = 1
    creativity: float = 0.7
    reference_strength: float = 0.5
    solid_color: Optional[str] = None
    style_tags: List[str] = []
    reference_ids: List[str] = []
    enhance_prompt: bool = True
    safety_check: bool = True


class StartGenerationRequest(BaseModel):
    project_id: str
    prompt: str
    negative_prompt: str = ""
    settings: GenerationSettingsSchema = GenerationSettingsSchema()


class EnhancePromptRequest(BaseModel):
    prompt: str
    product_type: str = "tshirt"
    style_tags: List[str] = []
    output_style: str = "flat_graphic"


class SafetyCheckRequest(BaseModel):
    prompt: str


def job_to_dict(job: GenerationJobModel) -> dict:
    return {
        "id": job.id,
        "project_id": job.project_id,
        "status": job.status,
        "prompt": job.prompt,
        "enhanced_prompt": job.enhanced_prompt,
        "negative_prompt": job.negative_prompt,
        "settings": parse_json(job.settings_json, {}),
        "progress": job.progress,
        "error": job.error,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
        "result_image_ids": parse_json(job.result_image_ids_json, []),
    }


async def run_generation_job(job_id: str):
    """Background task that runs the image generation pipeline."""
    from database import SessionLocal, GenerationJobModel, GeneratedImageModel, ProjectModel
    from services.safety_filter import safety_filter_service
    from services.prompt_enhancer import prompt_enhancer_service
    from services.image_generator import image_generator_service

    db = SessionLocal()
    try:
        job = db.query(GenerationJobModel).filter_by(id=job_id).first()
        if not job:
            return

        job.status = "running"
        job.progress = 5
        db.commit()

        gen_settings = parse_json(job.settings_json, {})
        prompt = job.prompt
        negative_prompt = job.negative_prompt

        # 1. Safety check
        if gen_settings.get("safety_check", True) and settings.safety_filter_enabled:
            try:
                safety_result = await safety_filter_service.check_prompt_safety(prompt)
                if not safety_result["is_safe"] and safety_result["risk_level"] == "high":
                    # Use suggested prompt if available
                    if safety_result.get("suggested_prompt"):
                        prompt = safety_result["suggested_prompt"]
            except Exception as e:
                print(f"Safety check error: {e}")

        job.progress = 15
        db.commit()

        # 2. Enhance prompt with Ollama
        if gen_settings.get("enhance_prompt", True) and settings.auto_enhance_prompts:
            try:
                enhanced = await prompt_enhancer_service.enhance_prompt(
                    prompt=prompt,
                    product_type=gen_settings.get("product_type", "tshirt"),
                    style_tags=gen_settings.get("style_tags", []),
                    output_style=gen_settings.get("output_style", "flat_graphic"),
                )
                if enhanced.get("enhanced_prompt"):
                    job.enhanced_prompt = enhanced["enhanced_prompt"]
                    prompt = enhanced["enhanced_prompt"]
                if enhanced.get("negative_prompt") and not negative_prompt:
                    negative_prompt = enhanced["negative_prompt"]
            except Exception as e:
                print(f"Enhancement error (non-fatal): {e}")

        job.progress = 25
        db.commit()

        # 3. Generate images
        def on_progress(progress: int):
            job.progress = 25 + int(progress * 0.7)
            db.commit()

        try:
            image_paths = await image_generator_service.generate(
                job_id=job.id,
                prompt=prompt,
                negative_prompt=negative_prompt,
                settings_dict=gen_settings,
                on_progress=on_progress,
            )
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            job.completed_at = now_iso()
            db.commit()
            return

        # 4. Save results to DB
        result_ids = []
        for image_path in image_paths:
            from pathlib import Path as _Path
            from config import settings as _settings
            img_p = _Path(image_path)
            thumb_dir = _Path(_settings.thumbnails_path)
            thumb_dir.mkdir(parents=True, exist_ok=True)
            thumb_path = str(thumb_dir / img_p.name)

            img_id = generate_id()
            img_record = GeneratedImageModel(
                id=img_id,
                project_id=job.project_id,
                prompt=job.prompt,
                negative_prompt=negative_prompt,
                seed=gen_settings.get("seed", -1),
                width=gen_settings.get("width", 1024),
                height=gen_settings.get("height", 1024),
                steps=gen_settings.get("steps", 30),
                guidance_scale=gen_settings.get("guidance_scale", 7.5),
                output_style=gen_settings.get("output_style", "flat_graphic"),
                product_type=gen_settings.get("product_type", "tshirt"),
                file_path=image_path,
                thumbnail_path=thumb_path,
                is_favorite=False,
                created_at=now_iso(),
                metadata_json=dump_json({"enhanced_prompt": job.enhanced_prompt}),
                references_json=dump_json(gen_settings.get("reference_ids", [])),
            )
            db.add(img_record)
            result_ids.append(img_id)

            # Update project timestamp
            project = db.query(ProjectModel).filter_by(id=job.project_id).first()
            if project:
                project.updated_at = now_iso()

        job.status = "completed"
        job.progress = 100
        job.completed_at = now_iso()
        job.result_image_ids_json = dump_json(result_ids)
        db.commit()

    except Exception as e:
        db = SessionLocal()
        job = db.query(GenerationJobModel).filter_by(id=job_id).first()
        if job:
            job.status = "failed"
            job.error = str(e)
            job.completed_at = now_iso()
            db.commit()
    finally:
        db.close()


@router.post("/start")
async def start_generation(
    data: StartGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Ensure project exists
    project = db.query(ProjectModel).filter_by(id=data.project_id).first()
    if not project:
        # Create a default project if none found
        from database import ProjectModel as PM
        project = PM(
            id=data.project_id,
            name="Default Project",
            product_type=data.settings.product_type,
            created_at=now_iso(),
            updated_at=now_iso(),
        )
        db.add(project)
        db.commit()

    job = GenerationJobModel(
        id=generate_id(),
        project_id=data.project_id,
        status="pending",
        prompt=data.prompt,
        negative_prompt=data.negative_prompt,
        settings_json=dump_json(data.settings.model_dump()),
        progress=0,
        created_at=now_iso(),
        result_image_ids_json=dump_json([]),
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(run_generation_job, job.id)

    return {"job_id": job.id}


@router.get("/job/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(GenerationJobModel).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_to_dict(job)


@router.get("/jobs")
def list_jobs(limit: int = 10, db: Session = Depends(get_db)):
    jobs = (
        db.query(GenerationJobModel)
        .order_by(GenerationJobModel.created_at.desc())
        .limit(limit)
        .all()
    )
    return [job_to_dict(j) for j in jobs]


@router.post("/enhance-prompt")
async def enhance_prompt(data: EnhancePromptRequest):
    from services.prompt_enhancer import prompt_enhancer_service
    try:
        result = await prompt_enhancer_service.enhance_prompt(
            prompt=data.prompt,
            product_type=data.product_type,
            style_tags=data.style_tags,
            output_style=data.output_style,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama enhancement failed: {str(e)}")


@router.post("/safety-check")
async def safety_check(data: SafetyCheckRequest):
    from services.safety_filter import safety_filter_service
    try:
        result = await safety_filter_service.check_prompt_safety(data.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/job/{job_id}", status_code=204)
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(GenerationJobModel).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Job is already {job.status}")
    job.status = "cancelled"
    job.completed_at = now_iso()
    db.commit()
