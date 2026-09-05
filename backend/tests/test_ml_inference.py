"""
Unit Tests for Phase 2A: ML Inference, Feature Building, ETA, and Transit Time Calculations.
Compatible with pytest and standard standalone Python test execution.
"""

import math
import os
from datetime import datetime, timedelta

from app.ml.model_loader import ModelManager, get_model, get_feature_names, EXPECTED_FEATURES
from app.ml.schemas import (
    PriorityTier,
    WeatherInput,
    StationInferenceInput,
    PredictionResult,
    ETAResult,
    TransitTimeResult,
)
from app.ml.feature_builder import (
    validate_inference_input,
    validate_weather_data,
    build_feature_dict,
    build_feature_dataframe,
    build_feature_numpy,
)
from app.ml.predictor import predict_delay, predict_and_calculate_eta
from app.ml.eta_calculator import calculate_station_eta, calculate_section_transit_time


class RaisesContext:
    """Helper context manager to assert exceptions without requiring pytest."""
    def __init__(self, exc_type):
        self.exc_type = exc_type

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            raise AssertionError(f"Expected {self.exc_type.__name__} was not raised")
        return issubclass(exc_type, self.exc_type)


def raises(exc_type):
    return RaisesContext(exc_type)


# ============================================================================
# 1. MODEL LOADING & CACHING TESTS
# ============================================================================

def test_model_loading_and_singleton():
    """Verify that the model is loaded once as a singleton and has a predict method."""
    manager1 = ModelManager()
    manager2 = ModelManager()
    assert manager1 is manager2, "ModelManager must be a singleton instance"

    model = get_model()
    assert model is not None, "Loaded model must not be None"
    assert hasattr(model, "predict"), "Model must implement a predict() method"


def test_feature_schema_loading_and_ordering():
    """Verify that loaded features exactly match the 8 expected canonical features."""
    features = get_feature_names()
    assert len(features) == 8, f"Expected 8 features, got {len(features)}"
    assert features == [
        "hour_of_day",
        "current_accumulated_delay",
        "priority_tier",
        "is_foggy",
        "avg_temperature",
        "total_precipitation",
        "avg_wind_speed",
        "avg_cloud_cover"
    ], "Feature order in model_features.json does not match canonical order"


# ============================================================================
# 2. FEATURE ORDERING & BUILDING TESTS
# ============================================================================

def test_feature_dataframe_structure():
    """Verify built DataFrame matches feature names and column order exactly."""
    weather = WeatherInput(
        is_foggy=1.0,
        avg_temperature=12.5,
        total_precipitation=4.2,
        avg_wind_speed=15.0,
        avg_cloud_cover=80.0
    )
    input_data = StationInferenceInput(
        hour_of_day=8,
        current_accumulated_delay=15.0,
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        weather=weather,
        is_origin=False
    )

    df = build_feature_dataframe(input_data)
    assert list(df.columns) == EXPECTED_FEATURES
    assert df.shape == (1, 8)
    assert df.iloc[0]["hour_of_day"] == 8.0
    assert df.iloc[0]["current_accumulated_delay"] == 15.0
    assert df.iloc[0]["priority_tier"] == 1.0
    assert df.iloc[0]["is_foggy"] == 1.0
    assert df.iloc[0]["avg_temperature"] == 12.5
    assert df.iloc[0]["total_precipitation"] == 4.2
    assert df.iloc[0]["avg_wind_speed"] == 15.0
    assert df.iloc[0]["avg_cloud_cover"] == 80.0


def test_feature_numpy_structure():
    """Verify built NumPy array matches canonical feature order, shape (1, 8), and float32 dtype."""
    weather = WeatherInput(
        is_foggy=1.0,
        avg_temperature=12.5,
        total_precipitation=4.2,
        avg_wind_speed=15.0,
        avg_cloud_cover=80.0
    )
    input_data = StationInferenceInput(
        hour_of_day=8,
        current_accumulated_delay=15.0,
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        weather=weather,
        is_origin=False
    )

    arr = build_feature_numpy(input_data)
    assert arr.shape == (1, 8)
    assert arr.dtype.name == "float32"
    assert arr[0, 0] == 8.0
    assert arr[0, 1] == 15.0
    assert arr[0, 2] == 1.0
    assert arr[0, 3] == 1.0
    assert arr[0, 4] == 12.5
    assert arr[0, 5] == 4.2
    assert arr[0, 6] == 15.0
    assert arr[0, 7] == 80.0



# ============================================================================
# 3. VALID ML PREDICTION TEST
# ============================================================================

