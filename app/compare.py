"""Deterministic dietary comparison engine.

Evaluates extracted food label data against user dietary profiles, including:
- Allergen detection (ingredients, explicit declarations, precautionary statements)
- Vegetarian / vegan / pescatarian compliance with explicit ambiguity tracking
- Custom ingredient restriction matching
- Nutritional limit checking with strict unit and serving-basis compatibility
"""

import re
from typing import Dict, List, Optional, Set, Tuple

from app.evidence import make_finding
from app.schemas import (
    EvidenceItem,
    ExtractedData,
    ExtractedIngredient,
    ExtractedNutritionItem,
    Finding,
    UserProfile,
)

# ---------------------------------------------------------------------------
# Knowledge Base: Allergens & Synonyms
# ---------------------------------------------------------------------------

ALLERGEN_SYNONYMS: Dict[str, Set[str]] = {
    "milk": {
        "milk", "dairy", "whey", "casein", "caseinate", "sodium caseinate",
        "calcium caseinate", "lactose", "butter", "buttermilk", "cream",
        "cheese", "ghee", "yogurt", "milkfat", "milk fat", "nonfat milk",
        "skim milk", "whole milk", "curds", "sour cream", "lactalbumin"
    },
    "peanut": {
        "peanut", "peanuts", "peanut butter", "peanut oil", "peanut flour",
        "arachis hypogaea", "arachis", "groundnut", "groundnuts"
    },
    "tree_nut": {
        "tree nut", "tree nuts", "almond", "almonds", "almond flour", "cashew",
        "cashews", "walnut", "walnuts", "pecan", "pecans", "hazelnut",
        "hazelnuts", "filbert", "filberts", "pistachio", "pistachios",
        "macadamia", "macadamias", "brazil nut", "brazil nuts", "pine nut",
        "pine nuts", "chestnut", "chestnuts", "praline"
    },
    "soy": {
        "soy", "soya", "soybean", "soybeans", "soy lecithin", "soy protein",
        "soy sauce", "edamame", "tofu", "tempeh", "tamari", "miso"
    },
    "wheat": {
        "wheat", "gluten", "wheat flour", "enriched wheat flour", "durum",
        "semolina", "spelt", "farro", "bulgur", "kamut", "wheat starch",
        "wheat bran", "wheat germ", "couscous", "seitan"
    },
    "egg": {
        "egg", "eggs", "egg white", "egg whites", "egg yolk", "egg yolks",
        "whole egg", "albumin", "ovalbumin", "lysozyme", "mayonnaise",
        "meringue", "surimi", "globulin", "livetin"
    },
    "fish": {
        "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "tilapia",
        "trout", "halibut", "haddock", "mackerel", "sardine", "sardines",
        "bass", "catfish", "flounder", "swordfish", "fish sauce", "worcestershire sauce"
    },
    "shellfish": {
        "shellfish", "crustacean", "crustaceans", "mollusk", "molluscs", "shrimp",
        "prawn", "prawns", "crab", "lobster", "crawfish", "crayfish",
        "krill", "mussel", "mussels", "clam", "clams", "oyster", "oysters",
        "scallop", "scallops", "squid", "calamari", "octopus"
    },
    "sesame": {
        "sesame", "sesame seed", "sesame seeds", "sesame oil", "tahini",
        "sesamum indicum", "sesamol", "sesamum"
    },
    "mustard": {
        "mustard", "mustard seed", "mustard seeds", "mustard flour", "mustard powder"
    },
    "celery": {
        "celery", "celeriac", "celery seed", "celery salt"
    },
    "lupin": {
        "lupin", "lupine", "lupin flour"
    },
    "sulfites": {
        "sulfite", "sulfites", "sulphite", "sulphites", "sulfur dioxide",
        "sodium metabisulfite", "potassium metabisulfite"
    }
}

# ---------------------------------------------------------------------------
# Knowledge Base: Vegetarian & Vegan Ingredients
# ---------------------------------------------------------------------------

