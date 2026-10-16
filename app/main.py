"""Main FastAPI application for LabelLens backend.

Provides endpoints for health checking and food label dietary analysis.
"""
import json
import logging
import uuid
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.analyzer import extract_label_data
from app.compare import run_dietary_comparison
from app.config import get_settings
from app.preprocessing import preprocess_upload_files
from app.schemas import AnalyzeResponse, HealthResponse, UserProfile

# Configure logging without sensitive data
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("labellens")

app = FastAPI(
    title="LabelLens Backend API",
    description="Food package label OCR, nutrition analysis, and deterministic dietary restriction engine",
    version="1.0.0",
)

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Static frontend assets directory
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# CORS configuration
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")


@app.get(
    "/",
    summary="Root Endpoint",
    tags=["System"],
    include_in_schema=False
)
def read_root():
    """Return frontend application if built, else API welcome."""
    index_file = frontend_dist / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    return {"message": "Welcome to LabelLens Backend API! Go to /docs for Swagger documentation."}


@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Health Check",
    tags=["System"]
)
async def health_check() -> HealthResponse:
    """Return system operational status.

    Does not require a Gemini API key or external service dependencies.
    """
    return HealthResponse(status="ok")


@app.post(
    "/api/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze Food Label Images",
    tags=["Analysis"]
)
async def analyze_food_label(
    images: List[UploadFile] = File(
        ...,
        description="One or more food package label images (repeated form field 'images')"
    ),
    profile: Optional[str] = Form(
        None,
        description="JSON string representing user dietary preferences, allergens, and limits"
    ),
    request_id: Optional[str] = Form(
        None,
        description="Optional client-provided correlation or request identifier"
    ),
) -> AnalyzeResponse:
    """Analyze packaged food images against a user dietary profile.

    Validates uploaded images and dietary profile JSON, performs structured
    vision extraction, and evaluates rules deterministically.
    """
    effective_request_id = request_id or str(uuid.uuid4())
    logger.info("Received analyze request: request_id=%s, image_count=%d", effective_request_id, len(images))

    # 1. Parse and validate profile JSON
    if not profile or not profile.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 'profile' field is required and cannot be empty."
        )

    try:
        profile_dict = json.loads(profile)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON in 'profile' field: {str(exc)}"
        ) from exc

    try:
        user_profile = UserProfile.model_validate(profile_dict)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Profile schema validation failed: {exc.errors()}"
        ) from exc

    # 2. Validate and preprocess uploaded images in-memory
    processed_images = await preprocess_upload_files(images)

    # 3. Vision-based label extraction
    extracted_data = await extract_label_data(processed_images)

    # 4. Deterministic dietary rule evaluation
    findings = run_dietary_comparison(extracted_data, user_profile)

    return AnalyzeResponse(
        request_id=effective_request_id,
        extracted=extracted_data,
        findings=findings,
    )


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    """Fallback handler for Single Page Application client-side routing."""
    if full_path.startswith("api/") or full_path in ["docs", "openapi.json", "redoc"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint not found")
    file_path = frontend_dist / full_path
    if file_path.is_file():
        return FileResponse(str(file_path))
    index_file = frontend_dist / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    return {"message": "Welcome to LabelLens Backend API! Go to /docs for Swagger documentation."}