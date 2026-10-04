"""Regression coverage for patient isolation and truthful clinical mutations."""

from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from src.api import main as api


@pytest.fixture
def client():
    census = deepcopy(api.FULL_WARD_CENSUS)
    patients = deepcopy(api.PATIENTS_DATABASE)
    audit = deepcopy(api.AUDIT_LOG_STORE)
    try:
        with TestClient(api.app) as test_client:
            yield test_client
    finally:
        api.FULL_WARD_CENSUS[:] = census
        api.PATIENTS_DATABASE.clear()
        api.PATIENTS_DATABASE.update(patients)
        api.AUDIT_LOG_STORE[:] = audit


@pytest.mark.parametrize("path", [
    "/api/patient/not-a-patient",
    "/api/trajectory/not-a-patient",
    "/api/fhir/export?patient_id=not-a-patient",
])
def test_unknown_patient_is_never_replaced_by_demo_patient(client, path):
    assert client.get(path).status_code == 404


def test_census_patient_detail_matches_selected_identity(client):
    patient = api.FULL_WARD_CENSUS[-1]
    response = client.get(f"/api/patient/{patient['hadm_id']}")
    assert response.status_code == 200
    assert response.json()["hadm_id"] == patient["hadm_id"]
    assert response.json()["name"] == patient["name"]


@pytest.mark.parametrize("patient_id,actions,status", [
    ("not-a-patient", ["plan_a"], 404),
    ("994201", [], 422),
    ("994201", ["not-a-plan"], 400),
    ("994201", ["plan_a", "not-a-plan"], 400),
])
def test_invalid_signing_never_changes_patient_or_audit(client, patient_id, actions, status):
    patients = deepcopy(api.PATIENTS_DATABASE)
    audit = deepcopy(api.AUDIT_LOG_STORE)
    response = client.post("/api/cpoe/sign", json={"patient_id": patient_id, "action_ids": actions})
    assert response.status_code == status
    assert api.PATIENTS_DATABASE == patients
    assert api.AUDIT_LOG_STORE == audit


def test_signing_is_repeat_safe_and_does_not_change_predicted_risk(client):
    risk = api.PATIENTS_DATABASE["994201"]["risk_percentage"]
    count = len(api.AUDIT_LOG_STORE)
    payload = {"patient_id": "994201", "action_ids": ["plan_a"], "override_reason": "Documented review"}
    first = client.post("/api/cpoe/sign", json=payload)
    assert first.status_code == 200
    assert first.json()["new_risk"] == risk
    assert api.PATIENTS_DATABASE["994201"]["risk_percentage"] == risk
    assert len(api.AUDIT_LOG_STORE) == count + 1
    assert "Documented review" in str(api.AUDIT_LOG_STORE[0])
    assert "Transmitted" not in api.AUDIT_LOG_STORE[0]["status"]
    repeat = client.post("/api/cpoe/sign", json=payload)
    assert repeat.status_code == 200
    assert repeat.json()["already_signed"] is True
    assert repeat.json()["audit_id"] == first.json()["audit_id"]
    assert len(api.AUDIT_LOG_STORE) == count + 1


def test_ingestion_registers_same_patient_and_updates_ward_totals(client, monkeypatch):
    monkeypatch.setattr(api, "gnn_engine", SimpleNamespace(
        predict=lambda **kwargs: {"predicted_risk_pct": 55.0, "risk_tier": "Critical", "safety_audit": {}}
    ))
    initial_count = len(api.FULL_WARD_CENSUS)
    response = client.post("/api/admissions/ingest", json={
        "name": "Regression Patient", "drugs": ["lorazepam"], "creatinine": 1.2
    })
    assert response.status_code == 200
    patient = response.json()["patient"]
    detail = client.get(f"/api/patient/{patient['hadm_id']}")
    assert detail.status_code == 200
    assert detail.json()["name"] == "Regression Patient"
    assert detail.json()["risk_percentage"] == 55.0
    assert len(api.FULL_WARD_CENSUS) == initial_count + 1
    distribution = client.get("/api/ward/distribution").json()
    assert distribution["total_inpatients"] == initial_count + 1
    assert sum(s["patient_count"] for s in distribution["stratums"]) == initial_count + 1


