"""AI-powered food label extractor using the official Groq Python SDK.

Handles vision analysis across multiple package images, structured JSON extraction,
evidence tracking, deduplication of overlapping areas, and graceful error handling.
"""

import base64
import json
import logging
import re
from typing import List, Optional

from fastapi import HTTPException, status
from groq import Groq, APIError, RateLimitError, BadRequestError
from pydantic import ValidationError

from app.config import get_settings
from app.preprocessing import ProcessedImage
from app.schemas import (
    EvidenceItem,
    ExtractedAllergenStatement,
    ExtractedClaim,
    ExtractedData,
    ExtractedIngredient,
    ExtractedNutritionItem,
    ExtractedSection,
    ExtractedWarning,
)

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are an expert food packaging and regulatory label analyst.
Your task is to analyze the provided images of a packaged food item and extract factual, legible label data into strict JSON format.

RULES:
1. NEVER invent or hallucinate ingredients, nutrition values, product names, or certifications.
2. If text is blurry, occluded, or unreadable, mark it in the 'warnings' section with 'is_unreadable': true. Do NOT guess what it says.
3. Preserve the exact wording and original order of the ingredients list.
4. Extract nutrition facts with explicit numbers, units, and serving basis (e.g., 'per serving', 'per 100g').
5. Note all explicit allergen declarations (e.g., 'Contains milk') and precautionary warnings (e.g., 'May contain peanuts', 'Made in a facility that also processes soy').
6. For EVERY extracted ingredient, nutrition item, claim, or statement, include at least one evidence item with:
   - 'source_image_index': the 0-based index of the image where the text is visible
   - 'text': the exact snippet read from that image
   - 'field_name': 'ingredients', 'nutrition', 'allergens', or 'claims'
7. When multiple images show overlapping sections of the same package, synthesize them without creating duplicate ingredients or conflicting duplicate nutrition items.

Return your response ONLY as a valid JSON object matching this structure:
{
  "product_name": string or null,
  "brand": string or null,
  "serving_size": string or null,
  "servings_per_container": string or null,
  "ingredients": [
    {
      "name": "ingredient name",
      "original_text": "verbatim text with qualifiers",
      "is_sub_ingredient": false,
      "parent_ingredient": null,
      "evidence": [
        {"source_image_index": 0, "text": "...", "field_name": "ingredients", "confidence": 0.95}
      ]
    }
  ],
  "nutrition": [
    {
      "name": "Calories",
      "amount": 200,
      "unit": "kcal",
      "serving_basis": "per serving",
      "daily_value_percent": null,
      "evidence": [
        {"source_image_index": 0, "text": "...", "field_name": "nutrition", "confidence": 0.95}
      ]
    }
  ],
  "allergen_statements": [
    {
      "statement_type": "contains",
      "text": "Contains: milk, soy",
      "allergens": ["milk", "soy"],
      "evidence": [
        {"source_image_index": 0, "text": "...", "field_name": "allergen_statement", "confidence": 0.95}
      ]
    }
  ],
  "dietary_claims": [
    {
      "claim": "Gluten Free",
      "certification": null,
      "evidence": [
        {"source_image_index": 0, "text": "...", "field_name": "claims", "confidence": 0.95}
      ]
    }
  ],
  "sections": [
    {
      "title": "Directions",
      "text": "...",
      "evidence": [{"source_image_index": 0, "text": "...", "field_name": "sections", "confidence": 0.9}]
    }
  ],
  "warnings": [
    {
      "text": "...",
      "is_unreadable": false,
      "evidence": []
    }
  ],
  "extraction_status": "observed"
}
"""


def get_groq_client() -> Groq:
    """Instantiate and return the Groq SDK client."""
    settings = get_settings()
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Groq API key is not configured on the server. "
                "Please set GROQ_API_KEY in your server/.env file."
            )
        )
    return Groq(api_key=settings.groq_api_key)


def clean_json_text(text: str) -> str:
    """Strip markdown code fence wrappers from model response if present."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def deduplicate_extracted_data(extracted: ExtractedData) -> ExtractedData:
    """Deduplicate ingredients and nutrition items that might overlap across multiple photos."""
    seen_ingredients = {}
    deduped_ingredients = []
    for ing in extracted.ingredients:
        key = ing.name.lower().strip()
        if key in seen_ingredients:
            existing = seen_ingredients[key]
            existing.evidence.extend(ing.evidence)
        else:
            seen_ingredients[key] = ing
            deduped_ingredients.append(ing)
    extracted.ingredients = deduped_ingredients

    seen_nutrition = {}
    deduped_nutrition = []
    for nut in extracted.nutrition:
        basis = (nut.serving_basis or "per serving").lower().strip()
        key = (nut.name.lower().strip(), basis)
        if key in seen_nutrition:
            existing = seen_nutrition[key]
            existing.evidence.extend(nut.evidence)
            if existing.amount is None and nut.amount is not None:
                existing.amount = nut.amount
                existing.unit = nut.unit
        else:
            seen_nutrition[key] = nut
            deduped_nutrition.append(nut)
    extracted.nutrition = deduped_nutrition

    return extracted