NON_VEGETARIAN_TERMS: Set[str] = {
    "beef", "pork", "chicken", "turkey", "duck", "lamb", "mutton", "veal",
    "venison", "meat", "poultry", "fish", "salmon", "tuna", "anchovy",
    "anchovies", "gelatin", "lard", "tallow", "suet", "animal rennet",
    "rennet", "cochineal", "carmine", "e120", "isinglass", "bone char",
    "bacon", "ham", "sausage", "collagen", "pepsin"
}

NON_VEGAN_ADDITIONS: Set[str] = {
    "milk", "dairy", "whey", "casein", "caseinate", "lactose", "butter",
    "buttermilk", "cream", "cheese", "ghee", "yogurt", "egg", "eggs",
    "egg white", "egg yolk", "albumin", "honey", "beeswax", "e901",
    "shellac", "e904", "royal jelly", "propolis", "vitamin d3", "lanolin"
}

AMBIGUOUS_VEG_INGREDIENTS: Set[str] = {
    "mono- and diglycerides", "monoglycerides", "diglycerides", "glycerin",
    "glycerol", "enzymes", "lecithin", "lactic acid", "stearic acid",
    "calcium stearate", "magnesium stearate", "natural flavors",
    "natural flavoring", "artificial flavors", "shortening", "fatty acids"
}

# ---------------------------------------------------------------------------
# Helper Normalizers
# ---------------------------------------------------------------------------

def normalize_text(text: str) -> str:
    """Normalize text by lowercasing and stripping special characters."""
    return re.sub(r"[^\w\s-]", " ", text.lower()).strip()


def text_matches_term(text: str, term: str) -> bool:
    """Accurate word-boundary match of term inside text."""
    pattern = r"\b" + re.escape(term.lower()) + r"\b"
    return bool(re.search(pattern, text.lower()))


def get_allergen_synonyms_for_input(user_allergen: str) -> Tuple[str, Set[str]]:
    """Resolve user-entered allergen string to canonical key and synonym set."""
    norm = normalize_text(user_allergen)
    
    # Check if matches any canonical key or known synonym
    for key, synonyms in ALLERGEN_SYNONYMS.items():
        if norm == key or norm in synonyms or any(text_matches_term(norm, s) for s in synonyms):
            return key, synonyms

    # Fallback to custom/ad-hoc allergen
    custom_set = {norm}
    # Also add simple plural / singular variants
    if norm.endswith("s") and len(norm) > 2:
        custom_set.add(norm[:-1])
    else:
        custom_set.add(norm + "s")
    return norm, custom_set


# ---------------------------------------------------------------------------
# Core Allergen Evaluation
# ---------------------------------------------------------------------------

