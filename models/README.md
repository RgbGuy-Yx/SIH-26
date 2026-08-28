# Models Directory

This directory stores trained machine learning model artifacts, encoders, and feature schema definitions.

## Key Artifacts
- `xgboost_eta_model.pkl` — Trained XGBoost Regressor for section delay prediction (Test MAE: 7.18 mins, R²: 0.9626).
- `model_features.json` — Exact 8-feature column ordering required for inference:
  1. `hour_of_day`
  2. `current_accumulated_delay`
  3. `priority_tier` (1–4)
  4. `is_foggy`
  5. `avg_temperature`
  6. `total_precipitation`
  7. `avg_wind_speed`
  8. `avg_cloud_cover`

*Target Variable*: `delay` (Station arrival delay in minutes).