def sanitize_error_message(msg: str) -> str:
    """Mask any potential API key or authorization tokens from error strings."""
    settings = get_settings()
    if settings.groq_api_key and settings.groq_api_key in msg:
        msg = msg.replace(settings.groq_api_key, "[REDACTED]")
    msg = re.sub(r"gsk_[a-zA-Z0-9_-]+", "[REDACTED_KEY]", msg)
    msg = re.sub(r"Bearer\s+[a-zA-Z0-9_\-\.]+", "Bearer [REDACTED]", msg)
    return msg


async def extract_label_data_with_groq(
    images: List[ProcessedImage],
    client: Optional[Groq] = None
) -> ExtractedData:
    """Perform multi-image vision extraction using the configured Groq Vision model."""
    settings = get_settings()

    if client is None:
        client = get_groq_client()

    user_content = [
        {
            "type": "text",
            "text": (
                "Please inspect all attached packaging images below and produce the "
                "comprehensive JSON analysis according to the instructions in the system prompt."
            )
        }
    ]

    for idx, img in enumerate(images):
        b64_data = base64.b64encode(img.data).decode("utf-8")
        user_content.append({
            "type": "text",
            "text": f"Image #{idx} (dimensions: {img.width}x{img.height}):"
        })
        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img.mime_type};base64,{b64_data}"
            }
        })

    messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]

def normalize_raw_json(data: dict) -> dict:
    """Sanitize and normalize raw JSON from model to conform strictly to ExtractedData schema."""
    if not isinstance(data, dict):
        return {}

    # 1. Normalize extraction_status
    valid_statuses = {"observed", "partially_readable", "unreadable", "not_detected", "unknown"}
    status_raw = str(data.get("extraction_status", "")).lower().strip()
    if status_raw not in valid_statuses:
        if status_raw in ("failed", "error", "none"):
            data["extraction_status"] = "unreadable"
        elif status_raw in ("success", "completed", "ok", "done"):
            data["extraction_status"] = "observed"
        elif "partial" in status_raw:
            data["extraction_status"] = "partially_readable"
        else:
            data["extraction_status"] = "observed"

    # 2. Normalize allergen_statements
    valid_statement_types = {"contains", "may_contain", "facility", "unspecified"}
    for stmt in data.get("allergen_statements", []):
        if isinstance(stmt, dict):
            st_raw = str(stmt.get("statement_type", "")).lower().strip().replace(" ", "_")
            if "may" in st_raw or "trace" in st_raw or "precautionary" in st_raw:
                stmt["statement_type"] = "may_contain"
            elif "facility" in st_raw or "equipment" in st_raw or "shared" in st_raw:
                stmt["statement_type"] = "facility"
            elif "contain" in st_raw:
                stmt["statement_type"] = "contains"
            elif st_raw not in valid_statement_types:
                stmt["statement_type"] = "unspecified"

    # 3. Normalize nutrition amounts (convert string numbers like '200g' -> amount: 200, unit: 'g')
    for nut in data.get("nutrition", []):
        if isinstance(nut, dict):
            amt = nut.get("amount")
            if isinstance(amt, str):
                match = re.search(r"([0-9]+(?:\.[0-9]+)?)", amt)
                if match:
                    try:
                        nut["amount"] = float(match.group(1))
                    except ValueError:
                        nut["amount"] = None
                else:
                    nut["amount"] = None

    return data


