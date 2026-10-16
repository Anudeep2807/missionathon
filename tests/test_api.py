"""API Integration Tests for LabelLens endpoints (FastAPI TestClient)."""

import io
import json
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.schemas import (
    EvidenceItem,
    ExtractedAllergenStatement,
    ExtractedData,
    ExtractedIngredient,
    ExtractedNutritionItem,
)


@pytest.fixture
def client():
    """Create a FastAPI TestClient instance."""
    return TestClient(app)


def create_test_image_bytes(format: str = "PNG", size=(100, 100), color="white") -> bytes:
    """Generate in-memory valid image bytes for upload testing."""
    img = Image.new("RGB", size, color=color)
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    return buffer.getvalue()


def sample_profile_json() -> str:
    """Return standard test profile JSON string."""
    return json.dumps({
        "dietary_preference": "vegetarian",
        "allergens_to_avoid": ["milk", "peanuts"],
        "custom_restrictions": ["gelatin"],
        "nutrition_limits": {
            "sugar_g": 10.0,
            "sodium_mg": 500.0,
            "calories_kcal": 250.0
        }
    })


# ---------------------------------------------------------------------------
# Health Endpoint Tests
# ---------------------------------------------------------------------------

def test_health_check_endpoint(client):
    """GET /api/health must return status ok without any API key."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Input Validation & Error Handling Tests
# ---------------------------------------------------------------------------

def test_analyze_missing_images(client):
    """POST /api/analyze without images returns 400/422."""
    response = client.post(
        "/api/analyze",
        data={"profile": sample_profile_json()}
    )
    assert response.status_code in (400, 422)


def test_analyze_empty_profile(client):
    """POST /api/analyze with empty profile string returns 400."""
    image_bytes = create_test_image_bytes()
    response = client.post(
        "/api/analyze",
        files=[("images", ("label.png", image_bytes, "image/png"))],
        data={"profile": ""}
    )
    assert response.status_code == 400
    assert "profile" in response.json()["detail"].lower()


def test_analyze_malformed_profile_json(client):
    """POST /api/analyze with malformed JSON string returns 400."""
    image_bytes = create_test_image_bytes()
    response = client.post(
        "/api/analyze",
        files=[("images", ("label.png", image_bytes, "image/png"))],
        data={"profile": "{invalid-json:"}
    )
    assert response.status_code == 400
    assert "malformed json" in response.json()["detail"].lower()


def test_analyze_corrupt_image(client):
    """Corrupt image file payload returns 400."""
    corrupt_bytes = b"NOT_A_VALID_IMAGE_HEADER_DATA_1234567890"
    response = client.post(
        "/api/analyze",
        files=[("images", ("label.png", corrupt_bytes, "image/png"))],
        data={"profile": sample_profile_json()}
    )
    assert response.status_code == 400
    assert "invalid or corrupt" in response.json()["detail"].lower()


def test_analyze_unsupported_file_format(client):
    """Uploading unsupported format (e.g. BMP or text) returns 415."""
    # Create BMP bytes (not in JPEG, PNG, WEBP whitelist)
    img = Image.new("RGB", (50, 50), color="blue")
    bmp_buffer = io.BytesIO()
    img.save(bmp_buffer, format="BMP")
    bmp_bytes = bmp_buffer.getvalue()

    response = client.post(
        "/api/analyze",
        files=[("images", ("label.bmp", bmp_bytes, "image/bmp"))],
        data={"profile": sample_profile_json()}
    )
    assert response.status_code == 415
    assert "unsupported" in response.json()["detail"].lower()


def test_analyze_image_count_limit_exceeded(client):
    """Uploading more than MAX_IMAGES (default 5) returns 400."""
    image_bytes = create_test_image_bytes()
    # Send 6 files
    files = [("images", (f"img_{i}.png", image_bytes, "image/png")) for i in range(6)]
    response = client.post(
        "/api/analyze",
        files=files,
        data={"profile": sample_profile_json()}
    )
    assert response.status_code == 400
    assert "too many images" in response.json()["detail"].lower()


def test_analyze_oversized_image(client):
    """Uploading an image larger than MAX_IMAGE_MB returns 413."""
    with patch("app.preprocessing.get_settings") as mock_settings:
        # Set max_image_mb to a tiny fraction (0.0001 MB ~ 100 bytes)
        mock_obj = mock_settings.return_value
        mock_obj.max_image_mb = 0.0001
        mock_obj.max_images = 5
        mock_obj.max_image_dimension = 2048

        image_bytes = create_test_image_bytes(size=(200, 200))
        response = client.post(
            "/api/analyze",
            files=[("images", ("large.png", image_bytes, "image/png"))],
            data={"profile": sample_profile_json()}
        )
        assert response.status_code == 413
        assert "exceeds size limit" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Successful Mocked Extraction & End-to-End Pipeline
# ---------------------------------------------------------------------------

def test_analyze_success_with_mocked_ai():
    """End-to-end analyze endpoint successfully connects AI extraction to deterministic rules engine."""
    mock_extracted = ExtractedData(
        product_name="Organic Oat Milk Chocolate Cookies",
        brand="Nature Delights",
        serving_size="2 cookies (30g)",
        servings_per_container="8",
        ingredients=[
            ExtractedIngredient(
                name="Organic oat flour",
                original_text="Organic oat flour",
                evidence=[EvidenceItem(source_image_index=0, text="Organic oat flour", field_name="ingredients")]
            ),
            ExtractedIngredient(
                name="Peanut paste",
                original_text="Roasted peanut paste",
                evidence=[EvidenceItem(source_image_index=0, text="Roasted peanut paste", field_name="ingredients")]
            ),
            ExtractedIngredient(
                name="Cane sugar",
                original_text="Organic cane sugar",
                evidence=[EvidenceItem(source_image_index=0, text="Organic cane sugar", field_name="ingredients")]
            ),
        ],
        nutrition=[
            ExtractedNutritionItem(
                name="Total Sugars",
                amount=12.0,
                unit="g",
                serving_basis="per serving",
                evidence=[EvidenceItem(source_image_index=0, text="Total Sugars 12g", field_name="nutrition")]
            ),
            ExtractedNutritionItem(
                name="Sodium",
                amount=80.0,
                unit="mg",
                serving_basis="per serving",
                evidence=[EvidenceItem(source_image_index=0, text="Sodium 80mg", field_name="nutrition")]
            ),
        ],
        allergen_statements=[
            ExtractedAllergenStatement(
                statement_type="contains",
                text="Contains: peanuts",
                allergens=["peanuts"],
                evidence=[EvidenceItem(source_image_index=0, text="Contains: peanuts", field_name="allergen_statement")]
            )
        ],
        dietary_claims=[],
        warnings=[],
        extraction_status="observed"
    )

    image_bytes = create_test_image_bytes()
    profile = {
        "dietary_preference": "vegetarian",
        "allergens_to_avoid": ["peanuts", "fish"],
        "custom_restrictions": [],
        "nutrition_limits": {
            "sugar_g": 10.0  # Limit is 10g, label has 12g -> conflict
        }
    }

    with patch("app.main.extract_label_data", new=AsyncMock(return_value=mock_extracted)):
        with TestClient(app) as local_client:
            response = local_client.post(
                "/api/analyze",
                files=[
                    ("images", ("front.png", image_bytes, "image/png")),
                    ("images", ("back.png", image_bytes, "image/png")),
                ],
                data={
                    "profile": json.dumps(profile),
                    "request_id": "test-req-123"
                }
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response schema contract
            assert data["request_id"] == "test-req-123"
            assert "extracted" in data
            assert data["extracted"]["product_name"] == "Organic Oat Milk Chocolate Cookies"
            assert len(data["extracted"]["ingredients"]) == 3

            # Verify deterministic findings
            findings = data["findings"]
            assert len(findings) > 0

            # 1. Peanut conflict finding
            peanut_finding = next((f for f in findings if f["profile_rule"] == "peanuts"), None)
            assert peanut_finding is not None
            assert peanut_finding["status"] == "conflict"
            assert peanut_finding["category"] == "allergen"

            # 2. Fish safe finding (no conflict found)
            fish_finding = next((f for f in findings if f["profile_rule"] == "fish"), None)
            assert fish_finding is not None
            assert fish_finding["status"] == "no_conflict_found"

            # 3. Sugar limit exceeded finding (12g > 10g)
            sugar_finding = next((f for f in findings if "sugar_g" in (f["profile_rule"] or "")), None)
            assert sugar_finding is not None
            assert sugar_finding["status"] == "conflict"
            assert "12.0g" in sugar_finding["message"]


# ---------------------------------------------------------------------------
# Provider Error & Unusable Response Handling Tests
# ---------------------------------------------------------------------------

def test_analyze_missing_groq_api_key():
    """Missing GROQ_API_KEY returns HTTP 503 without crashing or leaking secrets."""
    image_bytes = create_test_image_bytes()
    with patch("app.analyzer.get_settings") as mock_settings:
        mock_obj = mock_settings.return_value
        mock_obj.groq_api_key = ""
        mock_obj.groq_model = "qwen/qwen3.8-27b"
        mock_obj.max_image_mb = 10.0
        mock_obj.max_images = 5
        mock_obj.max_image_dimension = 2048
        mock_obj.frontend_origins = ["http://localhost:5173"]

        with TestClient(app) as local_client:
            response = local_client.post(
                "/api/analyze",
                files=[("images", ("label.png", image_bytes, "image/png"))],
                data={"profile": sample_profile_json()}
            )
            assert response.status_code == 503
            assert "Groq API key is not configured" in response.json()["detail"]


def test_analyze_groq_provider_error():
    """Upstream Groq provider error is caught and translated to HTTP 502."""
    from fastapi import HTTPException
    mock_error = HTTPException(status_code=502, detail="Groq AI provider communication error: 503 Service Unavailable")

    image_bytes = create_test_image_bytes()
    with patch("app.main.extract_label_data", new=AsyncMock(side_effect=mock_error)):
        with TestClient(app) as local_client:
            response = local_client.post(
                "/api/analyze",
                files=[("images", ("label.png", image_bytes, "image/png"))],
                data={"profile": sample_profile_json()}
            )
            assert response.status_code == 502
            assert "Groq AI provider" in response.json()["detail"]


def test_analyze_unusable_model_response():
    """Unparseable or degraded AI model response returns status partially_readable with warning without crashing."""
    degraded_extracted = ExtractedData(
        extraction_status="partially_readable",
        warnings=[
            {"text": "AI model output could not be strictly validated into standard schema", "is_unreadable": True, "evidence": []}
        ]
    )
    image_bytes = create_test_image_bytes()
    with patch("app.main.extract_label_data", new=AsyncMock(return_value=degraded_extracted)):
        with TestClient(app) as local_client:
            response = local_client.post(
                "/api/analyze",
                files=[("images", ("label.png", image_bytes, "image/png"))],
                data={"profile": sample_profile_json()}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["extracted"]["extraction_status"] == "partially_readable"
            # Inconclusive findings because ingredients list was not read
            unknown_findings = [f for f in data["findings"] if f["status"] == "unknown"]
            assert len(unknown_findings) > 0


def test_groq_extraction_direct_mock():
    """Verify Groq vision extraction parser and schema mapping."""
    import asyncio
    from unittest.mock import MagicMock
    from app.analyzer import extract_label_data_with_groq
    from app.preprocessing import ProcessedImage

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "product_name": "Groq Snack Bar",
        "brand": "FastFoods",
        "ingredients": [
            {
                "name": "Almonds",
                "original_text": "Roasted almonds",
                "evidence": [{"source_image_index": 0, "text": "Roasted almonds", "field_name": "ingredients"}]
            }
        ],
        "nutrition": [],
        "allergen_statements": [],
        "dietary_claims": [],
        "warnings": [],
        "extraction_status": "observed"
    })
    mock_client.chat.completions.create.return_value.choices = [mock_choice]

    fake_img = ProcessedImage(
        data=create_test_image_bytes(),
        mime_type="image/png",
        width=100,
        height=100,
        original_format="PNG"
    )

    result = asyncio.run(extract_label_data_with_groq([fake_img], client=mock_client))
    assert result.product_name == "Groq Snack Bar"
    assert len(result.ingredients) == 1
    assert result.ingredients[0].name == "Almonds"


# ---------------------------------------------------------------------------
# CORS & Security Tests
# ---------------------------------------------------------------------------

def test_cors_headers_allowed_origin(client):
    """CORS response headers are returned for allowed development origin without wildcard."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_api_key_sanitization_masking():
    """Sanitizer reliably masks Groq keys and Bearer tokens from error strings."""
    from app.analyzer import sanitize_error_message

    leaked_msg = "Error 401: Invalid authentication for key gsk_Secret1234567890abcdef with Bearer tok_xyz"
    safe = sanitize_error_message(leaked_msg)

    assert "gsk_Secret1234567890abcdef" not in safe
    assert "[REDACTED_KEY]" in safe
    assert "tok_xyz" not in safe
    assert "Bearer [REDACTED]" in safe