@pytest.mark.parametrize("broken_engine", [None, SimpleNamespace(predict=lambda **kwargs: (_ for _ in ()).throw(RuntimeError("failed")))])
def test_failed_inference_never_creates_synthetic_admission(client, monkeypatch, broken_engine):
    monkeypatch.setattr(api, "gnn_engine", broken_engine)
    census = deepcopy(api.FULL_WARD_CENSUS)
    audit = deepcopy(api.AUDIT_LOG_STORE)
    response = client.post("/api/admissions/ingest", json={"name": "Regression Patient", "drugs": ["lorazepam"]})
    assert response.status_code in {500, 503}
    assert api.FULL_WARD_CENSUS == census
    assert api.AUDIT_LOG_STORE == audit


@pytest.mark.parametrize("overrides", [
    {"age": -1}, {"creatinine_min": 0},
    {"creatinine_min": 2, "creatinine_avg": 1.5}, {"drugs": ["   "]},
])
def test_prediction_rejects_invalid_clinical_input(client, overrides):
    payload = {"drugs": ["lorazepam"], **overrides}
    assert client.post("/api/predict-gnn", json=payload).status_code == 422


@pytest.mark.parametrize("query", ["page=0", "limit=-1", "limit=0"])
def test_invalid_pagination_is_rejected(client, query):
    assert client.get(f"/api/patients?{query}").status_code == 422


def test_simulation_maps_invalid_medication_to_validation_error(client, monkeypatch):
    def invalid_target(**kwargs):
        raise ValueError("drug_to_remove must identify an active medication")
    monkeypatch.setattr(api, "gnn_engine", SimpleNamespace(simulate_deprescribing=invalid_target))
    assert client.post("/api/simulate-deprescribing", json={
        "drugs": ["lorazepam"], "drug_to_remove": "absent"
    }).status_code == 422


@pytest.mark.parametrize("path,payload", [
    ("/api/admissions/ingest", {"name": "Regression Patient"}),
    ("/api/cpoe/sign", {"action_ids": ["plan_a"]}),
    ("/api/medgemma/pipeline", {}),
    ("/api/medgemma/pipeline", {"name": "Regression Patient", "mrn": "#TEST"}),
])
def test_mutations_require_explicit_medication_and_patient_identity(client, path, payload):
    census = deepcopy(api.FULL_WARD_CENSUS)
    audit = deepcopy(api.AUDIT_LOG_STORE)
    assert client.post(path, json=payload).status_code == 422
    assert api.FULL_WARD_CENSUS == census
    assert api.AUDIT_LOG_STORE == audit


def test_parallel_admissions_have_unique_patient_and_audit_ids(client, monkeypatch):
    monkeypatch.setattr(api, "gnn_engine", SimpleNamespace(
        predict=lambda **kwargs: {"predicted_risk_pct": 15.0, "risk_tier": "Low", "safety_audit": {}}
    ))
    initial_count = len(api.FULL_WARD_CENSUS)
    def admit(index):
        return client.post("/api/admissions/ingest", json={
            "name": f"Regression Patient {index}", "mrn": f"#TEST-{index}", "drugs": ["acetaminophen"]
        })
    with ThreadPoolExecutor(max_workers=5) as executor:
        responses = list(executor.map(admit, range(5)))
    assert all(response.status_code == 200 for response in responses)
    assert len({response.json()["patient"]["hadm_id"] for response in responses}) == 5
    assert len({response.json()["audit_id"] for response in responses}) == 5
    assert len(api.FULL_WARD_CENSUS) == initial_count + 5
    assert all(response.json()["patient"]["high_risk_meds"] == [] for response in responses)


