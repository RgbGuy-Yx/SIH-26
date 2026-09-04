"""
Pydantic Schemas for ML Inference & ETA Calculation Pipeline.
Phase 2A: XGBoost Delay Prediction and ETA/Transit Time Computation.
"""

from datetime import datetime
from enum import IntEnum
from typing import Dict, Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class PriorityTier(IntEnum):
    """
    Railway Train Priority Tiers.
    1: Premium (Rajdhani, Shatabdi, Vande Bharat, Tejas)
    2: Superfast / Duronto / Garib Rath
    3: Express / Mail / Ordinary Passenger
    4: Freight / Special / Departmental
    """
    TIER_1_PREMIUM = 1
    TIER_2_SUPERFAST = 2
    TIER_3_EXPRESS = 3
    TIER_4_FREIGHT_SPECIAL = 4


class WeatherInput(BaseModel):
    """
    Atmospheric / Meteorological parameters for a rail section.
    Missing or invalid data will NOT be fabricated; instead, it triggers fallback.
    """
    is_foggy: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Fog indicator (1.0 = foggy, 0.0 = clear)"
    )
    avg_temperature: Optional[float] = Field(
        default=None,
        ge=-50.0,
        le=60.0,
        description="Average temperature in Celsius"
    )
    total_precipitation: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=500.0,
        description="Total precipitation in mm"
    )
    avg_wind_speed: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=200.0,
        description="Average wind speed in km/h"
    )
    avg_cloud_cover: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Average cloud cover percentage (0-100)"
    )

    def is_complete_and_valid(self) -> bool:
        """Check if all 5 weather parameters are non-null and valid."""
        fields = [
            self.is_foggy,
            self.avg_temperature,
            self.total_precipitation,
            self.avg_wind_speed,
            self.avg_cloud_cover
        ]
        return all(f is not None for f in fields)


class StationInferenceInput(BaseModel):
    """
    Input schema for single-station delay inference.
    Strictly excludes train_no, station_name, station_no, and route identifiers.
    Guarantees no target leakage by accepting only the previous station's accumulated delay.
    """
    hour_of_day: int = Field(
        ...,
        ge=0,
        le=23,
        description="Hour of day (0-23) for arrival at station N"
    )
    current_accumulated_delay: float = Field(
        ...,
        description="Lag-1 accumulated delay at previous station (N-1) in minutes"
    )
    priority_tier: PriorityTier = Field(
        ...,
        description="Operational priority tier (1=Premium, 2=Superfast, 3=Express, 4=Freight/Special)"
    )
    weather: Optional[WeatherInput] = Field(
        default=None,
        description="Atmospheric data for section (N-1 -> N). If None/incomplete, fallback is used."
    )
    is_origin: bool = Field(
        default=False,
        description="Flag indicating if the train is at or departing from its origin station"
    )


class PredictionResult(BaseModel):
    """
    Output schema for ML delay prediction.
    """
    predicted_delay_minutes: float = Field(
        ...,
        description="Predicted unconstrained delay at station N in minutes (D_hat_N)"
    )
    is_fallback: bool = Field(
        ...,
        description="True if prediction used fallback heuristics due to missing/invalid inputs"
    )
    fallback_reason: Optional[str] = Field(
        default=None,
        description="Human-readable explanation if fallback was triggered"
    )
    feature_vector: Optional[Dict[str, float]] = Field(
        default=None,
        description="Exact 8-feature dictionary passed into XGBoost (null when fallback)"
    )


class ETACalculationInput(BaseModel):
    """
    Input schema for final station ETA calculation.
    Formula: ETA_N = scheduled_arrival_N + predicted_delay_N + conflict_delay_N
    """
    scheduled_arrival: datetime = Field(
        ...,
        description="Timetable scheduled arrival time at station N"
    )
    predicted_delay_minutes: float = Field(
        ...,
        description="Predicted ML delay in minutes for station N"
    )
    conflict_delay_minutes: float = Field(
        default=0.0,
        ge=0.0,
        description="Network/graph conflict delay in minutes (defaults to 0 for Phase 2A)"
    )


class ETAResult(BaseModel):
    """
    Output schema for station ETA calculation.
    """
    scheduled_arrival: datetime = Field(
        ...,
        description="Timetable scheduled arrival time at station N"
    )
    predicted_delay_minutes: float = Field(
        ...,
        description="Predicted delay component in minutes"
    )
    conflict_delay_minutes: float = Field(
        ...,
        description="Conflict delay component in minutes (default: 0.0)"
    )
    total_delay_minutes: float = Field(
        ...,
        description="Total delay in minutes (predicted_delay + conflict_delay)"
    )
    estimated_arrival: datetime = Field(
        ...,
        description="Final computed Estimated Time of Arrival (ETA)"
    )
    is_fallback: bool = Field(
        default=False,
        description="Whether this ETA is based on a fallback prediction"
    )
    fallback_reason: Optional[str] = Field(
        default=None,
        description="Reason for fallback, if applicable"
    )


class TransitTimeInput(BaseModel):
    """
    Input schema for derived section transit-time calculation:
    TransitTime_(N-1 -> N) = (T_sched,N - T_sched,N-1) + (predicted_delay_N - delay_(N-1))
    """
    scheduled_departure_prev: datetime = Field(
        ...,
        description="Scheduled departure time from previous station (N-1)"
    )
    scheduled_arrival_curr: datetime = Field(
        ...,
        description="Scheduled arrival time at current target station (N)"
    )
    predicted_delay_curr: float = Field(
        ...,
        description="Predicted delay at current target station N (in minutes)"
    )
    delay_prev: float = Field(
        ...,
        description="Actual accumulated delay at previous station N-1 (in minutes)"
    )

    @model_validator(mode="after")
    def validate_schedule_ordering(self):
        if self.scheduled_arrival_curr < self.scheduled_departure_prev:
            raise ValueError(
                f"scheduled_arrival_curr ({self.scheduled_arrival_curr}) must be after "
                f"scheduled_departure_prev ({self.scheduled_departure_prev})"
            )
        return self


class TransitTimeResult(BaseModel):
    """
    Output schema for section transit-time calculation.
    Keeps scheduled travel time, delay delta, and total transit time distinct.
    """
    scheduled_travel_time_minutes: float = Field(
        ...,
        description="Scheduled section run time: T_sched,N - T_sched,N-1 (in minutes)"
    )
    predicted_delay_delta_minutes: float = Field(
        ...,
        description="Delay variation across section: predicted_delay_N - delay_(N-1) (in minutes)"
    )
    expected_transit_time_minutes: float = Field(
        ...,
        description="Total expected transit time for section N-1 -> N in minutes"
    )
