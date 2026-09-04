"""
ML Inference & ETA Engine Package for Indian Railways Delay Prediction.
Phase 2A: XGBoost Model Loader, Feature Builder, Predictor, ETA & Transit Calculations.
"""

from app.ml.schemas import (
    PriorityTier,
    WeatherInput,
    StationInferenceInput,
    PredictionResult,
    ETACalculationInput,
    ETAResult,
    TransitTimeInput,
    TransitTimeResult,
)
from app.ml.model_loader import (
    ModelManager,
    get_model,
    get_feature_names,
    EXPECTED_FEATURES,
)
from app.ml.feature_builder import (
    validate_inference_input,
    validate_weather_data,
    build_feature_dict,
    build_feature_dataframe,
)
from app.ml.eta_calculator import (
    calculate_station_eta,
    calculate_section_transit_time,
)
from app.ml.predictor import (
    predict_delay,
    predict_and_calculate_eta,
)

__all__ = [
    # Schemas
    "PriorityTier",
    "WeatherInput",
    "StationInferenceInput",
    "PredictionResult",
    "ETACalculationInput",
    "ETAResult",
    "TransitTimeInput",
    "TransitTimeResult",
    # Model Loading
    "ModelManager",
    "get_model",
    "get_feature_names",
    "EXPECTED_FEATURES",
    # Feature Building
    "validate_inference_input",
    "validate_weather_data",
    "build_feature_dict",
    "build_feature_dataframe",
    # ETA & Transit Math
    "calculate_station_eta",
    "calculate_section_transit_time",
    # Predictor
    "predict_delay",
    "predict_and_calculate_eta",
]
