# Medical Insurance Cost Prediction with Fairness Analysis

A full-stack machine learning application that predicts US medical insurance charges using a Random Forest model, served through a FastAPI backend and visualized in a React/Vite dashboard. The project also includes SHAP-based explainability, demographic fairness analysis, and a pytest test suite.

> **Academic project.** All charges shown are historical records from the Kaggle insurance dataset or model predictions — not live insurance data or real customers.

---

## Features

- **Cost prediction** — Random Forest Regressor (100 estimators, MAE ~$2,628, R² ~0.858) served via REST API
- **Interactive React dashboard** — five pages: Overview, Predict, Evaluation, Explainability, Fairness Analysis
- **SHAP explainability** — per-prediction feature-importance breakdown via `/explain`
- **Fairness analysis** — charge comparisons across gender, smoking status, region, and BMI category (notebook)
- **Analytics endpoints** — dataset aggregations ready for Recharts (bar charts, KPI cards)
- **pytest test suite** — integration tests in `tests/test_api.py` using FastAPI TestClient
- **Docker support** — single-container deployment of the FastAPI backend

---

## Architecture

```
Browser
  │
  ▼
React / Vite  (http://localhost:5173)
  │  fetch / axios
  ▼
FastAPI backend  (http://localhost:8000)
  ├── model/model.pkl       ← RandomForestRegressor (pre-trained, scikit-learn 1.6.1)
  └── notebook/insurance.csv ← 1,338-record dataset
```

The frontend reads `VITE_API_BASE_URL` from `frontend/.env`; the default value is `http://localhost:8000`.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Python | 3.10 |
| pip | 22+ |
| Node.js | 18 |
| npm | 9 |
| Docker *(optional)* | 20 |

---

## Local Setup

### Backend

```bash
# 1. Clone the repository
git clone <repo-url>
cd "College Projects"

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the API
uvicorn api.app:app --reload --port 8000
```

API docs (Swagger UI) are available at **http://localhost:8000/docs**.

### Frontend

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

The dashboard opens at **http://localhost:5173**.

The `frontend/.env` file already contains:

```
VITE_API_BASE_URL=http://localhost:8000
```

Change this value if your backend runs on a different port.

---

## Docker (Backend Only)

```bash
# Build the image
docker build -t insurance-api .

# Run the container
docker run -p 8000:8000 insurance-api
```

The API is then available at **http://localhost:8000**.

---

## Running Tests

```bash
# From the project root
python -m pytest tests/test_api.py -v
```

Tests use FastAPI's `TestClient` (via `httpx`) and do not require a running server.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Project info and endpoint listing |
| `GET` | `/health` | Readiness check — model and dataset load status |
| `POST` | `/predict` | Predict insurance cost for one individual |
| `GET` | `/analytics/overview` | Dataset aggregations (KPI cards and chart data) |
| `GET` | `/analytics/groups` | Same aggregations in Recharts-compatible format |
| `GET` | `/model/metrics` | Live MAE and R² computed on the 20% test split |
| `POST` | `/explain` | SHAP feature-importance for one prediction |

### POST `/predict`

**Request body**

```json
{
  "age": 35,
  "bmi": 28.5,
  "children": 1,
  "sex": "male",
  "smoker": "no",
  "region": "northeast"
}
```

**Field constraints**

| Field | Type | Constraints |
|-------|------|-------------|
| `age` | integer | 18 – 120 |
| `bmi` | float | 10.0 – 60.0 |
| `children` | integer | 0 – 10 |
| `sex` | string | `"male"` or `"female"` |
| `smoker` | string | `"yes"` or `"no"` |
| `region` | string | `"northeast"`, `"northwest"`, `"southeast"`, `"southwest"` |

**Example response**

```json
{
  "predicted_cost": 9823.45,
  "currency": "USD",
  "inputs": {
    "age": 35,
    "bmi": 28.5,
    "children": 1,
    "sex": "male",
    "smoker": "no",
    "region": "northeast"
  }
}
```

Returns HTTP 503 if the model is not loaded.

### GET `/health`

```json
{
  "status": "ok",
  "model_loaded": true,
  "records_loaded": 1338
}
```

### GET `/model/metrics`

```json
{
  "mae": 2627.91,
  "r2": 0.8582,
  "test_size": 268,
  "train_size": 1070,
  "model_type": "RandomForestRegressor"
}
```

Metrics are computed live on each request using the same 80/20 split and `random_state=42` used during training.

### POST `/explain`

Accepts the same request body as `/predict`. Returns SHAP values sorted by absolute impact.

```json
{
  "base_value": 13270.42,
  "features": [
    { "name": "smoker_yes", "value": 0, "shap_value": -5842.11 },
    { "name": "age",        "value": 35, "shap_value":  1203.47 },
    ...
  ]
}
```

---

## Dataset

| Property | Value |
|----------|-------|
| Source | [Kaggle Medical Cost Personal Dataset](https://www.kaggle.com/datasets/mirichoi0218/insurance) |
| Records | 1,338 |
| Columns | `age`, `sex`, `bmi`, `children`, `smoker`, `region`, `charges` |
| Target | `charges` (USD, continuous) |
| Age range | 18 – 64 |
| Charges range | $1,121.87 – $63,770.43 |
| Average charges | $13,270.42 |
| Median charges | $9,382.03 |

The dataset contains US insurance data; all monetary values are in USD.

---

## Model

| Property | Value |
|----------|-------|
| Algorithm | `RandomForestRegressor` |
| Library | scikit-learn 1.6.1 (loaded under 1.8.0 with a version warning — model works correctly) |
| Estimators | 100 |
| Features (8) | `age`, `bmi`, `children`, `sex_male`, `smoker_yes`, `region_northwest`, `region_southeast`, `region_southwest` |
| Encoding | `pd.get_dummies(drop_first=True)` — northeast and female are the reference categories |
| Evaluation split | 80% train / 20% test, `random_state=42` |
| MAE | ~$2,628 |
| R² | ~0.858 |
| Artifact | `model/model.pkl` |

The model is pre-trained. To retrain or experiment with XGBoost, open and run `notebook/insurance_fairness_analysis.ipynb`.

**Fairness note:** Demographic fairness analysis (comparing predicted charges across gender groups) is implemented in the Jupyter notebook using descriptive statistics. The `aif360` library is a notebook-only dependency and is not part of the API.

---

## Project Structure

```
College Projects/
├── api/
│   └── app.py                    # FastAPI application (single entry point)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Overview analytics
│   │   │   ├── Predict.jsx       # Prediction form
│   │   │   ├── Evaluation.jsx    # Model metrics
│   │   │   ├── Explainability.jsx# SHAP chart
│   │   │   └── Fairness.jsx      # Fairness analysis
│   │   ├── components/           # Reusable UI components
│   │   ├── api/client.js         # Axios API client
│   │   └── App.jsx               # Router setup
│   ├── .env                      # VITE_API_BASE_URL
│   └── package.json
├── model/
│   └── model.pkl                 # Pre-trained RandomForestRegressor
├── notebook/
│   ├── insurance.csv             # Source dataset (1,338 records)
│   └── insurance_fairness_analysis.ipynb
├── tests/
│   ├── conftest.py
│   └── test_api.py               # pytest integration tests
├── Dockerfile                    # Backend container
├── requirements.txt              # Pinned Python dependencies
└── README.md
```

---

## Academic Use

This project is submitted as a college data science project. The dataset and predictions are for educational purposes only. The application does not constitute professional insurance advice or underwriting.
