"""Unit tests for the deterministic dietary comparison engine (app/compare.py)."""

import pytest
from app.compare import (
    evaluate_allergens,
    evaluate_contradictions,
    evaluate_custom_restrictions,
    evaluate_dietary_preference,
    evaluate_nutrition_limits,
    run_dietary_comparison,
)
from app.evidence import make_evidence
from app.schemas import (
    ExtractedAllergenStatement,
    ExtractedClaim,
    ExtractedData,
    ExtractedIngredient,
    ExtractedNutritionItem,
    ExtractedWarning,
    UserProfile,
)


def create_sample_extracted_data() -> ExtractedData:
    """Helper fixture to create typical extracted label data."""
    return ExtractedData(
        product_name="Crunchy Granola Bar",
        brand="Nature Snack",
        serving_size="1 bar (40g)",
        servings_per_container="6",
        ingredients=[
            ExtractedIngredient(
                name="Rolled oats",
                original_text="Whole grain rolled oats",
                evidence=[make_evidence(0, "Whole grain rolled oats", "ingredients")]
            ),
            ExtractedIngredient(
                name="Peanut butter",
                original_text="Roasted peanut butter",
                evidence=[make_evidence(0, "Roasted peanut butter", "ingredients")]
            ),
            ExtractedIngredient(
                name="Sugar",
                original_text="Cane sugar",
                evidence=[make_evidence(0, "Cane sugar", "ingredients")]
            ),
            ExtractedIngredient(
                name="Whey protein",
                original_text="Whey protein isolate",
                evidence=[make_evidence(0, "Whey protein isolate", "ingredients")]
            ),
        ],
        nutrition=[
            ExtractedNutritionItem(
                name="Calories",
                amount=190.0,
                unit="kcal",
                serving_basis="per serving",
                evidence=[make_evidence(0, "Calories 190", "nutrition")]
            ),
            ExtractedNutritionItem(
                name="Total Sugars",
                amount=8.0,
                unit="g",
                serving_basis="per serving",
                evidence=[make_evidence(0, "Total Sugars 8g", "nutrition")]
            ),
            ExtractedNutritionItem(
                name="Sodium",
                amount=140.0,
                unit="mg",
                serving_basis="per serving",
                evidence=[make_evidence(0, "Sodium 140mg", "nutrition")]
            ),
        ],
        allergen_statements=[
            ExtractedAllergenStatement(
                statement_type="contains",
                text="Contains: peanuts, milk",
                allergens=["peanuts", "milk"],
                evidence=[make_evidence(0, "Contains: peanuts, milk", "allergen_statement")]
            ),
            ExtractedAllergenStatement(
                statement_type="may_contain",
                text="May contain tree nuts and soy",
                allergens=["tree nuts", "soy"],
                evidence=[make_evidence(0, "May contain tree nuts and soy", "allergen_statement")]
            )
        ],
        dietary_claims=[
            ExtractedClaim(
                claim="Vegetarian",
                evidence=[make_evidence(0, "Suitable for vegetarians", "claims")]
            )
        ],
        warnings=[],
        extraction_status="observed"
    )


# ---------------------------------------------------------------------------
# Allergen Tests
# ---------------------------------------------------------------------------

def test_allergen_explicit_declaration_match():
    """Explicit 'Contains' statement triggers a conflict finding."""
    extracted = create_sample_extracted_data()
    findings = evaluate_allergens(extracted, ["milk"])
    
    assert len(findings) == 1
    f = findings[0]
    assert f.category == "allergen"
    assert f.status == "conflict"
    assert "Explicit Allergen Declaration" in f.title
    assert f.profile_rule == "milk"
    assert len(f.evidence) > 0


def test_allergen_precautionary_statement_match():
    """'May contain' statement triggers a conflict finding."""
    extracted = create_sample_extracted_data()
    findings = evaluate_allergens(extracted, ["tree nuts"])
    
    assert len(findings) == 1
    f = findings[0]
    assert f.category == "allergen"
    assert f.status == "conflict"
    assert "Precautionary Allergen Warning" in f.title
    assert "tree nuts" in f.message.lower()


