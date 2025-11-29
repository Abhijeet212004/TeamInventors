import pickle
import os
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from xgboost import XGBClassifier
from sklearn.ensemble import IsolationForest

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Context-Based Risk Detection API",
    description="API for predicting context-based risk using a combined model."
)

# --- Configuration ---
MODELS_DIR = "."

# Optimal weights obtained from previous optimization step
xgb_weight_opt = 0.88776757
iso_weight_opt = 0.07508297
classification_threshold = 0.5

# --- Load Models and Scalers ---
def load_model_or_scaler(filename):
    filepath = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Model/Scaler file not found: {filepath}. Please ensure it's in the '{MODELS_DIR}' directory.")
    with open(filepath, 'rb') as f:
        return pickle.load(f)

try:
    xgb_model = load_model_or_scaler('xgb_classifier_model.pkl')
    isolation_forest = load_model_or_scaler('isolation_forest_model.pkl')
    scaler = load_model_or_scaler('standard_scaler.pkl')
    scaler_iso = load_model_or_scaler('min_max_scaler_iso.pkl')
    print("All models and scalers loaded successfully.")
except Exception as e:
    print(f"Error loading models or scalers: {e}")
    # In a production setup, you might want to exit or log a critical error.
    # For this example, we'll let the app start but prediction will fail without models.

# --- Define Input Data Model for FastAPI ---
class CombinedInput(BaseModel):
    lat: float
    lon: float
    speed_kmh: float
    dwell_minutes: float
    phone_inactive_minutes: float
    acceleration_variance: float
    gyroscope_variance: float
    nearby_hospitals: int
    nearby_police: int
    nearby_petrol: int
    nearby_public: int
    route_risk: float
    hour_of_day: int
    is_night: int
    day_of_week: int
    is_isolated_area: int
    distance_to_nearest_hospital_km: float
    age: int
    gender: int # 0 for M, 1 for F
    weight: int
    height: int
    has_conditions: int # 0 or 1

# Columns used for scaling by StandardScaler
CONTINUOUS_FEATURES = [
    'lat', 'lon', 'speed_kmh', 'dwell_minutes', 'phone_inactive_minutes',
    'acceleration_variance', 'gyroscope_variance', 'route_risk',
    'age', 'weight', 'height', 'distance_to_nearest_hospital_km'
]

# All feature columns in the order they were used for training
FEATURE_COLUMNS = [
    'lat', 'lon', 'speed_kmh', 'dwell_minutes', 'phone_inactive_minutes',
    'acceleration_variance', 'gyroscope_variance', 'nearby_hospitals',
    'nearby_police', 'nearby_petrol', 'nearby_public', 'route_risk',
    'hour_of_day', 'is_night', 'day_of_week', 'is_isolated_area',
    'distance_to_nearest_hospital_km', 'age', 'gender', 'weight',
    'height', 'has_conditions'
]

# --- API Endpoints ---
@app.get("/", summary="Health check")
async def root():
    return {"message": "API is running!"}

@app.post("/predict_risk", summary="Predict context-based risk")
async def predict_risk(data: CombinedInput):
    try:
        # Convert input data to DataFrame
        input_df = pd.DataFrame([data.dict()], columns=FEATURE_COLUMNS)

        # Apply StandardScaler to continuous features
        scaled_input = input_df[CONTINUOUS_FEATURES].copy()
        input_df[CONTINUOUS_FEATURES] = scaler.transform(scaled_input)

        # 1. XGBoost prediction
        xgb_prob = xgb_model.predict_proba(input_df[FEATURE_COLUMNS])[:, 1][0]

        # 2. IsolationForest prediction
        iso_score_raw = isolation_forest.decision_function(input_df[FEATURE_COLUMNS])[0]
        # To be consistent with how scaler_iso was trained (fitted on max_train - raw_scores_train),
        # we need to apply the same transformation logic. Here, we assume a simple inversion.
        # A more robust solution for deployment would be to save/load the max_iso_score_raw_train
        # or refit scaler_iso directly on raw scores.
        iso_score_transformed_inference = -iso_score_raw # Simple inversion
        iso_score = scaler_iso.transform(np.array(iso_score_transformed_inference).reshape(-1, 1))[0][0]

        # Calculate combined risk score
        context_risk = (
            xgb_weight_opt * xgb_prob +
            iso_weight_opt * iso_score
        )

        predicted_label = 1 if context_risk >= classification_threshold else 0

        return {
            "context_risk": float(context_risk),
            "predicted_label": int(predicted_label),
            "xgb_probability": float(xgb_prob),
            "isolation_forest_score": float(iso_score)
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

