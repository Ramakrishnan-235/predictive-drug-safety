import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "gnn_model_loaded" in data


def test_ward_kpis_endpoint():
    response = client.get("/api/ward/kpis")
    assert response.status_code == 200
    data = response.json()
    patients = client.get("/api/patients").json()
    assert data["high_fall_risk_count"] == sum(
        p["acuity_tier"] in {"Critical", "High"} for p in patients
    )


def test_ward_distribution_endpoint():
    response = client.get("/api/ward/distribution")
    assert response.status_code == 200
    data = response.json()
    assert {s["id"] for s in data["stratums"]} == {"critical", "high", "moderate", "low"}
    assert sum(s["patient_count"] for s in data["stratums"]) == data["total_inpatients"]
    assert data["total_inpatients"] == len(client.get("/api/patients").json())


def test_drug_search_endpoint():
    response = client.get("/api/drugs/search?q=furosemide")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "furosemide"
    assert data["count"] == len(data["results"])
    assert all("furosemide" in d.lower() for d in data["results"])
    assert data["results"]


def test_clinical_rules_endpoint():
    response = client.get("/api/rules")
    assert response.status_code == 200
    data = response.json()
    assert data["version"]
    assert isinstance(data["rules"], list)
    assert data["rules"]
