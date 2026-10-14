"""
Medical Insurance Cost Prediction API
FastAPI backend with analytics, model metrics, and SHAP explainability.
"""

from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
import pickle
import warnings

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "model" / "model.pkl"
DATA_PATH = BASE_DIR / "notebook" / "insurance.csv"

# ── Load model & dataset at startup ──────────────────────────────────────────
model = None
model_loaded = False
df: pd.DataFrame | None = None

try:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
    model_loaded = True
except Exception as e:
    print(f"[WARNING] Could not load model from {MODEL_PATH}: {e}")

try:
    df = pd.read_csv(DATA_PATH)
except Exception as e:
    print(f"[WARNING] Could not load dataset from {DATA_PATH}: {e}")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Medical Insurance Cost Prediction API",
    description="Predict insurance premium costs and analyze fairness across demographic groups.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Input schema ──────────────────────────────────────────────────────────────
class InsuranceInput(BaseModel):
    age: int = Field(..., ge=18, le=120, description="Age in years (18–120)")
    bmi: float = Field(..., ge=10.0, le=60.0, description="Body Mass Index (10.0–60.0)")
    children: int = Field(..., ge=0, le=10, description="Number of dependent children (0–10)")
    sex: Literal["male", "female"] = Field(..., description="Biological sex")
    smoker: Literal["yes", "no"] = Field(..., description="Smoking status")
    region: Literal["northeast", "northwest", "southeast", "southwest"] = Field(
        ..., description="US region of residence"
    )


# ── Encoding helper ───────────────────────────────────────────────────────────
FEATURE_ORDER = [
    "age", "bmi", "children",
    "sex_male", "smoker_yes",
    "region_northwest", "region_southeast", "region_southwest",
]


def encode_input(data: InsuranceInput) -> pd.DataFrame:
    """
    Encode human-readable InsuranceInput into the exact feature DataFrame
    that the trained RandomForestRegressor expects.

    Encoding mirrors pd.get_dummies(drop_first=True) applied during training:
      sex:     female = reference  →  sex_male = 1 if male, else 0
      smoker:  no     = reference  →  smoker_yes = 1 if yes, else 0
      region:  northeast = reference  →  region_northwest / _southeast / _southwest
    """
    row = {
        "age": data.age,
        "bmi": data.bmi,
        "children": data.children,
        "sex_male": 1 if data.sex == "male" else 0,
        "smoker_yes": 1 if data.smoker == "yes" else 0,
        "region_northwest": 1 if data.region == "northwest" else 0,
        "region_southeast": 1 if data.region == "southeast" else 0,
        "region_southwest": 1 if data.region == "southwest" else 0,
    }
    return pd.DataFrame([row], columns=FEATURE_ORDER)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "project": "Medical Insurance Cost Prediction",
        "description": "Predict insurance premium and analyze fairness across demographic groups.",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "GET  /",
            "GET  /health",
            "POST /predict",
            "GET  /analytics/overview",
            "GET  /analytics/groups",
            "GET  /model/metrics",
            "POST /explain",
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "ok" if model_loaded else "degraded",
        "model_loaded": model_loaded,
        "records_loaded": 0 if df is None else len(df),
    }


