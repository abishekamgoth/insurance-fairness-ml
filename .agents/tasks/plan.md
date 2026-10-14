# Implementation Plan — Medical Insurance Cost Prediction Dashboard

> **Note:** This task is decomposed into 4 FEAT artifacts under
> `.agents/tasks/medical-insurance-dashboard/`. The workflow tail has been
> replaced with per-FEAT coder steps followed by a convergence loop.
> This plan.md is the human-readable summary; coders read their FEAT JSON.

---

## Findings from Source Inspection

| Item | Finding |
|---|---|
| `api/app.py` | Real entry point (matches Dockerfile CMD). Loads model with broken relative path `open("../model/model.pkl")` — fails in Docker. No CORS, no validation, raw encoded features only. |
| `api/main.py` | Orphaned file referencing non-existent `models/` dir and `columns.pkl`. Must be deleted. |
| `model/model.pkl` | RandomForestRegressor, 100 estimators, `random_state=None`, scikit-learn 1.6.1 pickle. Feature names embedded: `[age, bmi, children, sex_male, smoker_yes, region_northwest, region_southeast, region_southwest]`. Loads with version warning on 1.8.0 but works. MAE ≈ 2627, R² ≈ 0.858. |
| `notebook/model/model.pkl` | Second copy, slightly better metrics (MAE ≈ 2585, R² ≈ 0.862). **Use `model/model.pkl`** (the one the API already references) to preserve the documented API entry point. |
| `notebook/insurance_fairness_analysis.ipynb` | Cell 29 uses `y_pred` which is never defined — `rf_pred` and `xgb_pred` are defined in cell 28. Fix: replace `y_pred` with `rf_pred` and add a separate XGBoost evaluation. |
| `requirements.txt` | Unpinned except `scikit-learn==1.6.1`. All packages available: pandas 2.3.1, numpy 2.1.3, scikit-learn 1.8.0 (already upgraded), xgboost 3.2.0, fastapi 0.115.6, uvicorn 0.32.1, shap 0.51.0, mlflow 3.10.1, pydantic 2.10.3, httpx 0.27.2, pytest 8.3.4. `aif360` is in requirements.txt but NOT installed and not needed for any API endpoint — keep it in requirements.txt but don't import it in the API. |
| `Dockerfile` | `WORKDIR /app`, copies everything, `CMD uvicorn api.app:app`. With the pathlib fix in app.py the model path resolves to `/app/model/model.pkl` — correct since the whole repo is copied to `/app`. |
| Dataset | 1,338 records; age 18–64, bmi 15.96–53.13, children 0–5, charges $1,121–$63,770 USD. |
| Frontend | Does not exist. Must be created. |
| Tests | Do not exist. Must be created. |
| Python env | Python 3.13 locally (Dockerfile uses 3.10 — keep 3.10 in Dockerfile). |
| SHAP 0.51.0 | `TreeExplainer.shap_values()` returns `ndarray` of shape `(n_samples, n_features)` — confirmed working. |

---

## Ordered Implementation Plan

### FEAT-001 — Fix Backend API

- [ ] 1. Delete `api/main.py`.
      Files: `api/main.py` (delete)
      Verify: `python -c "import pathlib; assert not pathlib.Path('api/main.py').exists()"` in project root.

