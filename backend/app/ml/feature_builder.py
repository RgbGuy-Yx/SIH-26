"""
Feature Builder and Validator for XGBoost Delay Predictor.
Constructs canonical 8-feature DataFrame while strictly preventing target leakage
and validating feature constraints.
Phase 2A: Feature Engineering.
"""

from typing import Dict, Optional, Tuple
import math
import numpy as np
import pandas as pd

from app.ml.model_loader import EXPECTED_FEATURES, get_feature_names
from app.ml.schemas import StationInferenceInput, WeatherInput, PriorityTier


def validate_weather_data(weather: Optional[WeatherInput]) -> Tuple[bool, Optional[str]]:
    """
    Validate that atmospheric/weather data is present, complete, and contains non-NaN values.
    Strictly forbids fabricating or hallucinating missing weather observations.
    """
    if weather is None:
        return False, "Weather data is None / unavailable from atmospheric feed."

    fields = {
        "is_foggy": weather.is_foggy,
        "avg_temperature": weather.avg_temperature,
        "total_precipitation": weather.total_precipitation,
        "avg_wind_speed": weather.avg_wind_speed,
        "avg_cloud_cover": weather.avg_cloud_cover,
    }

    for name, val in fields.items():
        if val is None:
            return False, f"Weather parameter '{name}' is missing."
        if isinstance(val, (float, int)) and (math.isnan(val) or math.isinf(val)):
            return False, f"Weather parameter '{name}' is NaN or infinite ({val})."

    # Value range checks
    if not (0.0 <= weather.is_foggy <= 1.0):
        return False, f"is_foggy out of range [0, 1]: {weather.is_foggy}"
    if not (-50.0 <= weather.avg_temperature <= 60.0):
        return False, f"avg_temperature out of realistic range [-50, 60] C: {weather.avg_temperature}"
    if not (0.0 <= weather.total_precipitation <= 500.0):
        return False, f"total_precipitation out of range [0, 500] mm: {weather.total_precipitation}"
    if not (0.0 <= weather.avg_wind_speed <= 200.0):
        return False, f"avg_wind_speed out of range [0, 200] km/h: {weather.avg_wind_speed}"
    if not (0.0 <= weather.avg_cloud_cover <= 100.0):
        return False, f"avg_cloud_cover out of range [0, 100] %: {weather.avg_cloud_cover}"

    return True, None


def validate_inference_input(input_data: StationInferenceInput) -> Tuple[bool, Optional[str]]:
    """
    Validate input boundaries and types for delay prediction.
    """
    if not (0 <= input_data.hour_of_day <= 23):
        return False, f"hour_of_day must be between 0 and 23, got: {input_data.hour_of_day}"

    if not isinstance(input_data.priority_tier, (PriorityTier, int)) or int(input_data.priority_tier) not in (1, 2, 3, 4):
        return False, f"priority_tier must be integer between 1 and 4, got: {input_data.priority_tier}"

    if math.isnan(input_data.current_accumulated_delay) or math.isinf(input_data.current_accumulated_delay):
        return False, f"current_accumulated_delay must be a finite number, got: {input_data.current_accumulated_delay}"

    return True, None


def build_feature_dict(input_data: StationInferenceInput) -> Dict[str, float]:
    """
    Construct the raw 8-feature dictionary in strict order.
    Requires input_data.weather to be non-null and valid.
    """
    is_valid_weather, reason = validate_weather_data(input_data.weather)
    if not is_valid_weather:
        raise ValueError(f"Cannot build feature vector: {reason}")

    w = input_data.weather
    feature_dict = {
        "hour_of_day": float(input_data.hour_of_day),
        "current_accumulated_delay": float(input_data.current_accumulated_delay),
        "priority_tier": float(int(input_data.priority_tier)),
        "is_foggy": float(w.is_foggy),
        "avg_temperature": float(w.avg_temperature),
        "total_precipitation": float(w.total_precipitation),
        "avg_wind_speed": float(w.avg_wind_speed),
        "avg_cloud_cover": float(w.avg_cloud_cover),
    }
    return feature_dict


def build_feature_dataframe(input_data: StationInferenceInput) -> pd.DataFrame:
    """
    Construct a 1-row pandas DataFrame containing the 8 features matching
    the exact schema and column ordering of the trained XGBoost model.
    """
    feature_dict = build_feature_dict(input_data)
    expected_order = get_feature_names()

    # Ensure all expected columns are present and ordered
    ordered_data = {col: [feature_dict[col]] for col in expected_order}
    df = pd.DataFrame(ordered_data)
    return df