@app.post("/predict")
def predict(data: InsuranceInput):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not available")
    try:
        df_row = encode_input(data)
        prediction = model.predict(df_row)
        return {
            "predicted_cost": float(prediction[0]),
            "currency": "USD",
            "inputs": data.model_dump(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics/overview")
def analytics_overview():
    if df is None:
        raise HTTPException(status_code=503, detail="Dataset not available")

    age_bins = [17, 25, 35, 45, 55, 64]
    age_labels = ["18-25", "26-35", "36-45", "46-55", "56+"]
    bmi_bins = [0, 18.5, 25, 30, 999]
    bmi_labels = ["Underweight", "Normal", "Overweight", "Obese"]

    df_work = df.copy()
    df_work["age_group"] = pd.cut(df_work["age"], bins=age_bins, labels=age_labels)
    df_work["bmi_category"] = pd.cut(df_work["bmi"], bins=bmi_bins, labels=bmi_labels)

    def agg(group_col: str, label_col: str = None):
        col = label_col or group_col
        return (
            df_work.groupby(col, observed=True)["charges"]
            .mean()
            .reset_index()
            .rename(columns={col: "group" if label_col else group_col, "charges": "avg_charges"})
            .assign(**{"group" if label_col else group_col: lambda x: x["group" if label_col else group_col].astype(str)})
            .to_dict(orient="records")
        )

    charges_by_smoker = (
        df_work.groupby("smoker")["charges"]
        .mean()
        .reset_index()
        .rename(columns={"smoker": "group", "charges": "avg_charges"})
        .to_dict(orient="records")
    )
    charges_by_age_group = (
        df_work.groupby("age_group", observed=True)["charges"]
        .mean()
        .reset_index()
        .rename(columns={"age_group": "group", "charges": "avg_charges"})
        .assign(group=lambda x: x["group"].astype(str))
        .to_dict(orient="records")
    )
    charges_by_bmi_category = (
        df_work.groupby("bmi_category", observed=True)["charges"]
        .mean()
        .reset_index()
        .rename(columns={"bmi_category": "category", "charges": "avg_charges"})
        .assign(category=lambda x: x["category"].astype(str))
        .to_dict(orient="records")
    )
    charges_by_region = (
        df_work.groupby("region")["charges"]
        .mean()
        .reset_index()
        .rename(columns={"region": "region", "charges": "avg_charges"})
        .to_dict(orient="records")
    )
    charges_by_sex = (
        df_work.groupby("sex")["charges"]
        .mean()
        .reset_index()
        .rename(columns={"sex": "sex", "charges": "avg_charges"})
        .to_dict(orient="records")
    )

    return {
        "total_records": len(df_work),
        "avg_charges": round(float(df_work["charges"].mean()), 2),
        "median_charges": round(float(df_work["charges"].median()), 2),
        "avg_age": round(float(df_work["age"].mean()), 2),
        "avg_bmi": round(float(df_work["bmi"].mean()), 2),
        "charges_by_smoker": charges_by_smoker,
        "charges_by_age_group": charges_by_age_group,
        "charges_by_bmi_category": charges_by_bmi_category,
        "charges_by_region": charges_by_region,
        "charges_by_sex": charges_by_sex,
    }


@app.get("/analytics/groups")
def analytics_groups():
    if df is None:
        raise HTTPException(status_code=503, detail="Dataset not available")

    age_bins = [17, 25, 35, 45, 55, 64]
    age_labels = ["18-25", "26-35", "36-45", "46-55", "56+"]
    bmi_bins = [0, 18.5, 25, 30, 999]
    bmi_labels = ["Underweight", "Normal", "Overweight", "Obese"]

    df_work = df.copy()
    df_work["age_group"] = pd.cut(df_work["age"], bins=age_bins, labels=age_labels)
    df_work["bmi_category"] = pd.cut(df_work["bmi"], bins=bmi_bins, labels=bmi_labels)

    def recharts_group(col: str):
        return (
            df_work.groupby(col, observed=True)["charges"]
            .mean()
            .reset_index()
            .assign(**{col: lambda x: x[col].astype(str)})
            .rename(columns={col: "name", "charges": "value"})
            .to_dict(orient="records")
        )

    return {
        "smoker": recharts_group("smoker"),
        "age_group": recharts_group("age_group"),
        "bmi_category": recharts_group("bmi_category"),
        "region": recharts_group("region"),
        "sex": recharts_group("sex"),
    }


@app.get("/model/metrics")
def model_metrics():
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not available")
    if df is None:
        raise HTTPException(status_code=503, detail="Dataset not available")

    from sklearn.metrics import mean_absolute_error, r2_score
    from sklearn.model_selection import train_test_split

    df_enc = pd.get_dummies(df, drop_first=True)
    # Ensure the charges column is the target regardless of column order
    X = df_enc[FEATURE_ORDER]
    y = df_enc["charges"] if "charges" in df_enc.columns else df["charges"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        y_pred = model.predict(X_test)

    mae = float(mean_absolute_error(y_test, y_pred))
    r2 = float(r2_score(y_test, y_pred))

    return {
        "mae": round(mae, 2),
        "r2": round(r2, 4),
        "test_size": len(X_test),
        "train_size": len(X_train),
        "model_type": "RandomForestRegressor",
    }


@app.post("/explain")
def explain(data: InsuranceInput):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not available")
    try:
        import shap

        df_row = encode_input(data)
        explainer = shap.TreeExplainer(model)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            shap_values = explainer.shap_values(df_row)

        # shap_values shape: (1, 8)  — take the first (and only) row
        sv = np.array(shap_values)[0]

        features = [
            {
                "name": name,
                "value": float(df_row[name].iloc[0]),
                "shap_value": float(sv[i]),
            }
            for i, name in enumerate(FEATURE_ORDER)
        ]
        # Sort by |shap_value| descending
        features.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        # expected_value may be an ndarray (one value for regressors); extract scalar
        base_val = explainer.expected_value
        if hasattr(base_val, "__len__"):
            base_val = base_val[0]

        return {
            "base_value": float(base_val),
            "features": features,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