- [ ] 2. Rewrite `api/app.py` with all required fixes:
      - pathlib-based model path: `Path(__file__).resolve().parent.parent / 'model' / 'model.pkl'`
      - pathlib-based CSV path: `Path(__file__).resolve().parent.parent / 'notebook' / 'insurance.csv'`
      - Load model and CSV at startup; catch `FileNotFoundError` and set `model_loaded=False`
      - New `InsuranceInput` Pydantic v2 model with human-readable fields and validators:
        - `age: int` — `Field(ge=18, le=120)`
        - `bmi: float` — `Field(ge=10.0, le=60.0)`
        - `children: int` — `Field(ge=0, le=10)`
        - `sex: Literal['male', 'female']`
        - `smoker: Literal['yes', 'no']`
        - `region: Literal['northeast', 'northwest', 'southeast', 'southwest']`
      - Encoding function producing feature array in exact order: `[age, bmi, children, sex_male, smoker_yes, region_northwest, region_southeast, region_southwest]`
        - `sex_male = 1 if sex == 'male' else 0`
        - `smoker_yes = 1 if smoker == 'yes' else 0`
        - `region_northwest = 1 if region == 'northwest' else 0`
        - `region_southeast = 1 if region == 'southeast' else 0`
        - `region_southwest = 1 if region == 'southwest' else 0`
        - northeast is the reference category (all three region flags = 0)
      - Endpoints:
        - `GET /` — `{project, description, version, docs, endpoints}`
        - `GET /health` — `{status: 'ok'|'degraded', model_loaded: bool, records_loaded: int}`
        - `POST /predict` — accepts `InsuranceInput`, returns `{predicted_cost: float, currency: 'USD', inputs: dict}`; returns HTTP 503 if model not loaded
        - `GET /analytics/overview` — computed from CSV: `total_records, avg_charges, median_charges, avg_age, avg_bmi, charges_by_smoker [{group, avg_charges}], charges_by_age_group [{group, avg_charges}] (bins: 18-25,26-35,36-45,46-55,56+), charges_by_bmi_category [{category, avg_charges}] (Underweight<18.5,Normal 18.5-25,Overweight 25-30,Obese≥30), charges_by_region [{region, avg_charges}], charges_by_sex [{sex, avg_charges}]`
        - `GET /analytics/groups` — same aggregations but formatted for Recharts: `{smoker: [{name,value}], age_group: [{name,value}], bmi_category: [{name,value}], region: [{name,value}], sex: [{name,value}]}`
        - `GET /model/metrics` — runs `train_test_split(random_state=42, test_size=0.2)` on CSV with same `get_dummies(drop_first=True)` encoding, predicts with saved model, returns `{mae: float, r2: float, test_size: int, train_size: int, model_type: 'RandomForestRegressor'}`
        - `POST /explain` — accepts `InsuranceInput`, encodes, runs `shap.TreeExplainer(model).shap_values(df_row)`, returns `{base_value: float, features: [{name, value, shap_value}] sorted by abs(shap_value) desc}`
      - CORS: origins `["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"]`, methods `["GET","POST"]`
      - All error responses return `{detail: str}` JSON; never expose stack traces
      Files: `api/app.py`
      Verify: `uvicorn api.app:app --port 8000` starts; `python -m pytest tests/test_api.py -v` passes all tests.

- [ ] 3. Update `requirements.txt` with pinned versions based on installed environment.
      Pin: `pandas==2.3.1`, `numpy==2.1.3`, `scikit-learn==1.8.0`, `xgboost==3.2.0`, `fastapi==0.115.6`, `uvicorn==0.32.1`, `shap==0.51.0`, `mlflow==3.10.1`, `pydantic==2.10.3`, `httpx==0.27.2`, `pytest==8.3.4`, `python-multipart>=0.0.9`; keep `aif360` unpinned (optional dep for notebook only).
      Files: `requirements.txt`
      Verify: `pip install -r requirements.txt --dry-run` (or `pip check`) with no errors.

- [ ] 4. Fix notebook cell 29: replace `y_pred` with `rf_pred` and add separate XGBoost evaluation below it.
      Cell 29 currently: `mae = mean_absolute_error(y_test, y_pred)` → change to `rf_mae = mean_absolute_error(y_test, rf_pred)` and `rf_r2 = r2_score(y_test, rf_pred)`; add new cell for `xgb_mae = mean_absolute_error(y_test, xgb_pred)` and `xgb_r2 = r2_score(y_test, xgb_pred)`.
      Files: `notebook/insurance_fairness_analysis.ipynb`
      Verify: Notebook cell 29 no longer references `y_pred`; can be executed without `NameError`.

---

### FEAT-002 — React Frontend

- [ ] 5. Scaffold Vite + React project at `frontend/` using `npm create vite@latest frontend -- --template react`.
      Install dependencies: `npm install recharts axios react-router-dom`.
      Create `frontend/.env` with `VITE_API_BASE_URL=http://localhost:8000`.
      Files: `frontend/` (new directory tree)
      Verify: `npm run dev` starts at http://localhost:5173 with default Vite page.