def test_allergen_ingredient_text_match():
    """Ingredient name matching allergen triggers conflict even without explicit statement."""
    extracted = ExtractedData(
        ingredients=[
            ExtractedIngredient(
                name="Cashew flour",
                original_text="Raw cashew flour",
                evidence=[make_evidence(0, "Raw cashew flour", "ingredients")]
            )
        ],
        allergen_statements=[],
        extraction_status="observed"
    )
    findings = evaluate_allergens(extracted, ["tree nuts"])
    
    assert len(findings) == 1
    assert findings[0].status == "conflict"
    assert "Allergen Detected in Ingredients" in findings[0].title


def test_allergen_no_conflict_found():
    """When clean ingredients list has no match, return no_conflict_found with safety disclaimer."""
    extracted = create_sample_extracted_data()
    findings = evaluate_allergens(extracted, ["fish", "shellfish"])
    
    assert len(findings) == 2
    for f in findings:
        assert f.status == "no_conflict_found"
        assert "not a medical guarantee" in f.message.lower()


def test_allergen_unreadable_label():
    """When label or ingredients are unreadable, status must be unknown."""
    extracted = ExtractedData(
        ingredients=[],
        allergen_statements=[],
        warnings=[ExtractedWarning(text="Ingredients blurry and torn", is_unreadable=True)],
        extraction_status="unreadable"
    )
    findings = evaluate_allergens(extracted, ["peanuts"])
    
    assert len(findings) == 1
    assert findings[0].status == "unknown"
    assert "inconclusive" in findings[0].title.lower() or "unconfirmed" in findings[0].title.lower()


def test_allergen_missing_evidence_never_treated_as_proof_of_safety():
    """Unreadable areas must downgrade a non-matching allergen to unknown."""
    extracted = ExtractedData(
        ingredients=[
            ExtractedIngredient(name="Oats", evidence=[make_evidence(0, "Oats", "ingredients")])
        ],
        warnings=[ExtractedWarning(text="Bottom corner obscured", is_unreadable=True)],
        extraction_status="observed"
    )
    findings = evaluate_allergens(extracted, ["sesame"])
    
    assert len(findings) == 1
    assert findings[0].status == "unknown"


# ---------------------------------------------------------------------------
# Vegetarian & Vegan Tests
# ---------------------------------------------------------------------------

def test_vegetarian_conflict_with_meat_or_gelatin():
    """Pork, beef, poultry, or gelatin causes a vegetarian conflict."""
    extracted = ExtractedData(
        ingredients=[
            ExtractedIngredient(name="Gelatin", evidence=[make_evidence(0, "Pork gelatin", "ingredients")])
        ],
        extraction_status="observed"
    )
    findings = evaluate_dietary_preference(extracted, "vegetarian")
    
    assert len(findings) == 1
    assert findings[0].status == "conflict"
    assert "Non-Vegetarian Ingredient Detected" in findings[0].title


def test_vegan_conflict_with_dairy_or_eggs():
    """Whey, milk, or eggs cause a vegan conflict."""
    extracted = create_sample_extracted_data()  # Contains whey protein
    findings = evaluate_dietary_preference(extracted, "vegan")
    
    assert len(findings) == 1
    assert findings[0].status == "conflict"
    assert "Non-Vegan" in findings[0].title


def test_vegetarian_ambiguous_ingredient_triggers_unknown():
    """Ambiguous ingredients such as 'mono- and diglycerides' trigger unknown when source unspecified."""
    extracted = ExtractedData(
        ingredients=[
            ExtractedIngredient(name="Enriched flour", evidence=[]),
            ExtractedIngredient(name="Mono- and diglycerides", evidence=[]),
        ],
        dietary_claims=[],
        extraction_status="observed"
    )
    findings = evaluate_dietary_preference(extracted, "vegetarian")
    
    assert len(findings) == 1
    assert findings[0].status == "unknown"
    assert "Ambiguous Ingredient Source" in findings[0].title