def evaluate_allergens(extracted: ExtractedData, user_allergens: List[str]) -> List[Finding]:
    """Deterministically check extracted label data against allergens to avoid."""
    findings: List[Finding] = []

    has_unreadable = (
        extracted.extraction_status == "unreadable"
        or any(w.is_unreadable for w in extracted.warnings)
    )

    for allergen_input in user_allergens:
        canonical_key, synonyms = get_allergen_synonyms_for_input(allergen_input)
        
        # 1. Check explicit allergen statements (e.g. "Contains: milk, peanuts")
        explicit_match: Optional[Tuple[str, List[EvidenceItem]]] = None
        precautionary_match: Optional[Tuple[str, List[EvidenceItem]]] = None

        for stmt in extracted.allergen_statements:
            stmt_norm = normalize_text(stmt.text)
            matches = any(text_matches_term(stmt_norm, syn) for syn in synonyms)
            if matches:
                if stmt.statement_type == "contains" or "contains" in stmt_norm:
                    explicit_match = (stmt.text, stmt.evidence)
                    break
                elif stmt.statement_type in ("may_contain", "facility") or any(
                    phrase in stmt_norm for phrase in ["may contain", "facility", "equipment", "traces"]
                ):
                    precautionary_match = (stmt.text, stmt.evidence)

        if explicit_match:
            findings.append(
                make_finding(
                    category="allergen",
                    status="conflict",
                    title=f"Explicit Allergen Declaration: {allergen_input.title()}",
                    message=(
                        f"The package explicitly declares that this product contains {allergen_input} "
                        f"('{explicit_match[0]}')."
                    ),
                    matched_value=explicit_match[0],
                    profile_rule=allergen_input,
                    evidence=explicit_match[1],
                    confidence=1.0,
                )
            )
            continue

        if precautionary_match:
            findings.append(
                make_finding(
                    category="allergen",
                    status="conflict",
                    title=f"Precautionary Allergen Warning: {allergen_input.title()}",
                    message=(
                        f"The package contains a precautionary statement regarding {allergen_input} "
                        f"('{precautionary_match[0]}')."
                    ),
                    matched_value=precautionary_match[0],
                    profile_rule=allergen_input,
                    evidence=precautionary_match[1],
                    confidence=0.95,
                )
            )
            continue

        # 2. Check ingredient list
        ingredient_matches: List[Tuple[ExtractedIngredient, str]] = []
        for ing in extracted.ingredients:
            ing_text = ing.original_text or ing.name
            for syn in synonyms:
                if text_matches_term(ing_text, syn):
                    ingredient_matches.append((ing, syn))
                    break

        if ingredient_matches:
            matched_names = [f"'{ing.name}'" for ing, _ in ingredient_matches]
            combined_evidence = [ev for ing, _ in ingredient_matches for ev in ing.evidence]
            findings.append(
                make_finding(
                    category="allergen",
                    status="conflict",
                    title=f"Allergen Detected in Ingredients: {allergen_input.title()}",
                    message=(
                        f"Ingredient {', '.join(matched_names)} matches allergen '{allergen_input}'."
                    ),
                    matched_value=ingredient_matches[0][0].name,
                    profile_rule=allergen_input,
                    evidence=combined_evidence,
                    confidence=0.95,
                )
            )
            continue

        # 3. No match found in legible text
        if extracted.extraction_status == "unreadable" or not extracted.ingredients:
            findings.append(
                make_finding(
                    category="allergen",
                    status="unknown",
                    title=f"Allergen Check Inconclusive: {allergen_input.title()}",
                    message=(
                        f"Cannot verify presence or absence of {allergen_input}. "
                        "The ingredients list was not clearly detected or is illegible."
                    ),
                    matched_value=None,
                    profile_rule=allergen_input,
                    evidence=[],
                    confidence=None,
                )
            )
        elif has_unreadable:
            findings.append(
                make_finding(
                    category="allergen",
                    status="unknown",
                    title=f"Allergen Presence Unconfirmed: {allergen_input.title()}",
                    message=(
                        f"No {allergen_input} was detected in legible areas, but the label has unreadable "
                        "or obscured sections. Cannot confirm absence."
                    ),
                    matched_value=None,
                    profile_rule=allergen_input,
                    evidence=[],
                    confidence=None,
                )
            )
        else:
            findings.append(
                make_finding(
                    category="allergen",
                    status="no_conflict_found",
                    title=f"No {allergen_input.title()} Conflict Detected",
                    message=(
                        f"No ingredients or declarations matching '{allergen_input}' were detected in "
                        "the legible text of the label. Note: This scan is based on visible text and "
                        "is not a medical guarantee of safety."
                    ),
                    matched_value=None,
                    profile_rule=allergen_input,
                    evidence=[],
                    confidence=0.9,
                )
            )

    return findings


# ---------------------------------------------------------------------------
# Core Dietary Preference Evaluation (Vegetarian, Vegan, Pescatarian)
# ---------------------------------------------------------------------------