async def extract_label_data_with_groq(
    images: List[ProcessedImage],
    client: Optional[Groq] = None
) -> ExtractedData:
    """Perform multi-image vision extraction using the configured Groq Vision model."""
    settings = get_settings()

    if client is None:
        client = get_groq_client()

    user_content = [
        {
            "type": "text",
            "text": (
                "Please inspect all attached packaging images below and produce the "
                "comprehensive JSON analysis according to the instructions in the system prompt. "
                "Keep evidence snippets very brief to stay within token limits."
            )
        }
    ]

    for idx, img in enumerate(images):
        b64_data = base64.b64encode(img.data).decode("utf-8")
        user_content.append({
            "type": "text",
            "text": f"Image #{idx} (dimensions: {img.width}x{img.height}):"
        })
        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img.mime_type};base64,{b64_data}"
            }
        })

    messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]

    max_tokens = getattr(settings, "groq_max_tokens", 800)

    try:
        completion = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=max_tokens,
        )

        raw_text = completion.choices[0].message.content or ""
        cleaned = clean_json_text(raw_text)

        if not cleaned:
            return ExtractedData(
                extraction_status="unknown",
                warnings=[
                    ExtractedWarning(
                        text="AI provider returned an empty response. No label text could be read.",
                        is_unreadable=True
                    )
                ]
            )

        try:
            parsed_json = json.loads(cleaned)
            normalized_json = normalize_raw_json(parsed_json)
            extracted = ExtractedData.model_validate(normalized_json)
            return deduplicate_extracted_data(extracted)
        except (json.JSONDecodeError, ValidationError) as parse_err:
            logger.warning("Failed to parse Groq response as ExtractedData: %s", parse_err)
            return ExtractedData(
                extraction_status="partially_readable",
                warnings=[
                    ExtractedWarning(
                        text=f"AI model output could not be strictly validated into standard schema: {str(parse_err)}",
                        is_unreadable=True
                    )
                ]
            )
    except RateLimitError as rate_err:
        raw_msg = getattr(rate_err, "message", str(rate_err))
        safe_msg = sanitize_error_message(raw_msg)
        logger.warning("Groq rate limit encountered: %s. Attempting fallback with compact tokens...", safe_msg)
        try:
            # Fallback attempt with compact token budget
            retry_completion = client.chat.completions.create(
                model=settings.groq_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=500,
            )
            raw_text = retry_completion.choices[0].message.content or ""
            cleaned = clean_json_text(raw_text)
            if cleaned:
                parsed_json = json.loads(cleaned)
                normalized_json = normalize_raw_json(parsed_json)
                extracted = ExtractedData.model_validate(normalized_json)
                return deduplicate_extracted_data(extracted)
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Groq AI provider rate limit reached (1,000 output tokens/minute limit on free tier). "
                "Please wait 30 seconds before analyzing another image, or test immediately with one of the sample product presets."
            )
        ) from rate_err
    except HTTPException:
        raise
    except (APIError, BadRequestError) as api_err:
        raw_msg = getattr(api_err, "message", str(api_err))
        safe_msg = sanitize_error_message(raw_msg)
        logger.error("Groq API error during extraction: %s", safe_msg)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq AI provider communication error: {safe_msg}"
        ) from api_err
    except Exception as exc:
        safe_exc = sanitize_error_message(str(exc))
        logger.error("Unexpected error in Groq vision extraction: %s", safe_exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during vision label processing."
        ) from exc


# Primary extraction entrypoint
extract_label_data = extract_label_data_with_groq

# Compatibility alias
extract_label_data_with_gemini = extract_label_data_with_groq