- [ ] 6. Create shared infrastructure files:
      - `frontend/src/api/client.js` — axios instance using `import.meta.env.VITE_API_BASE_URL`
      - `frontend/src/components/Navbar.jsx` — navigation links to Dashboard, Predict, Evaluation, Explainability, Fairness; navy/teal theme
      - `frontend/src/components/LoadingSpinner.jsx` — centered spinner component
      - `frontend/src/components/ErrorMessage.jsx` — error card with retry callback prop
      - `frontend/src/components/StatCard.jsx` — card displaying a label + value + optional subtitle
      - `frontend/src/index.css` — global CSS: navy `#1a2b4a` / teal `#0d9488` palette, Inter font, responsive base styles
      Files: listed above
      Verify: `npm run build` in `frontend/` exits 0 with no TypeScript/lint errors.

- [ ] 7. Create `frontend/src/App.jsx` with React Router v6 `<BrowserRouter>` wrapping `<Navbar>` and `<Routes>` for all 5 pages.
      Files: `frontend/src/App.jsx`, `frontend/src/main.jsx`
      Verify: `npm run build` exits 0.

- [ ] 8. Create `frontend/src/pages/Dashboard.jsx`:
      - On mount: fetch `/analytics/overview` and `/analytics/groups`
      - Show `<StatCard>` for: Total Records, Average Charges (USD), Median Charges (USD), Average Age, Average BMI
      - Show `<BarChart>` (Recharts) for each of: charges by smoker status, by age group, by BMI category, by region, by sex
      - Interactive filters (dropdowns): smoker status, sex, region — filter aggregation client-side from raw `/analytics/overview` data
      - All values from API response; no hardcoded data
      - Charts labeled clearly as "Average Historical Charges (USD)" from the 1,338-record dataset
      Files: `frontend/src/pages/Dashboard.jsx`
      Verify: `npm run build` exits 0; page renders charts when API is running.

- [ ] 9. Create `frontend/src/pages/Predict.jsx`:
      - Form fields: Age (number, 18–120), Gender (select: male/female), BMI (number, 10.0–60.0, step 0.1), Children (select 0–10), Smoker (select: yes/no), Region (select: northeast/northwest/southeast/southwest)
      - Client-side validation before submit; show field-level error messages
      - On submit: POST to `/predict` via axios; show `<LoadingSpinner>` during request
      - On success: show result card with predicted cost formatted as USD (`Intl.NumberFormat('en-US', {style:'currency',currency:'USD'})`) and the inputs used
      - On error (network or 503): show `<ErrorMessage>` with retry button; never show fabricated prediction
      - "New Prediction" button to reset form and result
      Files: `frontend/src/pages/Predict.jsx`
      Verify: `npm run build` exits 0; form validates and calls `/predict`.

- [ ] 10. Create `frontend/src/pages/Evaluation.jsx`:
       - On mount: fetch `/model/metrics`
       - Show MAE, R², test set size, train set size in `<StatCard>` components
       - Explanation text: "Evaluated on 20% held-out test split (random_state=42); model trained with scikit-learn 1.6.1 RandomForestRegressor"
       - No hardcoded metric values
       Files: `frontend/src/pages/Evaluation.jsx`
       Verify: `npm run build` exits 0.

- [ ] 11. Create `frontend/src/pages/Explainability.jsx`:
       - Same form inputs as Predict page (reuse form or extract a shared `InsuranceForm` component)
       - On submit: POST to `/explain`
       - Display SHAP contributions as a horizontal bar chart (positive = increases cost, negative = decreases cost) using Recharts `<BarChart layout="vertical">`
       - Show base value and final predicted cost
       - Label chart: "SHAP Feature Contributions — higher |value| means stronger influence on predicted cost"
       Files: `frontend/src/pages/Explainability.jsx`
       Verify: `npm run build` exits 0.

