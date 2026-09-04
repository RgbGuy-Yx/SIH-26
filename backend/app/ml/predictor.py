"""
XGBoost Delay Predictor with Graceful Fallback Strategy.
Phase 2A: ML Delay Inference Engine.
"""

import logging
from typing import Optional, Tuple
from datetime import datetime

from app.ml.model_loader import get_model
from app.ml.feature_builder import (
    validate_inference_input,
    validate_weather_data,
    build_feature_dataframe,
    build_feature_dict,
)
from app.ml.schemas import (
    StationInferenceInput,
    PredictionResult,
    ETAResult,
)
from app.ml.eta_calculator import calculate_station_eta

logger = logging.getLogger(__name__)


def predict_delay(input_data: StationInferenceInput) -> PredictionResult:
    """
    Predict next station arrival delay (D_hat_N) in minutes.

    Execution Flow:
    1. Validates base inputs (hour_of_day, priority_tier, current_accumulated_delay).
    2. Validates weather features.
       - If weather is missing or incomplete, triggers deterministic fallback:
         * Origin station: 0.0 minutes (static timetable).
         * Intermediate station: input_data.current_accumulated_delay (last known delay).
    3. Builds 8-feature DataFrame with exact training schema.
    4. Performs model inference with cached XGBoost regressor.
    5. Returns PredictionResult with predicted_delay_minutes and metadata.
    """
    # 1. Base input validation
    is_valid_input, input_err = validate_inference_input(input_data)
    if not is_valid_input:
        # If base inputs are fundamentally malformed, fallback to safe timetable/last delay
        fallback_delay = 0.0 if input_data.is_origin else float(input_data.current_accumulated_delay or 0.0)
        return PredictionResult(
            predicted_delay_minutes=round(fallback_delay, 2),
            is_fallback=True,
            fallback_reason=f"Invalid inference inputs: {input_err}",
            feature_vector=None
        )

    # 2. Weather validation
    is_valid_weather, weather_err = validate_weather_data(input_data.weather)
    if not is_valid_weather:
        if input_data.is_origin:
            fallback_delay = 0.0
            reason = f"Origin station: weather data unavailable ({weather_err}); using static timetable (0.0 mins delay)."
        else:
            fallback_delay = float(input_data.current_accumulated_delay)
            reason = (
                f"Weather data unavailable or incomplete ({weather_err}); "
                f"falling back to last known accumulated delay ({fallback_delay:.2f} mins)."
            )

        logger.warning(f"[ML Fallback] {reason}")
        return PredictionResult(
            predicted_delay_minutes=round(fallback_delay, 2),
            is_fallback=True,
            fallback_reason=reason,
            feature_vector=None
        )

    # 3. Build features & Run Inference
    try:
        feature_df = build_feature_dataframe(input_data)
        feature_dict = build_feature_dict(input_data)
        model = get_model()

        raw_prediction = float(model.predict(feature_df)[0])
        predicted_delay = round(raw_prediction, 2)

        return PredictionResult(
            predicted_delay_minutes=predicted_delay,
            is_fallback=False,
            fallback_reason=None,
            feature_vector=feature_dict
        )
    except Exception as exc:
        logger.error(f"XGBoost inference encountered an exception: {exc}", exc_info=True)
        fallback_delay = 0.0 if input_data.is_origin else float(input_data.current_accumulated_delay)
        return PredictionResult(
            predicted_delay_minutes=round(fallback_delay, 2),
            is_fallback=True,
            fallback_reason=f"Inference runtime error ({exc}); using last known delay.",
            feature_vector=None
        )


def predict_and_calculate_eta(
    input_data: StationInferenceInput,
    scheduled_arrival: datetime,
    conflict_delay_minutes: float = 0.0
) -> Tuple[PredictionResult, ETAResult]:
    """
    Convenience orchestrator: predicts station delay and computes final ETA.
    """
    pred_res = predict_delay(input_data)
    eta_res = calculate_station_eta(
        scheduled_arrival=scheduled_arrival,
        predicted_delay_minutes=pred_res.predicted_delay_minutes,
        conflict_delay_minutes=conflict_delay_minutes,
        is_fallback=pred_res.is_fallback,
        fallback_reason=pred_res.fallback_reason
    )
    return pred_res, eta_res
