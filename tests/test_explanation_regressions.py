"""Offline checks for truthful review status and authoritative case context."""

import json

import pytest

from src.explainability.llm_explainer import LLMClinicalExplainer
from src.explainability.medgemma_pipeline import MedGemmaPipelineService
from src.explainability.recommendation import recommendation_from_response


@pytest.mark.parametrize("verification", [False, None, "false", "true", 1])
def test_only_explicit_boolean_verification_is_accepted(verification):
    result = MedGemmaPipelineService._verification_from_response({
        "clinical_rationale": "Review remains unresolved.", "is_verified": verification
    }, "Test Model")
    assert result["is_verified"] is False
    assert result["verification_status"] == "REQUIRES CLINICAL REVIEW"
    assert result["confidence"] == "Not calibrated"
    assert result["primary_culprit_cascade"] == []


def test_positive_model_review_never_claims_calibrated_confidence():
    result = MedGemmaPipelineService._verification_from_response({
        "clinical_rationale": "Generated review.", "is_verified": True
    }, "Test Model")
    assert result["is_verified"] is True
    assert result["verification_status"] == "AI REVIEW COMPLETED"
    assert result["confidence"] == "Not calibrated"


@pytest.mark.parametrize("invalid_drugs", ["lorazepam", [None], ["   "]])
def test_structuring_rejects_malformed_generated_medications(invalid_drugs):
    service = MedGemmaPipelineService()
    with pytest.raises(ValueError, match="standardized_drugs"):
        service._finalize_structure({"drugs_text": "Lorazepam 1mg", "creatinine": 1.2}, {
            "standardized_drugs": invalid_drugs
        })


def test_generated_frid_claims_cannot_override_local_audit():
    service = MedGemmaPipelineService()
    result = service._finalize_structure({"drugs_text": "Lorazepam 1mg", "creatinine": 1.2}, {
        "standardized_drugs": ["Lorazepam", " LORAZEPAM "],
        "triggered_frid_classes": [], "total_frid_classes": 0,
    })
    assert result["standardized_drugs"] == ["lorazepam"]
    assert "benzodiazepines_and_z_drugs" in result["triggered_frid_classes"]
    assert result["total_frid_classes"] == 1


def test_generated_recommendation_cannot_replace_patient_identity_or_prediction():
    recommendation = recommendation_from_response({
        "hadm_id": 999, "predicted_fall_risk": 0.01, "risk_stratification": "Low",
        "primary_risk_drivers": [], "pharmacological_mechanisms": "Generated text",
        "clinical_guideline_citations": [], "actionable_deprescribing_plan": [],
    }, {"hadm_id": 123, "predicted_fall_risk": 0.55, "risk_stratification": "Critical"})
    assert recommendation.hadm_id == 123
    assert recommendation.predicted_fall_risk == 0.55
    assert recommendation.risk_stratification == "Critical"


def test_offline_explanation_includes_medications_beyond_first_fifteen(tmp_path):
    config = tmp_path / "offline.yaml"
    config.write_text("provider: offline\n", encoding="utf-8")
    explainer = LLMClinicalExplainer(config_path=str(config))
    assert explainer.langchain_explainer is None
    result = explainer.synthesize_explanation(
        hadm_id=123, predicted_fall_risk=0.55, risk_stratification="Critical", top_drivers=[],
        active_medications=[f"neutral-{index}" for index in range(15)] + ["morphine"],
    )
    assert "opioid" in result.pharmacological_mechanisms.lower()


def test_cached_index_requires_all_weight_shards(tmp_path, monkeypatch):
    import huggingface_hub
    from src.explainability.medgemma_chat_model import MedGemmaChatModel

    index = tmp_path / "model.safetensors.index.json"
    index.write_text(json.dumps({"weight_map": {"layer_a": "shard-a", "layer_b": "shard-b"}}), encoding="utf-8")
    first = tmp_path / "shard-a"
    first.touch()
    second = tmp_path / "shard-b"
    cache = {"model.safetensors.index.json": str(index), "shard-a": str(first), "shard-b": str(second)}
    monkeypatch.setattr(huggingface_hub, "try_to_load_from_cache", lambda model, filename: cache.get(filename, object()))
    model = MedGemmaChatModel()
    assert model.is_weights_cached() is False
    second.touch()
    assert model.is_weights_cached() is True