- [ ] 12. Create `frontend/src/pages/Fairness.jsx`:
       - On mount: fetch `/analytics/overview` (or `/analytics/groups`)
       - Show average charges by sex as a bar chart
       - Show average charges by smoker status as a bar chart
       - Explanatory text: "Fairness analysis based on historical dataset charges. These are actual recorded charges, not model predictions."
       - Note the gender disparity (if any) and smoker disparity from data
       Files: `frontend/src/pages/Fairness.jsx`
       Verify: `npm run build` exits 0.

---

### FEAT-003 — Tests

- [ ] 13. Create `tests/test_api.py` using `pytest` + `httpx.TestClient` (via `fastapi.testclient.TestClient`):
       Tests to include:
       - `test_model_loads` — asserts `/health` returns `model_loaded: true`
       - `test_health_endpoint` — GET `/health` returns 200 with `status` and `model_loaded` keys
       - `test_predict_valid` — POST `/predict` with `{age:35, bmi:28.5, children:1, sex:'male', smoker:'no', region:'northeast'}` returns 200 with `predicted_cost` > 0
       - `test_predict_invalid_age` — POST `/predict` with `age:-1` returns 422
       - `test_predict_invalid_bmi` — POST `/predict` with `bmi:200` returns 422
       - `test_predict_invalid_smoker` — POST `/predict` with `smoker:'maybe'` returns 422
       - `test_analytics_overview_keys` — GET `/analytics/overview` returns 200; response has keys: `total_records, avg_charges, median_charges, avg_age, avg_bmi, charges_by_smoker, charges_by_age_group, charges_by_bmi_category, charges_by_region, charges_by_sex`
       - `test_model_metrics_keys` — GET `/model/metrics` returns 200; response has keys: `mae, r2, test_size, train_size`
       - `test_explain_valid` — POST `/explain` with valid input returns 200; response has keys `base_value, features`; `features` is a list of 8 items
       Files: `tests/__init__.py` (empty), `tests/test_api.py`
       Verify: `python -m pytest tests/test_api.py -v` — all 9+ tests pass.

- [ ] 14. Create `tests/conftest.py` with a `client` fixture using FastAPI `TestClient`.
       Import `app` from `api.app` and return `TestClient(app)`.
       Files: `tests/conftest.py`
       Verify: `python -m pytest tests/ -v` passes.

---

### FEAT-004 — README and Documentation

- [ ] 15. Rewrite `README.md` with:
       - Project description and motivation
       - Architecture overview (backend FastAPI + frontend React/Vite)
       - Local setup instructions: backend (`uvicorn api.app:app --reload --port 8000`), frontend (`cd frontend && npm install && npm run dev`)
       - Docker instructions: `docker build -t insurance-api . && docker run -p 8000:8000 insurance-api`
       - API endpoint reference (all 7 endpoints with method, path, description, example request/response)
       - Dataset description: 1,338 records, 7 columns, source
       - Model description: RandomForestRegressor, 100 estimators, 8 features, MAE ≈ 2628, R² ≈ 0.858
       - Screenshot placeholder section
       - Note that `notebook/insurance_fairness_analysis.ipynb` contains full EDA and training code
       Files: `README.md`
       Verify: `Get-Content README.md | Select-String 'uvicorn'` — setup commands present.

---

## Critical Constraints (for all implementers)

1. **DO NOT retrain** — use `model/model.pkl` as-is. Metrics will show version warning; that is expected.
2. **Feature order is fixed**: `[age, bmi, children, sex_male, smoker_yes, region_northwest, region_southeast, region_southwest]`
3. **northeast is reference region** — all three region flags = 0 means northeast.
4. **Preserve**: `notebook/insurance_fairness_analysis.ipynb`, `notebook/insurance.csv`, `model/model.pkl`, `.git/`
5. **Delete**: `api/main.py`
6. **PowerShell**: use `;` not `&&` for command chaining
7. **No hardcoded analytics** — all numbers from API
8. **No fake predictions** — if backend unreachable, show error
9. `aif360` stays in `requirements.txt` (notebook dependency) but is never imported by `api/app.py`
10. Dockerfile uses Python 3.10; local dev uses Python 3.13 — `api/app.py` must be compatible with both