def evaluate_dietary_preference(extracted: ExtractedData, preference: Optional[str]) -> List[Finding]:
    """Deterministically check vegetarian/vegan preference with explicit ambiguity handling."""
    if not preference:
        return []

    pref_norm = preference.lower().strip()
    if pref_norm not in ("vegetarian", "vegan", "pescatarian"):
        # For non-standard preferences, return unknown or informational
        return [
            make_finding(
                category="dietary_preference",
                status="unknown",
                title=f"Unsupported Dietary Preference: {preference}",
                message=f"Deterministic rule engine currently supports 'vegetarian', 'vegan', and 'pescatarian'.",
                profile_rule=preference,
            )
        ]

    findings: List[Finding] = []

    # Check for official package claims / certifications
    certified_claim = None
    for claim in extracted.dietary_claims:
        claim_norm = claim.claim.lower()
        if pref_norm in claim_norm or (pref_norm == "vegetarian" and "vegan" in claim_norm):
            certified_claim = claim
            break

    # If ingredient list is missing/unreadable
    if not extracted.ingredients or extracted.extraction_status == "unreadable":
        if certified_claim:
            findings.append(
                make_finding(
                    category="dietary_preference",
                    status="no_conflict_found",
                    title=f"Product Claims {preference.title()}",
                    message=(
                        f"The package displays a '{certified_claim.claim}' claim, though the ingredients "
                        "list could not be independently verified."
                    ),
                    profile_rule=preference,
                    evidence=certified_claim.evidence,
                    confidence=0.85,
                )
            )
        else:
            findings.append(
                make_finding(
                    category="dietary_preference",
                    status="unknown",
                    title=f"Cannot Determine {preference.title()} Compliance",
                    message="Ingredient list is unreadable or not detected on the provided image.",
                    profile_rule=preference,
                )
            )
        return findings

    # Evaluate each ingredient
    conflicts: List[Tuple[ExtractedIngredient, str]] = []
    ambiguous_items: List[Tuple[ExtractedIngredient, str]] = []

    for ing in extracted.ingredients:
        ing_text = (ing.original_text or ing.name).lower()
        
        # Check non-vegetarian items
        is_meat_or_gelatin = any(text_matches_term(ing_text, term) for term in NON_VEGETARIAN_TERMS)
        
        if pref_norm == "pescatarian":
            # Fish/seafood is allowed for pescatarians, but meat/gelatin/poultry is not
            meat_poultry_terms = NON_VEGETARIAN_TERMS - ALLERGEN_SYNONYMS["fish"] - ALLERGEN_SYNONYMS["shellfish"]
            if any(text_matches_term(ing_text, term) for term in meat_poultry_terms):
                conflicts.append((ing, "animal/meat-derived"))
        elif pref_norm == "vegetarian":
            if is_meat_or_gelatin:
                conflicts.append((ing, "non-vegetarian ingredient"))
            elif any(text_matches_term(ing_text, amb) for amb in AMBIGUOUS_VEG_INGREDIENTS):
                ambiguous_items.append((ing, "potential animal origin"))
        elif pref_norm == "vegan":
            if is_meat_or_gelatin:
                conflicts.append((ing, "meat/animal-derived ingredient"))
            elif any(text_matches_term(ing_text, term) for term in NON_VEGAN_ADDITIONS):
                conflicts.append((ing, "dairy/egg/animal byproduct"))
            elif any(text_matches_term(ing_text, amb) for amb in AMBIGUOUS_VEG_INGREDIENTS):
                ambiguous_items.append((ing, "source (plant vs animal) unspecified"))

    if conflicts:
        conflict_names = [f"'{ing.name}' ({reason})" for ing, reason in conflicts]
        evidence_list = [ev for ing, _ in conflicts for ev in ing.evidence]
        findings.append(
            make_finding(
                category="dietary_preference",
                status="conflict",
                title=f"Non-{preference.title()} Ingredient Detected",
                message=f"Product contains ingredients conflicting with a {preference} diet: {', '.join(conflict_names)}.",
                matched_value=conflicts[0][0].name,
                profile_rule=preference,
                evidence=evidence_list,
                confidence=0.98,
            )
        )
    elif ambiguous_items and not certified_claim:
        # Prompt rule: "If an ingredient's source or classification is ambiguous, return unknown and explain why."
        ambig_names = [f"'{ing.name}' ({reason})" for ing, reason in ambiguous_items]
        evidence_list = [ev for ing, _ in ambiguous_items for ev in ing.evidence]
        findings.append(
            make_finding(
                category="dietary_preference",
                status="unknown",
                title=f"Ambiguous Ingredient Source for {preference.title()}",
                message=(
                    f"The label lists ingredients with ambiguous origin: {', '.join(ambig_names)}. "
                    f"These can be derived from either animal or plant sources, and the label does not specify."
                ),
                matched_value=ambiguous_items[0][0].name,
                profile_rule=preference,
                evidence=evidence_list,
                confidence=0.75,
            )
        )
    else:
        # No conflicts found
        evidence_list = certified_claim.evidence if certified_claim else []
        findings.append(
            make_finding(
                category="dietary_preference",
                status="no_conflict_found",
                title=f"Compatible with {preference.title()} Diet",
                message=f"No ingredients conflicting with a {preference} diet were detected on the label.",
                profile_rule=preference,
                evidence=evidence_list,
                confidence=0.92,
            )
        )

    return findings