def test_analyze_full_response_contract_pydantic_validation(client):
    """Returned JSON response strictly matches AnalyzeResponse Pydantic schema."""
    from app.schemas import AnalyzeResponse

    mock_extracted = ExtractedData(
        product_name="Verified Product",
        brand="Verified Brand",
        serving_size="30g",
        ingredients=[
            ExtractedIngredient(name="Oats", original_text="Rolled oats", evidence=[])
        ],
        nutrition=[
            ExtractedNutritionItem(name="Calories", amount=120.0, unit="kcal", serving_basis="per serving", evidence=[])
        ],
        allergen_statements=[],
        dietary_claims=[],
        warnings=[],
        extraction_status="observed"
    )

    image_bytes = create_test_image_bytes()
    profile = {"allergens_to_avoid": ["peanuts"]}

    with patch("app.main.extract_label_data", new=AsyncMock(return_value=mock_extracted)):
        response = client.post(
            "/api/analyze",
            files=[
                ("images", ("img1.jpg", image_bytes, "image/jpeg")),
                ("images", ("img2.jpg", image_bytes, "image/jpeg")),
            ],
            data={
                "profile": json.dumps(profile),
                "request_id": "req-custom-999"
            }
        )

        assert response.status_code == 200
        parsed = AnalyzeResponse.model_validate(response.json())
        assert parsed.request_id == "req-custom-999"
        assert parsed.extracted.product_name == "Verified Product"
        assert len(parsed.findings) > 0
        assert parsed.findings[0].category == "allergen"
