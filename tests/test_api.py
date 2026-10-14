"""
pytest test suite for the Medical Insurance Cost Prediction FastAPI backend.
Uses FastAPI TestClient — no running server required.
"""

import pytest

# ---------------------------------------------------------------------------
# Valid base payload reused across multiple tests
# ---------------------------------------------------------------------------
VALID_PAYLOAD = {
    "age": 35,
    "bmi": 28.5,
    "children": 1,
    "sex": "male",
    "smoker": "no",
    "region": "northeast",
}


# ---------------------------------------------------------------------------
# (a) test_model_loads
# ---------------------------------------------------------------------------
def test_model_loads(client):
    """Health endpoint confirms the model loaded successfully."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["model_loaded"] is True


# ---------------------------------------------------------------------------
# (b) test_health_endpoint
# ---------------------------------------------------------------------------
def test_health_endpoint(client):
    """Health endpoint returns all expected keys and correct record count."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data
    assert "records_loaded" in data
    assert data["records_loaded"] == 1338


# ---------------------------------------------------------------------------
# (c) test_predict_valid
# ---------------------------------------------------------------------------
def test_predict_valid(client):
    """A valid prediction request returns a positive predicted_cost."""
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_cost" in data
    assert data["predicted_cost"] > 0


# ---------------------------------------------------------------------------
# (d) test_predict_invalid_age_negative
# ---------------------------------------------------------------------------
def test_predict_invalid_age_negative(client):
    """A negative age must be rejected with 422 Unprocessable Entity."""
    payload = {**VALID_PAYLOAD, "age": -1}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# (e) test_predict_invalid_age_too_high
# ---------------------------------------------------------------------------
def test_predict_invalid_age_too_high(client):
    """An age of 200 exceeds the allowed maximum and must be rejected with 422."""
    payload = {**VALID_PAYLOAD, "age": 200}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# (f) test_predict_invalid_bmi
# ---------------------------------------------------------------------------
def test_predict_invalid_bmi(client):
    """A BMI of 200.0 exceeds the allowed maximum and must be rejected with 422."""
    payload = {**VALID_PAYLOAD, "bmi": 200.0}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# (g) test_predict_invalid_smoker
# ---------------------------------------------------------------------------
def test_predict_invalid_smoker(client):
    """A smoker value outside the allowed literals must be rejected with 422."""
    payload = {**VALID_PAYLOAD, "smoker": "maybe"}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# (h) test_analytics_overview_keys
# ---------------------------------------------------------------------------
def test_analytics_overview_keys(client):
    """Analytics overview returns all expected keys and correct total_records."""
    response = client.get("/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    expected_keys = [
        "total_records",
        "avg_charges",
        "median_charges",
        "avg_age",
        "avg_bmi",
        "charges_by_smoker",
        "charges_by_age_group",
        "charges_by_bmi_category",
        "charges_by_region",
        "charges_by_sex",
    ]
    for key in expected_keys:
        assert key in data, f"Missing key in /analytics/overview response: {key}"
    assert data["total_records"] == 1338


# ---------------------------------------------------------------------------
# (i) test_model_metrics_keys
# ---------------------------------------------------------------------------
def test_model_metrics_keys(client):
    """Model metrics endpoint returns expected keys with plausible values."""
    response = client.get("/model/metrics")
    assert response.status_code == 200
    data = response.json()
    for key in ("mae", "r2", "test_size", "train_size"):
        assert key in data, f"Missing key in /model/metrics response: {key}"
    assert data["mae"] > 0
    assert data["r2"] > 0.8


# ---------------------------------------------------------------------------
# (j) test_explain_valid
# ---------------------------------------------------------------------------
def test_explain_valid(client):
    """SHAP explain endpoint returns base_value and 8 feature entries."""
    response = client.post("/explain", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert "base_value" in data
    assert "features" in data
    assert len(data["features"]) == 8
