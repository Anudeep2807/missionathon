from typing import Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Dietary Profile Schemas (Input)
# ---------------------------------------------------------------------------

class NutritionLimits(BaseModel):
    """Nutritional limit thresholds specified by the user."""
    calories_kcal: Optional[float] = Field(None, ge=0, description="Max calories in kcal per serving")
    sugar_g: Optional[float] = Field(None, ge=0, description="Max sugar in grams per serving")
    sodium_mg: Optional[float] = Field(None, ge=0, description="Max sodium in mg per serving")
    carbohydrates_g: Optional[float] = Field(None, ge=0, description="Max carbohydrates in grams per serving")
    total_fat_g: Optional[float] = Field(None, ge=0, description="Max total fat in grams per serving")
    saturated_fat_g: Optional[float] = Field(None, ge=0, description="Max saturated fat in grams per serving")
    protein_g: Optional[float] = Field(None, ge=0, description="Max or min protein in grams per serving")
    fiber_g: Optional[float] = Field(None, ge=0, description="Max or min fiber in grams per serving")

    model_config = {"extra": "allow"}


class UserProfile(BaseModel):
    """User dietary preferences and restrictions."""
    dietary_preference: Optional[str] = Field(
        None,
        description="Dietary preference, e.g. vegetarian, vegan, pescatarian"
    )
    allergens_to_avoid: List[str] = Field(
        default_factory=list,
        description="Allergens to avoid, e.g. ['milk', 'peanuts', 'soy']"
    )
    custom_restrictions: List[str] = Field(
        default_factory=list,
        description="Custom ingredient names or phrases, e.g. ['gelatin', 'palm oil']"
    )
    nutrition_limits: Optional[Dict[str, Optional[float]]] = Field(
        default_factory=dict,
        description="Per-serving nutritional limits"
    )

    model_config = {"extra": "allow"}


# ---------------------------------------------------------------------------
# Evidence Schema
# ---------------------------------------------------------------------------

class EvidenceItem(BaseModel):
    """Verifiable trace linking extracted items and findings back to label text."""
    source_image_index: int = Field(..., description="0-indexed identifier of source image")
    text: str = Field(..., description="Original snippet or transcription from the label")
    field_name: str = Field(..., description="Label area, e.g. 'ingredients', 'nutrition', 'allergen_statement'")
    bounding_box: Optional[List[float]] = Field(
        None,
        description="Optional bounding box coordinates [ymin, xmin, ymax, xmax] if available"
    )
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Confidence score for this evidence item"
    )


# ---------------------------------------------------------------------------
# Label Extraction Schemas (AI Output)
# ---------------------------------------------------------------------------

class ExtractedIngredient(BaseModel):
    """Individual ingredient extracted from the label."""
    name: str = Field(..., description="Ingredient name")
    original_text: Optional[str] = Field(None, description="Exact phrase from label including modifiers")
    is_sub_ingredient: bool = Field(False, description="Whether this is inside parentheses of a compound ingredient")
    parent_ingredient: Optional[str] = Field(None, description="Parent compound ingredient if applicable")
    evidence: List[EvidenceItem] = Field(default_factory=list)


class ExtractedNutritionItem(BaseModel):
    """Nutritional value extracted from the nutrition facts panel."""
    name: str = Field(..., description="Nutrient name, e.g. 'Calories', 'Sugars', 'Sodium'")
    amount: Optional[float] = Field(None, description="Numerical amount extracted")
    unit: Optional[str] = Field(None, description="Unit of measurement, e.g. 'g', 'mg', 'kcal'")
    serving_basis: Optional[str] = Field("per serving", description="e.g. 'per serving', 'per 100g'")
    daily_value_percent: Optional[float] = Field(None, description="Percent Daily Value (%DV)")
    evidence: List[EvidenceItem] = Field(default_factory=list)


class ExtractedAllergenStatement(BaseModel):
    """Precautionary or explicit allergen notice."""
    statement_type: Literal["contains", "may_contain", "facility", "unspecified"] = Field(
        "unspecified",
        description="'contains' = explicit declaration, 'may_contain' = precautionary, 'facility' = shared equipment"
    )
    text: str = Field(..., description="Exact allergen statement text")
    allergens: List[str] = Field(default_factory=list, description="Specific allergens mentioned")
    evidence: List[EvidenceItem] = Field(default_factory=list)


class ExtractedClaim(BaseModel):
    """Dietary claims, certifications, or marketing callouts."""
    claim: str = Field(..., description="e.g. 'Gluten-Free', 'Non-GMO', 'Kosher'")
    certification: Optional[str] = Field(None, description="Certifying body if mentioned")
    evidence: List[EvidenceItem] = Field(default_factory=list)


class ExtractedSection(BaseModel):
    """Miscellaneous label sections like directions, storage, or distributor."""
    title: str = Field(..., description="Section title or topic")
    text: str = Field(..., description="Content of section")
    evidence: List[EvidenceItem] = Field(default_factory=list)


class ExtractedWarning(BaseModel):
    """Quality or legibility warning discovered on the label."""
    text: str = Field(..., description="Description of warning or unreadable region")
    is_unreadable: bool = Field(False, description="True if text could not be deciphered")
    evidence: List[EvidenceItem] = Field(default_factory=list)


class ExtractedData(BaseModel):
    """Full structured extraction from food packaging images."""
    product_name: Optional[str] = Field(None, description="Product title or trade name")
    brand: Optional[str] = Field(None, description="Brand or manufacturer")
    serving_size: Optional[str] = Field(None, description="e.g. '1 package (45g)', '2 cookies (30g)'")
    servings_per_container: Optional[str] = Field(None, description="e.g. 'About 3', '1'")
    ingredients: List[ExtractedIngredient] = Field(default_factory=list)
    nutrition: List[ExtractedNutritionItem] = Field(default_factory=list)
    allergen_statements: List[ExtractedAllergenStatement] = Field(default_factory=list)
    dietary_claims: List[ExtractedClaim] = Field(default_factory=list)
    sections: List[ExtractedSection] = Field(default_factory=list)
    warnings: List[ExtractedWarning] = Field(default_factory=list)
    extraction_status: Literal["observed", "partially_readable", "unreadable", "not_detected", "unknown"] = "observed"


# ---------------------------------------------------------------------------
# Findings Schemas (Deterministic Engine Output)
# ---------------------------------------------------------------------------

FindingCategory = Literal[
    "allergen",
    "dietary_preference",
    "custom_restriction",
    "nutrition",
    "label_quality"
]

FindingStatus = Literal[
    "conflict",
    "no_conflict_found",
    "unknown",
    "informational"
]


class Finding(BaseModel):
    """An individual evaluation finding comparing profile to extracted evidence."""
    category: FindingCategory = Field(..., description="Category of rule evaluated")
    status: FindingStatus = Field(..., description="conflict, no_conflict_found, unknown, or informational")
    title: str = Field(..., description="Short user-friendly headline")
    message: str = Field(..., description="Detailed explanation of the match or lack thereof")
    matched_value: Optional[str] = Field(None, description="Exact ingredient or nutrient value matched")
    profile_rule: Optional[str] = Field(None, description="Rule or limit in user profile that triggered this")
    evidence: List[EvidenceItem] = Field(default_factory=list, description="Associated label evidence items")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Overall confidence")


# ---------------------------------------------------------------------------
# API Responses
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Health check endpoint response."""
    status: Literal["ok"] = "ok"


class AnalyzeResponse(BaseModel):
    """Top-level response contract for /api/analyze."""
    request_id: Optional[str] = None
    extracted: ExtractedData
    findings: List[Finding]