def test_vegetarian_certified_claim_overrides_unspecified_sources():
    """Certified Vegetarian claim satisfies preference without conflict."""
    extracted = ExtractedData(
        ingredients=[
            ExtractedIngredient(name="Rolled oats", evidence=[]),
            ExtractedIngredient(name="Brown sugar", evidence=[]),
        ],
        dietary_claims=[
            ExtractedClaim(claim="Certified Vegetarian", evidence=[make_evidence(0, "Certified Vegetarian", "claims")])
        ],
        extraction_status="observed"
    )
    findings = evaluate_dietary_preference(extracted, "vegetarian")
    
    assert len(findings) == 1
    assert findings[0].status == "no_conflict_found"


# ---------------------------------------------------------------------------
# Custom Restrictions Tests
# ---------------------------------------------------------------------------

def test_custom_restriction_match():
    """Matching ingredient with custom restriction phrase returns conflict."""
    extracted = ExtractedData(
        ingredients=[
            ExtractedIngredient(name="High Fructose Corn Syrup", evidence=[make_evidence(0, "High Fructose Corn Syrup", "ingredients")])
        ],
        extraction_status="observed"
    )
    findings = evaluate_custom_restrictions(extracted, ["high fructose corn syrup"])
    
    assert len(findings) == 1
    assert findings[0].status == "conflict"
    assert "high fructose corn syrup" in findings[0].message.lower()


def test_custom_restriction_abstract_phrase_triggers_unknown():
    """Unsupported subjective phrases like 'inflammatory' return unknown."""
    extracted = create_sample_extracted_data()
    findings = evaluate_custom_restrictions(extracted, ["inflammatory ingredients"])
    
    assert len(findings) == 1
    assert findings[0].status == "unknown"
    assert "subjective or scientific" in findings[0].message.lower()


def test_custom_restriction_clean():
    """When custom restriction is not in legible ingredients, return no_conflict_found."""
    extracted = create_sample_extracted_data()
    findings = evaluate_custom_restrictions(extracted, ["palm oil"])
    
    assert len(findings) == 1
    assert findings[0].status == "no_conflict_found"


# ---------------------------------------------------------------------------
# Nutrition Checks Tests
# ---------------------------------------------------------------------------

def test_nutrition_compatible_units_within_limit():
    """Nutrition within limit returns no_conflict_found."""
    extracted = create_sample_extracted_data()  # Sugars: 8g, Sodium: 140mg, Calories: 190
    limits = {
        "sugar_g": 10.0,
        "sodium_mg": 200.0,
        "calories_kcal": 250.0
    }
    findings = evaluate_nutrition_limits(extracted, limits)
    
    assert len(findings) == 3
    for f in findings:
        assert f.status == "no_conflict_found"


def test_nutrition_exceeds_limit():
    """Nutrition exceeding limit returns conflict."""
    extracted = create_sample_extracted_data()  # Sugars: 8g
    limits = {
        "sugar_g": 5.0
    }
    findings = evaluate_nutrition_limits(extracted, limits)
    
    assert len(findings) == 1
    assert findings[0].status == "conflict"
    assert "Limit Exceeded" in findings[0].title


def test_nutrition_incompatible_serving_basis_without_serving_size():
    """Per 100g values without serving size cannot be compared and return unknown."""
    extracted = ExtractedData(
        serving_size=None,  # Missing serving size
        nutrition=[
            ExtractedNutritionItem(
                name="Sodium",
                amount=800.0,
                unit="mg",
                serving_basis="per 100g",
                evidence=[]
            )
        ],
        extraction_status="observed"
    )
    limits = {"sodium_mg": 400.0}
    findings = evaluate_nutrition_limits(extracted, limits)
    
    assert len(findings) == 1
    assert findings[0].status == "unknown"
    assert "serving basis" in findings[0].title.lower() or "incompatible" in findings[0].title.lower()


