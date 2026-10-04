"""Artifact safety and medication normalization regressions."""

import pytest
from src.models.gnn_inference import GNNInferenceEngine


@pytest.fixture(scope="module")
def engine():
    return GNNInferenceEngine(device="cpu")


def test_missing_checkpoint_does_not_run_random_model(tmp_path):
    with pytest.raises(FileNotFoundError):
        GNNInferenceEngine(checkpoint_path=str(tmp_path / "missing.pt"), device="cpu")


def test_missing_vocabulary_does_not_make_dummy_drug_ids(tmp_path):
    with pytest.raises(FileNotFoundError):
        GNNInferenceEngine(vocabulary_path=str(tmp_path / "missing.json"), device="cpu")


def test_default_artifacts_load_from_other_working_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    loaded = GNNInferenceEngine(device="cpu")
    assert loaded.num_unique_drugs > 0


def test_empty_regimen_has_no_public_placeholder_or_drug_burden(engine):
    graph, medications, metadata = engine.build_graph([])
    assert graph.num_nodes == 1  # Internal graph representation remains valid.
    assert medications == []
    assert metadata["unique_drug_count"] == 0
    result = engine.predict([])
    assert result["active_medications"] == []
    assert result["attended_interactions"] == []
    assert result["safety_audit"]["total_frid_classes"] == 0


def test_duplicate_aliases_do_not_inflate_medication_count(engine):
    _, medications, metadata = engine.build_graph(["lorazepam", " LORAZEPAM ", "furosemide"])
    assert len(medications) == metadata["unique_drug_count"] == 2
    once = engine.predict(["lorazepam", "furosemide"])
    duplicate = engine.predict(["lorazepam", " LORAZEPAM ", "furosemide"])
    assert duplicate["predicted_risk_pct"] == once["predicted_risk_pct"]


@pytest.mark.parametrize("target", ["", "   ", "zol", "absent-medication"])
def test_simulation_rejects_empty_partial_and_absent_targets(engine, target):
    with pytest.raises(ValueError, match="active medication"):
        engine.simulate_deprescribing(["zolpidem", "furosemide"], target)


def test_removing_final_medication_leaves_empty_regimen(engine):
    result = engine.simulate_deprescribing(["lorazepam"], "lorazepam")
    assert result["deprescribed_regimen"] == []
    assert result["target_drug_removed"] == result["removed_drug"] == "lorazepam"