# ---------------------------------------------------------------------------
# Core Custom Restriction Matching
# ---------------------------------------------------------------------------

UNSUPPORTED_ABSTRACT_RESTRICTIONS = {
    "chemicals", "inflammatory", "unhealthy", "natural", "clean", "processed"
}


def evaluate_custom_restrictions(extracted: ExtractedData, restrictions: List[str]) -> List[Finding]:
    """Deterministically check custom ingredient restrictions using normalized phrase matching."""
    findings: List[Finding] = []

    has_unreadable = (
        extracted.extraction_status == "unreadable"
        or any(w.is_unreadable for w in extracted.warnings)
    )

    for restriction in restrictions:
        res_norm = normalize_text(restriction)
        if not res_norm:
            continue

        # Check if restriction requires unsupported scientific or subjective reasoning
        if any(term in res_norm for term in UNSUPPORTED_ABSTRACT_RESTRICTIONS):
            findings.append(
                make_finding(
                    category="custom_restriction",
                    status="unknown",
                    title=f"Unsupported Custom Restriction: {restriction}",
                    message=(
                        f"Custom restriction '{restriction}' requires subjective or scientific evaluation "
                        "that cannot be deterministically verified from the label text."
                    ),
                    profile_rule=restriction,
                )
            )
            continue

        if not extracted.ingredients or extracted.extraction_status == "unreadable":
            findings.append(
                make_finding(
                    category="custom_restriction",
                    status="unknown",
                    title=f"Inconclusive: {restriction}",
                    message=f"Ingredients list is missing or unreadable; cannot evaluate '{restriction}'.",
                    profile_rule=restriction,
                )
            )
            continue

        # Search ingredients
        matches: List[ExtractedIngredient] = []
        for ing in extracted.ingredients:
            ing_text = (ing.original_text or ing.name).lower()
            if text_matches_term(ing_text, res_norm) or res_norm in ing_text:
                matches.append(ing)

        if matches:
            matched_names = [f"'{m.name}'" for m in matches]
            evidence_list = [ev for m in matches for ev in m.evidence]
            findings.append(
                make_finding(
                    category="custom_restriction",
                    status="conflict",
                    title=f"Custom Restriction Conflict: {restriction}",
                    message=f"Ingredient {', '.join(matched_names)} matches your restriction '{restriction}'.",
                    matched_value=matches[0].name,
                    profile_rule=restriction,
                    evidence=evidence_list,
                    confidence=0.95,
                )
            )
        elif has_unreadable:
            findings.append(
                make_finding(
                    category="custom_restriction",
                    status="unknown",
                    title=f"Unconfirmed Custom Restriction: {restriction}",
                    message=(
                        f"'{restriction}' was not found in legible ingredients, but label contains "
                        "unreadable sections. Cannot confirm absence."
                    ),
                    profile_rule=restriction,
                )
            )
        else:
            findings.append(
                make_finding(
                    category="custom_restriction",
                    status="no_conflict_found",
                    title=f"No Match for Custom Restriction: {restriction}",
                    message=f"No ingredients matching '{restriction}' were detected on the label.",
                    profile_rule=restriction,
                    confidence=0.9,
                )
            )

    return findings


