from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os

# Initialize FastAPI app
app = FastAPI()

# --- Configuration for Model Loading ---
# IMPORTANT: Adjust this path to where you saved your models
MODELS_PATH = '.' # Models are in the current directory

# Load models and preprocessors globally
try:
    # Load StandardScaler
    scaler = joblib.load(os.path.join(MODELS_PATH, 'standard_scaler.pkl'))
    # Load OneHotEncoder
    encoder = joblib.load(os.path.join(MODELS_PATH, 'one_hot_encoder.pkl'))
    # Load XGBoost Classifier
    best_xgb_model = joblib.load(os.path.join(MODELS_PATH, 'xgboost_classifier_model.pkl'))

except Exception as e:
    raise RuntimeError(f"Error loading models or preprocessors: {e}. Make sure the '{MODELS_PATH}' directory exists and contains all required files.")

# --- Define the input data model for FastAPI ---
class PhysiologicalData(BaseModel):
    age: int
    gender: str
    weight: int
    height: int
    resting_hr: float
    resting_spo2: float
    hr_mean: float
    hr_std: float
    hr_min: float
    hr_max: float
    hr_slope: float
    rmssd: float
    sdnn: float
    spo2_mean: float
    spo2_std: float
    spo2_min: float
    spo2_max: float
    spo2_slope: float
    spo2_drop: float
    motion_mean: float
    motion_std: float
    percent_high_motion: float
    sqi: float


@app.post("/predict_anomaly/")
async def predict_anomaly(data: PhysiologicalData):
    # Convert input data to a Pandas DataFrame
    input_df = pd.DataFrame([data.model_dump()])

    # --- Preprocessing steps (must match training preprocessing) ---

    # Handle categorical 'gender' feature using the loaded encoder
    categorical_cols = ['gender'] # Assuming this was your categorical column
    gender_encoded = encoder.transform(input_df[categorical_cols])
    gender_df = pd.DataFrame(gender_encoded, columns=encoder.get_feature_names_out(categorical_cols), index=input_df.index)
    input_df_processed = input_df.drop(columns=categorical_cols).copy()
    input_df_processed = pd.concat([input_df_processed, gender_df], axis=1)

    # Scale numerical features using the loaded scaler
    scaled_features = scaler.transform(input_df_processed)
    scaled_df = pd.DataFrame(scaled_features, columns=input_df_processed.columns, index=input_df_processed.index)

    # --- XGBoost Classifier Prediction ---
    xgb_proba = best_xgb_model.predict_proba(scaled_df)[:, 1][0]

    # --- Anomaly Classification ---
    # You might use optimal_threshold_classifier if you want to classify xgb independently for reporting
    is_anomaly_xgb = 1 if xgb_proba > 0.8155 else 0 # Placeholder, adjust if you found a specific optimal threshold for XGB only

    return {
        "xgboost_probability": float(xgb_proba),
        "prediction_xgboost_only": int(is_anomaly_xgb),
    }