def test_valid_ml_prediction():
    """Verify that valid inputs produce a realistic non-fallback delay prediction."""
    weather = WeatherInput(
        is_foggy=0.0,
        avg_temperature=28.0,
        total_precipitation=0.0,
        avg_wind_speed=8.5,
        avg_cloud_cover=15.0
    )
    input_data = StationInferenceInput(
        hour_of_day=14,
        current_accumulated_delay=10.0,
        priority_tier=PriorityTier.TIER_2_SUPERFAST,
        weather=weather,
        is_origin=False
    )

    result = predict_delay(input_data)
    assert isinstance(result, PredictionResult)
    assert result.is_fallback is False
    assert result.fallback_reason is None
    assert isinstance(result.predicted_delay_minutes, float)
    assert not math.isnan(result.predicted_delay_minutes)
    assert result.feature_vector is not None
    assert len(result.feature_vector) == 8


# ============================================================================
# 4. MISSING FEATURES & WEATHER FALLBACK TESTS
# ============================================================================

def test_fallback_on_none_weather():
    """Verify that missing weather triggers fallback using last known accumulated delay."""
    input_data = StationInferenceInput(
        hour_of_day=10,
        current_accumulated_delay=25.5,
        priority_tier=PriorityTier.TIER_3_EXPRESS,
        weather=None,
        is_origin=False
    )

    result = predict_delay(input_data)
    assert result.is_fallback is True
    assert result.predicted_delay_minutes == 25.5
    assert "Weather data" in result.fallback_reason
    assert result.feature_vector is None


def test_fallback_on_incomplete_weather():
    """Verify that incomplete weather fields trigger fallback."""
    incomplete_weather = WeatherInput(
        is_foggy=0.0,
        avg_temperature=25.0,
        total_precipitation=None,  # Missing field
        avg_wind_speed=10.0,
        avg_cloud_cover=50.0
    )
    input_data = StationInferenceInput(
        hour_of_day=18,
        current_accumulated_delay=12.0,
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        weather=incomplete_weather,
        is_origin=False
    )

    result = predict_delay(input_data)
    assert result.is_fallback is True
    assert result.predicted_delay_minutes == 12.0
    assert "total_precipitation" in result.fallback_reason


def test_origin_station_fallback():
    """Verify origin station with missing weather falls back to 0.0 delay (static timetable)."""
    input_data = StationInferenceInput(
        hour_of_day=6,
        current_accumulated_delay=0.0,
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        weather=None,
        is_origin=True
    )

    result = predict_delay(input_data)
    assert result.is_fallback is True
    assert result.predicted_delay_minutes == 0.0
    assert "Origin station" in result.fallback_reason


# ============================================================================
# 5. INVALID VALUES & BOUNDS VALIDATION TESTS
# ============================================================================

def test_invalid_hour_of_day_rejected():
    """Verify pydantic validation rejects invalid hour_of_day."""
    with raises(ValueError):
        StationInferenceInput(
            hour_of_day=25,  # Invalid hour
            current_accumulated_delay=5.0,
            priority_tier=PriorityTier.TIER_1_PREMIUM
        )


def test_invalid_weather_bounds_triggers_fallback():
    """Verify weather data with out-of-bounds values triggers fallback."""
    with raises(ValueError):
        WeatherInput(
            is_foggy=2.5,  # Valid is [0, 1]
            avg_temperature=25.0,
            total_precipitation=0.0,
            avg_wind_speed=10.0,
            avg_cloud_cover=50.0
        )


# ============================================================================
# 6. TARGET LEAKAGE PREVENTION & IDENTITY AGNOSTICISM TESTS
# ============================================================================

def test_no_target_leakage_and_no_identities():
    """
    Verify schema does NOT accept target station delay, train_no,
    station_name, or route IDs.
    """
    schema_fields = StationInferenceInput.model_fields.keys()
    forbidden_fields = [
        "target_delay",
        "actual_delay",
        "train_no",
        "station_name",
        "station_no",
        "route_id",
        "source_station",
        "dest_station"
    ]
    for field in forbidden_fields:
        assert field not in schema_fields, f"Forbidden field '{field}' found in schema!"

    assert "current_accumulated_delay" in schema_fields, (
        "current_accumulated_delay (Lag-1 delay from previous station N-1) must be present"
    )


# ============================================================================
# 7. ETA CALCULATION TESTS
# ============================================================================

