"""Shared recommendation schema without model or retrieval dependencies."""

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class ClinicalRecommendation(BaseModel):
    hadm_id: int
    predicted_fall_risk: float = Field(ge=0.0, le=1.0, description="Reported fall/syncope risk [0.0 - 1.0]")
    risk_stratification: str = Field(description="Low, Moderate, High, or Critical")
    primary_risk_drivers: List[str] = Field(description="Top features driving the prediction")
    pharmacological_mechanisms: str = Field(description="Biochemical and physiological interaction pathway")
    clinical_guideline_citations: List[str] = Field(description="Referenced Beers / STOPP v3 criteria")
    actionable_deprescribing_plan: List[str] = Field(description="Clinical steps for medication review")


def recommendation_from_response(response: Dict[str, Any], case: Dict[str, Any]) -> ClinicalRecommendation:
    """Keep patient identity and model results authoritative over generated text."""
    return ClinicalRecommendation(**{
        **response,
        "hadm_id": case["hadm_id"],
        "predicted_fall_risk": case["predicted_fall_risk"],
        "risk_stratification": case["risk_stratification"],
    })
