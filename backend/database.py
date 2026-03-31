import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Any

from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean, Text,
    DateTime, ForeignKey, event
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker
from sqlalchemy.pool import StaticPool

from config import settings


def get_db_url():
    db_path = Path(settings.storage_path) / "apparel_studio.db"
    return f"sqlite:///{db_path}"


engine = create_engine(
    get_db_url(),
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def generate_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.utcnow().isoformat()


# ---- ORM Models ----

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    product_type = Column(String, nullable=False, default="tshirt")
    description = Column(Text, nullable=True)
    created_at = Column(String, default=now_iso)
    updated_at = Column(String, default=now_iso)

    images = relationship("GeneratedImageModel", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("GenerationJobModel", back_populates="project", cascade="all, delete-orphan")


class GeneratedImageModel(Base):
    __tablename__ = "generated_images"

    id = Column(String, primary_key=True, default=generate_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, default="")
    seed = Column(Integer, default=-1)
    width = Column(Integer, default=1024)
    height = Column(Integer, default=1024)
    steps = Column(Integer, default=30)
    guidance_scale = Column(Float, default=7.5)
    output_style = Column(String, default="flat_graphic")
    product_type = Column(String, default="tshirt")
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=False)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(String, default=now_iso)
    metadata_json = Column(Text, default="{}")
    references_json = Column(Text, default="[]")

    project = relationship("ProjectModel", back_populates="images")


class PromptPresetModel(Base):
    __tablename__ = "prompt_presets"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, default="")
    style_tags_json = Column(Text, default="[]")
    output_style = Column(String, default="flat_graphic")
    product_type = Column(String, nullable=True)
    is_builtin = Column(Boolean, default=False)
    created_at = Column(String, default=now_iso)


class ReferenceCollectionModel(Base):
    __tablename__ = "reference_collections"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    tags_json = Column(Text, default="[]")
    created_at = Column(String, default=now_iso)

    images = relationship("ReferenceImageModel", back_populates="collection", cascade="all, delete-orphan")


class ReferenceImageModel(Base):
    __tablename__ = "reference_images"

    id = Column(String, primary_key=True, default=generate_id)
    collection_id = Column(String, ForeignKey("reference_collections.id"), nullable=False)
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    reference_type = Column(String, default="inspiration")
    weight = Column(Float, default=0.5)
    tags_json = Column(Text, default="[]")
    created_at = Column(String, default=now_iso)

    collection = relationship("ReferenceCollectionModel", back_populates="images")


class GenerationJobModel(Base):
    __tablename__ = "generation_jobs"

    id = Column(String, primary_key=True, default=generate_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed, cancelled
    prompt = Column(Text, nullable=False)
    enhanced_prompt = Column(Text, nullable=True)
    negative_prompt = Column(Text, default="")
    settings_json = Column(Text, default="{}")
    progress = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(String, default=now_iso)
    completed_at = Column(String, nullable=True)
    result_image_ids_json = Column(Text, default="[]")

    project = relationship("ProjectModel", back_populates="jobs")


class ExportHistoryModel(Base):
    __tablename__ = "export_history"

    id = Column(String, primary_key=True, default=generate_id)
    image_id = Column(String, nullable=False)
    export_path = Column(String, nullable=False)
    export_format = Column(String, nullable=False)
    created_at = Column(String, default=now_iso)


class AppSettingModel(Base):
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)


# ---- DB Session ----

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    settings.ensure_dirs()
    Base.metadata.create_all(bind=engine)


# ---- Helper JSON accessors ----

def parse_json(value: Optional[str], default: Any = None) -> Any:
    if value is None:
        return default
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default


def dump_json(value: Any) -> str:
    return json.dumps(value)