def test_nutrition_per_100g_with_valid_serving_size_converts_safely():
    """Per 100g with valid 25g serving size safely converts (800mg/100g * 25g = 200mg/serving)."""
    extracted = ExtractedData(
        serving_size="1 pouch (25g)",
        nutrition=[
            ExtractedNutritionItem(
                name="Sodium",
                amount=800.0,
                unit="mg",
                serving_basis="per 100g",
                evidence=[]
            )
        ],
        extraction_status="observed"
    )
    # Limit is 300mg: 200mg is within limit
    limits = {"sodium_mg": 300.0}
    findings = evaluate_nutrition_limits(extracted, limits)
    
    assert len(findings) == 1
    assert findings[0].status == "no_conflict_found"
    assert "200.0mg" in findings[0].message


def test_nutrition_missing_nutrient_returns_unknown():
    """Missing nutrient on nutrition facts panel returns unknown, never assuming 0."""
    extracted = ExtractedData(
        nutrition=[
            ExtractedNutritionItem(name="Calories", amount=150.0, unit="kcal", evidence=[])
        ],
        extraction_status="observed"
    )
    limits = {"protein_g": 10.0}
    findings = evaluate_nutrition_limits(extracted, limits)
    
    assert len(findings) == 1
    assert findings[0].status == "unknown"
    assert "Not Detected" in findings[0].title


# ---------------------------------------------------------------------------
# Master Dispatcher Test
# ---------------------------------------------------------------------------

def test_run_dietary_comparison_full_profile():
    """Full profile run dispatches all categories correctly."""
    extracted = create_sample_extracted_data()
    profile = UserProfile(
        dietary_preference="vegetarian",
        allergens_to_avoid=["peanuts", "sesame"],
        custom_restrictions=["gelatin"],
        nutrition_limits={"sugar_g": 10.0}
    )
    findings = run_dietary_comparison(extracted, profile)
    
    categories = {f.category for f in findings}
    assert "allergen" in categories
    assert "dietary_preference" in categories
    assert "custom_restriction" in categories
    assert "nutrition" in categories


# ---------------------------------------------------------------------------
# Contradiction & Evidence-Grounded Verification Tests (Deliverables 1, 2, 3, 4, 5, 6, 8)
# ---------------------------------------------------------------------------

def test_contradiction_gluten_free_claim_vs_barley_ingredient():
    """Package claims 'Gluten-Free', but ingredients list 'Malt Extract (Barley)'."""
    extracted = ExtractedData(
        product_name="Healthy Crunch Bar",
        dietary_claims=[
            ExtractedClaim(
                claim="Gluten-Free",
                evidence=[make_evidence(0, "Certified Gluten-Free", "claims")]
            )
        ],
        ingredients=[
            ExtractedIngredient(
                name="Malt extract",
                original_text="Malt extract (barley)",
                evidence=[make_evidence(0, "Malt extract (barley)", "ingredients")]
            )
        ],
        extraction_status="observed"
    )
    profile = UserProfile(allergens_to_avoid=["wheat", "gluten"])
    findings = evaluate_contradictions(extracted, profile)

    assert len(findings) == 1
    f = findings[0]
    assert f.category == "contradiction"
    assert f.status == "contradiction"
    assert f.resolution_state == "contradiction"
    assert f.contradiction_type == "claim_vs_ingredient"
    assert "Gluten-Free Claim vs. Ingredients" in f.title
    assert "Malt extract" in f.matched_value
    assert len(f.evidence) == 1
    assert f.evidence[0].field_name == "ingredients"
    assert len(f.conflicting_evidence) == 1
    assert f.conflicting_evidence[0].field_name == "claims"
    assert f.requires_user_confirmation is True
    assert len(f.user_confirmation_options) >= 2
    assert "directly impacts your profile" in f.message


def test_contradiction_sugar_free_claim_vs_nutrition_facts():
    """Package claims 'Sugar-Free', but nutrition table lists 6g sugars."""
    extracted = ExtractedData(
        product_name="Diet Cookies",
        dietary_claims=[
            ExtractedClaim(
                claim="Sugar-Free",
                evidence=[make_evidence(0, "Sugar-Free Treat", "claims")]
            )
        ],
        nutrition=[
            ExtractedNutritionItem(
                name="Total Sugars",
                amount=6.0,
                unit="g",
                evidence=[make_evidence(0, "Total Sugars 6g", "nutrition")]
            )
        ],
        extraction_status="observed"
    )
    findings = evaluate_contradictions(extracted)

    assert len(findings) == 1
    f = findings[0]
    assert f.category == "contradiction"
    assert f.status == "contradiction"
    assert f.contradiction_type == "claim_vs_nutrition"
    assert "Sugar-Free vs. Nutrition Panel" in f.title
    assert "6.0g" in f.matched_value
    assert f.requires_user_confirmation is True
    assert len(f.conflicting_evidence) == 1