def test_duplicate_active_mrn_is_rejected_without_additional_writes(client, monkeypatch):
    monkeypatch.setattr(api, "gnn_engine", SimpleNamespace(
        predict=lambda **kwargs: {"predicted_risk_pct": 15.0, "risk_tier": "Low", "safety_audit": {}}
    ))
    payload = {"name": "Regression Patient", "mrn": "#REGRESSION-UNIQUE", "drugs": ["acetaminophen"]}
    assert client.post("/api/admissions/ingest", json=payload).status_code == 200
    count = len(api.FULL_WARD_CENSUS)
    audits = len(api.AUDIT_LOG_STORE)
    assert client.post("/api/admissions/ingest", json=payload).status_code == 409
    assert len(api.FULL_WARD_CENSUS) == count
    assert len(api.AUDIT_LOG_STORE) == audits


def test_pipeline_uses_supplied_drugs_and_returns_truthful_review_without_saving(client, monkeypatch):
    captured = {}
    def structure(raw):
        captured.update(raw)
        return {"standardized_drugs": ["acetaminophen"]}
    monkeypatch.setattr(api.medgemma_service, "structure_patient_admission", structure)
    monkeypatch.setattr(api.medgemma_service, "verify_and_explain", lambda **kwargs: {
        "is_verified": False, "verification_status": "REQUIRES CLINICAL REVIEW", "confidence": "Not calibrated"
    })
    monkeypatch.setattr(api, "gnn_engine", SimpleNamespace(
        predict=lambda **kwargs: {"predicted_risk_pct": 15.0, "risk_tier": "Low", "safety_audit": {}}
    ))
    count = len(api.FULL_WARD_CENSUS)
    response = client.post("/api/medgemma/pipeline", json={
        "name": "Regression Patient", "mrn": "#TEST", "drugs_list": ["acetaminophen"], "save_to_census": False
    })
    assert response.status_code == 200
    assert captured["drugs_text"] == "acetaminophen"
    result = response.json()
    assert result["patient"] is None
    assert len(api.FULL_WARD_CENSUS) == count
    inference = result["pipeline_stages"]["stage_2_gnn_inference"]
    assert inference["risk_percentage"] == 15.0
    assert inference["top_features"] == []
    assert inference["detected_interactions"] == []
    assert result["pipeline_stages"]["stage_3_medgemma_verification"]["is_verified"] is False


def test_fhir_references_selected_patient_and_does_not_invent_birth_date(client):
    patient = api.FULL_WARD_CENSUS[-1]
    response = client.get("/api/fhir/export", params={"patient_id": patient["mrn"]})
    assert response.status_code == 200
    entries = response.json()["entry"]
    exported = next(entry for entry in entries if entry["resource"]["resourceType"] == "Patient")
    assert exported["resource"]["id"] == str(patient["hadm_id"])
    assert "birthDate" not in exported["resource"]
    for entry in entries:
        if "subject" in entry["resource"]:
            assert entry["resource"]["subject"]["reference"] == exported["fullUrl"]


def test_health_reports_unavailable_model_as_degraded(client, monkeypatch):
    monkeypatch.setattr(api, "gnn_engine", None)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["gnn_model_loaded"] is False


def test_ward_fhir_export_covers_every_census_patient(client):
    response = client.get("/api/fhir/export")
    assert response.status_code == 200
    assert response.json()["type"] == "collection"
    assert "total" not in response.json()  # FHIR bdl-1 permits total only for search/history bundles.
    entries = response.json()["entry"]
    patients = [entry for entry in entries if entry["resource"]["resourceType"] == "Patient"]
    assert {entry["resource"]["id"] for entry in patients} == {str(p["hadm_id"]) for p in api.FULL_WARD_CENSUS}
    urls = {entry["fullUrl"] for entry in entries}
    assert len(urls) == len(entries)
    assert all(entry["resource"]["subject"]["reference"] in urls for entry in entries if "subject" in entry["resource"])
