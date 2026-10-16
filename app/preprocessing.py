"""Image preprocessing and validation module using Pillow.

Ensures uploaded packaging images are validated, sanitized, EXIF-corrected,
size-checked, and converted for provider compatibility in-memory.
"""

import io
from typing import List, Tuple
from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps

from app.config import get_settings

SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP"}
SUPPORTED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class ProcessedImage:
    """In-memory representation of a validated, sanitized food label image."""

    def __init__(self, data: bytes, mime_type: str, width: int, height: int, original_format: str):
        self.data: bytes = data
        self.mime_type: str = mime_type
        self.width: int = width
        self.height: int = height
        self.original_format: str = original_format


def validate_and_preprocess_single_image(
    raw_bytes: bytes,
    filename: str = "upload",
    source_index: int = 0
) -> ProcessedImage:
    """Validate, orient, resize if oversized, and convert a single image in-memory.

    Raises:
        HTTPException: If file is empty, oversized, corrupt, or unsupported format.
    """
    settings = get_settings()
    max_bytes = int(settings.max_image_mb * 1024 * 1024)

    if not raw_bytes or len(raw_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image {source_index + 1} ({filename}) is empty (0 bytes)."
        )

    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=(
                f"Image {source_index + 1} ({filename}) exceeds size limit of "
                f"{settings.max_image_mb} MB ({len(raw_bytes)} bytes uploaded)."
            )
        )

    # 1. First pass: open and verify integrity
    try:
        verify_img = Image.open(io.BytesIO(raw_bytes))
        detected_format = (verify_img.format or "").upper()
        if detected_format not in SUPPORTED_FORMATS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Image {source_index + 1} ({filename}) has unsupported format '{detected_format}'. "
                    f"Allowed formats: JPEG, PNG, WebP."
                )
            )
        verify_img.verify()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image {source_index + 1} ({filename}) is invalid or corrupt: {str(exc)}"
        ) from exc

    # 2. Second pass: reopen for actual processing (verify closes stream)
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        # Correct orientation from EXIF tags (e.g. phone camera tilt)
        img = ImageOps.exif_transpose(img)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to decode image {source_index + 1} ({filename}): {str(exc)}"
        ) from exc

    orig_width, orig_height = img.size

    # 3. Optional resize: preserve legibility while avoiding payload bloat
    max_dim = settings.max_image_dimension
    if orig_width > max_dim or orig_height > max_dim:
        scale = max_dim / float(max(orig_width, orig_height))
        new_width = max(1, int(orig_width * scale))
        new_height = max(1, int(orig_height * scale))
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        width, height = new_width, new_height
    else:
        width, height = orig_width, orig_height

    # 4. Standardize output format:
    # If image is RGBA/LA/P or WebP with transparency, export as PNG; otherwise JPEG
    out_format = "PNG" if img.mode in ("RGBA", "LA", "P") else "JPEG"
    mime_type = "image/png" if out_format == "PNG" else "image/jpeg"

    if out_format == "JPEG" and img.mode != "RGB":
        img = img.convert("RGB")

    buffer = io.BytesIO()
    if out_format == "JPEG":
        img.save(buffer, format="JPEG", quality=92, optimize=True)
    else:
        img.save(buffer, format="PNG", optimize=True)

    processed_bytes = buffer.getvalue()

    return ProcessedImage(
        data=processed_bytes,
        mime_type=mime_type,
        width=width,
        height=height,
        original_format=detected_format,
    )


async def preprocess_upload_files(
    files: List[UploadFile]
) -> List[ProcessedImage]:
    """Validate and preprocess multiple uploaded files.

    Raises:
        HTTPException: For count violations, empty file list, or any invalid image.
    """
    settings = get_settings()

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No images uploaded. At least one food label image is required."
        )

    if len(files) > settings.max_images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Too many images. Received {len(files)}, but maximum allowed is {settings.max_images}."
            )
        )

    processed_images: List[ProcessedImage] = []

    for idx, file in enumerate(files):
        # Quick check on filename or reported content_type if available
        content_type = file.content_type or ""
        if content_type and content_type.lower() not in SUPPORTED_MIME_TYPES and content_type != "application/octet-stream":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Image {idx + 1} has unsupported content-type '{content_type}'. "
                    f"Supported types: image/jpeg, image/png, image/webp."
                )
            )

        raw_bytes = await file.read()
        processed = validate_and_preprocess_single_image(
            raw_bytes=raw_bytes,
            filename=file.filename or f"image_{idx + 1}",
            source_index=idx
        )
        processed_images.append(processed)

    return processed_images