def test_eta_calculation_standard():
    """
    Test ETA formula: ETA_N = scheduled_arrival_N + predicted_delay_N + conflict_delay_N
    """
    sched_arrival = datetime(2026, 8, 28, 14, 30, 0)
    pred_delay = 15.5
    conflict_delay = 0.0  # Phase 2A default

    eta_res = calculate_station_eta(
        scheduled_arrival=sched_arrival,
        predicted_delay_minutes=pred_delay,
        conflict_delay_minutes=conflict_delay
    )

    expected_arrival = sched_arrival + timedelta(minutes=15.5)  # 14:45:30
    assert eta_res.scheduled_arrival == sched_arrival
    assert eta_res.predicted_delay_minutes == 15.5
    assert eta_res.conflict_delay_minutes == 0.0
    assert eta_res.total_delay_minutes == 15.5
    assert eta_res.estimated_arrival == expected_arrival


def test_eta_calculation_with_conflict_delay():
    """Test ETA with non-zero conflict delay."""
    sched_arrival = datetime(2026, 8, 28, 10, 0, 0)
    pred_delay = 12.0
    conflict_delay = 8.0

    eta_res = calculate_station_eta(
        scheduled_arrival=sched_arrival,
        predicted_delay_minutes=pred_delay,
        conflict_delay_minutes=conflict_delay
    )

    expected_arrival = sched_arrival + timedelta(minutes=20.0)  # 10:20:00
    assert eta_res.total_delay_minutes == 20.0
    assert eta_res.estimated_arrival == expected_arrival


# ============================================================================
# 8. SECTION TRANSIT-TIME CALCULATION TESTS
# ============================================================================

def test_section_transit_time_calculation():
    """
    Formula: TransitTime_(N-1 -> N) = (T_sched,N - T_sched,N-1) + (predicted_delay_N - delay_(N-1))
    """
    sched_dep_prev = datetime(2026, 8, 28, 12, 0, 0)
    sched_arr_curr = datetime(2026, 8, 28, 12, 45, 0)  # Scheduled: 45 minutes
    delay_prev = 10.0                                  # 10 mins delay at N-1
    pred_delay_curr = 18.0                             # 18 mins delay at N

    transit_res = calculate_section_transit_time(
        scheduled_departure_prev=sched_dep_prev,
        scheduled_arrival_curr=sched_arr_curr,
        predicted_delay_curr=pred_delay_curr,
        delay_prev=delay_prev
    )

    assert transit_res.scheduled_travel_time_minutes == 45.0
    assert transit_res.predicted_delay_delta_minutes == 8.0  # Lost 8 additional minutes
    assert transit_res.expected_transit_time_minutes == 53.0  # 45 + 8 = 53


def test_section_transit_time_time_recovery():
    """Verify transit time calculation when train recovers time (delta is negative)."""
    sched_dep_prev = datetime(2026, 8, 28, 12, 0, 0)
    sched_arr_curr = datetime(2026, 8, 28, 13, 0, 0)   # Scheduled: 60 minutes
    delay_prev = 20.0                                  # 20 mins delay at N-1
    pred_delay_curr = 15.0                             # 15 mins delay at N (recovered 5 mins)

    transit_res = calculate_section_transit_time(
        scheduled_departure_prev=sched_dep_prev,
        scheduled_arrival_curr=sched_arr_curr,
        predicted_delay_curr=pred_delay_curr,
        delay_prev=delay_prev
    )

    assert transit_res.scheduled_travel_time_minutes == 60.0
    assert transit_res.predicted_delay_delta_minutes == -5.0
    assert transit_res.expected_transit_time_minutes == 55.0


# ============================================================================
# 9. END-TO-END PREDICT & ETA ORCHESTRATOR TEST
# ============================================================================

def test_predict_and_calculate_eta_orchestrator():
    """Test end-to-end inference and ETA orchestrator."""
    weather = WeatherInput(
        is_foggy=1.0,
        avg_temperature=8.0,
        total_precipitation=12.0,
        avg_wind_speed=25.0,
        avg_cloud_cover=95.0
    )
    input_data = StationInferenceInput(
        hour_of_day=7,
        current_accumulated_delay=30.0,
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        weather=weather,
        is_origin=False
    )
    sched_arr = datetime(2026, 8, 28, 8, 15, 0)

    pred_res, eta_res = predict_and_calculate_eta(
        input_data=input_data,
        scheduled_arrival=sched_arr,
        conflict_delay_minutes=0.0
    )

    assert isinstance(pred_res, PredictionResult)
    assert isinstance(eta_res, ETAResult)
    assert not pred_res.is_fallback
    assert eta_res.total_delay_minutes == pred_res.predicted_delay_minutes
    assert eta_res.estimated_arrival == sched_arr + timedelta(minutes=pred_res.predicted_delay_minutes)