# ---------------------------------------------------------------------------
# Core Nutrition Limit Evaluation
# ---------------------------------------------------------------------------

NUTRIENT_ALIASES: Dict[str, Tuple[List[str], str]] = {
    # key: ([label_names], expected_unit)
    "calories_kcal": (["calories", "energy", "calories_kcal"], "kcal"),
    "calories": (["calories", "energy", "calories_kcal"], "kcal"),
    "sugar_g": (["sugar", "sugars", "total sugars", "total sugar"], "g"),
    "sugars": (["sugar", "sugars", "total sugars", "total sugar"], "g"),
    "sodium_mg": (["sodium"], "mg"),
    "sodium": (["sodium"], "mg"),
    "carbohydrates_g": (["carbohydrate", "total carbohydrate", "carbohydrates", "carbs"], "g"),
    "carbohydrates": (["carbohydrate", "total carbohydrate", "carbohydrates", "carbs"], "g"),
    "total_fat_g": (["total fat", "fat"], "g"),
    "total_fat": (["total fat", "fat"], "g"),
    "saturated_fat_g": (["saturated fat", "saturates"], "g"),
    "saturated_fat": (["saturated fat", "saturates"], "g"),
    "protein_g": (["protein"], "g"),
    "protein": (["protein"], "g"),
    "fiber_g": (["dietary fiber", "fiber", "fibre"], "g"),
    "fiber": (["dietary fiber", "fiber", "fibre"], "g"),
}


