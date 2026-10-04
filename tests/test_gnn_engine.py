import pytest
from src.models.gnn_inference import GNNInferenceEngine


@pytest.fixture(scope="module")
def gnn_engine():
    return GNNInferenceEngine(checkpoint_path="models/gnn_fall_model.pt")


def test_gnn_engine_loads_model(gnn_engine):
    assert gnn_engine.model is not None
    assert gnn_engine.num_unique_drugs > 0


def test_gnn_preset_cases(gnn_engine):
    presets = gnn_engine.get_preset_cases()
    assert len(presets) > 0

    for name, p in presets.items():
        res = gnn_engine.predict(
            p["drugs"],
            p["age"],
            p["creatinine_min"],
            p["creatinine_max"],
            p["creatinine_avg"],
        )
        assert "predicted_risk_pct" in res
        assert 0.0 <= res["predicted_risk_pct"] <= 100.0
        assert res["risk_tier"] in ["Critical", "High", "Moderate", "Low"]


def test_gnn_what_if_deprescribing(gnn_engine):
    sim = gnn_engine.simulate_deprescribing(
        drug_list=["zolpidem", "trazodone", "furosemide"],
        drug_to_remove="zolpidem",
        age=82,
        creatinine_min=1.2,
        creatinine_max=1.6,
        creatinine_avg=1.4,
    )
    assert "baseline_risk_pct" in sim
    assert "deprescribed_risk_pct" in sim
    assert "delta_pct" in sim
    assert sim["target_drug_removed"] == "zolpidem"


def test_gnn_empty_regimen_graceful_handling(gnn_engine):
    res = gnn_engine.predict([], age=70)
    assert res["predicted_risk_pct"] >= 0.0
    assert "safety_audit" in res