def test_contradiction_nut_free_claim_vs_allergen_warning():
    """Package claims 'Nut-Free', but back label contains precautionary warning."""
    extracted = ExtractedData(
        product_name="Kid Friendly Bar",
        dietary_claims=[
            ExtractedClaim(
                claim="Nut-Free",
                evidence=[make_evidence(0, "100% Nut-Free Facility", "claims")]
            )
        ],
        allergen_statements=[
            ExtractedAllergenStatement(
                statement_type="may_contain",
                text="May contain traces of peanuts and tree nuts",
                evidence=[make_evidence(0, "May contain traces of peanuts and tree nuts", "allergen_statement")]
            )
        ],
        extraction_status="observed"
    )
    findings = evaluate_contradictions(extracted)

    assert len(findings) == 1
    f = findings[0]
    assert f.category == "contradiction"
    assert f.status == "contradiction"
    assert f.contradiction_type == "claim_vs_allergen_warning"
    assert "Nut-Free Claim vs. Allergen Statement" in f.title
    assert f.requires_user_confirmation is True


def test_ambiguous_ingredient_requires_user_confirmation():
    """Ambiguous ingredients (mono- and diglycerides) prompt for user confirmation."""
    extracted = ExtractedData(
        ingredients=[
            ExtractedIngredient(
                name="Mono- and diglycerides",
                original_text="Mono- and diglycerides",
                evidence=[make_evidence(0, "Mono- and diglycerides", "ingredients")]
            )
        ],
        extraction_status="observed"
    )
    findings = evaluate_dietary_preference(extracted, "vegan")

    assert len(findings) == 1
    f = findings[0]
    assert f.status == "unknown"
    assert f.resolution_state == "uncertain"
    assert f.requires_user_confirmation is True
    assert f.user_confirmation_prompt is not None
    assert "Treat as Conflict (Strict)" in f.user_confirmation_options


def test_four_state_distinction():
    """Verify that all four states (confirmed, uncertain, missing, contradiction) are produced."""
    extracted = ExtractedData(
        product_name="Multi-Feature Test Snack",
        dietary_claims=[
            ExtractedClaim(claim="Gluten-Free", evidence=[make_evidence(0, "Gluten-Free", "claims")])
        ],
        ingredients=[
            # Triggers confirmed allergen conflict for peanuts
            ExtractedIngredient(name="Peanut butter", evidence=[make_evidence(0, "Peanut butter", "ingredients")]),
            # Triggers contradiction against Gluten-Free claim
            ExtractedIngredient(name="Wheat flour", evidence=[make_evidence(0, "Enriched wheat flour", "ingredients")]),
            # Triggers uncertain ambiguity for vegan preference
            ExtractedIngredient(name="Glycerin", evidence=[make_evidence(0, "Glycerin", "ingredients")]),
        ],
        nutrition=[],  # Missing nutrition panel triggers missing information state
        warnings=[
            ExtractedWarning(text="Nutrition panel illegible or cut off", is_unreadable=True)
        ],
        extraction_status="partially_readable"
    )
    profile = UserProfile(
        dietary_preference="vegan",
        allergens_to_avoid=["peanuts"],
        nutrition_limits={"sugar_g": 5.0}
    )
    findings = run_dietary_comparison(extracted, profile)

    states = {f.resolution_state for f in findings}
    assert "confirmed" in states      # Confirmed peanut conflict
    assert "contradiction" in states  # Gluten-free claim vs wheat flour
    assert "uncertain" in states      # Glycerin ambiguous origin
    assert "missing" in states        # Missing sugar nutrition value and legibility warning