def parse_serving_size_grams(serving_size_str: Optional[str]) -> Optional[float]:
    """Extract explicit gram weight from serving size string if available."""
    if not serving_size_str:
        return None
    # match patterns like '(30g)', '30 g', '30 grams'
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:g|grams?)\b", serving_size_str.lower())
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def evaluate_nutrition_limits(
    extracted: ExtractedData,
    limits: Optional[Dict[str, Optional[float]]]
) -> List[Finding]:
    """Deterministically compare nutrition facts against profile limits with unit & serving basis safety."""
    if not limits:
        return []

    findings: List[Finding] = []

    for rule_key, limit_val in limits.items():
        if limit_val is None:
            continue

        alias_info = NUTRIENT_ALIASES.get(rule_key.lower())
        if not alias_info:
            findings.append(
                make_finding(
                    category="nutrition",
                    status="unknown",
                    title=f"Unknown Nutrition Rule: {rule_key}",
                    message=f"Rule '{rule_key}' is not recognized in the standard nutrition mapping.",
                    profile_rule=rule_key,
                )
            )
            continue

        aliases, expected_unit = alias_info

        # Search extracted nutrition items for match
        matched_item: Optional[ExtractedNutritionItem] = None
        for item in extracted.nutrition:
            item_name_norm = normalize_text(item.name)
            if any(text_matches_term(item_name_norm, alias) for alias in aliases):
                matched_item = item
                break

        if not matched_item or matched_item.amount is None:
            findings.append(
                make_finding(
                    category="nutrition",
                    status="unknown",
                    title=f"Nutrient Not Detected: {aliases[0].title()}",
                    message=(
                        f"No legible nutrition value for '{aliases[0]}' was detected on the label. "
                        "Cannot evaluate nutrition limit."
                    ),
                    profile_rule=f"{rule_key}: {limit_val}",
                )
            )
            continue

        item_unit = (matched_item.unit or "").lower().strip()
        # Normalize unit representations
        if item_unit in ("cal", "calories", "") and expected_unit == "kcal":
            item_unit = "kcal"

        # Check unit compatibility
        if item_unit != expected_unit:
            findings.append(
                make_finding(
                    category="nutrition",
                    status="unknown",
                    title=f"Incompatible Unit for {aliases[0].title()}",
                    message=(
                        f"Label unit '{matched_item.unit}' is incompatible with expected limit unit '{expected_unit}'. "
                        "Direct comparison aborted to prevent inaccurate conversion."
                    ),
                    matched_value=f"{matched_item.amount} {matched_item.unit}",
                    profile_rule=f"{rule_key}: {limit_val}",
                    evidence=matched_item.evidence,
                )
            )
            continue

        # Check serving basis compatibility
        serving_basis = (matched_item.serving_basis or "per serving").lower()
        amount_to_compare = matched_item.amount

        if "100g" in serving_basis or "100ml" in serving_basis:
            # Requires explicit serving size weight to convert to per-serving
            serving_grams = parse_serving_size_grams(extracted.serving_size)
            if serving_grams is None:
                findings.append(
                    make_finding(
                        category="nutrition",
                        status="unknown",
                        title=f"Incompatible Serving Basis: {aliases[0].title()}",
                        message=(
                            f"{aliases[0].title()} is reported per 100g on the label, but the package serving "
                            "size in grams is unknown or missing. Cannot convert to per-serving limit."
                        ),
                        matched_value=f"{matched_item.amount}{item_unit} ({serving_basis})",
                        profile_rule=f"{rule_key}: {limit_val}",
                        evidence=matched_item.evidence,
                    )
                )
                continue
            # Legitimate explicit conversion
            amount_to_compare = (matched_item.amount / 100.0) * serving_grams

        # Perform numerical comparison
        if amount_to_compare > limit_val:
            findings.append(
                make_finding(
                    category="nutrition",
                    status="conflict",
                    title=f"Nutrition Limit Exceeded: {aliases[0].title()}",
                    message=(
                        f"{aliases[0].title()} ({amount_to_compare:.1f}{item_unit}) exceeds your limit of "
                        f"{limit_val:.1f}{expected_unit}."
                    ),
                    matched_value=f"{amount_to_compare:.1f}{item_unit}",
                    profile_rule=f"{rule_key}: {limit_val}",
                    evidence=matched_item.evidence,
                    confidence=0.98,
                )
            )
        else:
            findings.append(
                make_finding(
                    category="nutrition",
                    status="no_conflict_found",
                    title=f"Nutrition Limit Satisfied: {aliases[0].title()}",
                    message=(
                        f"{aliases[0].title()} ({amount_to_compare:.1f}{item_unit}) is within your limit of "
                        f"{limit_val:.1f}{expected_unit}."
                    ),
                    matched_value=f"{amount_to_compare:.1f}{item_unit}",
                    profile_rule=f"{rule_key}: {limit_val}",
                    evidence=matched_item.evidence,
                    confidence=0.98,
                )
            )

    return findings


# ---------------------------------------------------------------------------
# Master Comparison Dispatcher
# ---------------------------------------------------------------------------

def run_dietary_comparison(extracted: ExtractedData, profile: UserProfile) -> List[Finding]:
    """Execute all deterministic dietary checks and return unified list of findings."""
    all_findings: List[Finding] = []

    # 1. Allergens
    if profile.allergens_to_avoid:
        all_findings.extend(evaluate_allergens(extracted, profile.allergens_to_avoid))

    # 2. Dietary Preference (vegetarian / vegan / etc)
    if profile.dietary_preference:
        all_findings.extend(evaluate_dietary_preference(extracted, profile.dietary_preference))

    # 3. Custom Restrictions
    if profile.custom_restrictions:
        all_findings.extend(evaluate_custom_restrictions(extracted, profile.custom_restrictions))

    # 4. Nutrition Limits
    if profile.nutrition_limits:
        all_findings.extend(evaluate_nutrition_limits(extracted, profile.nutrition_limits))

    # 5. Label Quality & Legibility Warnings
    for warn in extracted.warnings:
        if warn.is_unreadable:
            all_findings.append(
                make_finding(
                    category="label_quality",
                    status="informational",
                    title="Label Legibility Warning",
                    message=warn.text,
                    evidence=warn.evidence,
                )
            )

    return all_findings
