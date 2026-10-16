"""Evidence helper utilities for constructing and linking label findings."""

from typing import List, Optional
from app.schemas import EvidenceItem, Finding, FindingCategory, FindingStatus


def make_evidence(
    source_image_index: int,
    text: str,
    field_name: str,
    bounding_box: Optional[List[float]] = None,
    confidence: Optional[float] = None,
) -> EvidenceItem:
    """Helper to create a validated EvidenceItem."""
    return EvidenceItem(
        source_image_index=source_image_index,
        text=text.strip(),
        field_name=field_name,
        bounding_box=bounding_box,
        confidence=confidence,
    )


def make_finding(
    category: FindingCategory,
    status: FindingStatus,
    title: str,
    message: str,
    matched_value: Optional[str] = None,
    profile_rule: Optional[str] = None,
    evidence: Optional[List[EvidenceItem]] = None,
    confidence: Optional[float] = None,
) -> Finding:
    """Helper to create a validated Finding."""
    return Finding(
        category=category,
        status=status,
        title=title,
        message=message,
        matched_value=matched_value,
        profile_rule=profile_rule,
        evidence=evidence or [],
        confidence=confidence,
    )
