"""
ETA and Section Transit-Time Calculation Module.
Phase 2A: Mathematical ETA engine and section transit duration calculations.
"""

from datetime import datetime, timedelta
from typing import Optional

from app.ml.schemas import (
    ETACalculationInput,
    ETAResult,
    TransitTimeInput,
    TransitTimeResult,
)


def calculate_station_eta(
    scheduled_arrival: datetime,
    predicted_delay_minutes: float,
    conflict_delay_minutes: float = 0.0,
    is_fallback: bool = False,
    fallback_reason: Optional[str] = None
) -> ETAResult:
    """
    Compute estimated arrival time at Station N.
    Formula:
        Total_Delay_N = predicted_delay_N + conflict_delay_N
        ETA_N = scheduled_arrival_N + Total_Delay_N
    """
    total_delay = round(predicted_delay_minutes + conflict_delay_minutes, 2)
    estimated_arrival = scheduled_arrival + timedelta(minutes=total_delay)

    return ETAResult(
        scheduled_arrival=scheduled_arrival,
        predicted_delay_minutes=round(predicted_delay_minutes, 2),
        conflict_delay_minutes=round(conflict_delay_minutes, 2),
        total_delay_minutes=total_delay,
        estimated_arrival=estimated_arrival,
        is_fallback=is_fallback,
        fallback_reason=fallback_reason
    )


def calculate_section_transit_time(
    scheduled_departure_prev: datetime,
    scheduled_arrival_curr: datetime,
    predicted_delay_curr: float,
    delay_prev: float
) -> TransitTimeResult:
    """
    Compute expected transit time across section (N-1 -> N).
    Formula:
        TransitTime_(N-1 -> N) = (T_sched,N - T_sched,N-1) + (predicted_delay_N - delay_(N-1))

    Separates concepts:
    - Scheduled Travel Time = (T_sched,N - T_sched,N-1)
    - Delay Delta = (predicted_delay_N - delay_(N-1))
    - Total Expected Transit Time = Scheduled Travel Time + Delay Delta
    """
    # 1. Scheduled travel time in minutes
    scheduled_seconds = (scheduled_arrival_curr - scheduled_departure_prev).total_seconds()
    scheduled_travel_minutes = round(scheduled_seconds / 60.0, 2)

    # 2. Section delay delta (minutes lost or made up in this block section)
    delay_delta_minutes = round(predicted_delay_curr - delay_prev, 2)

    # 3. Total expected section transit duration in minutes
    expected_transit_minutes = round(scheduled_travel_minutes + delay_delta_minutes, 2)

    return TransitTimeResult(
        scheduled_travel_time_minutes=scheduled_travel_minutes,
        predicted_delay_delta_minutes=delay_delta_minutes,
        expected_transit_time_minutes=expected_transit_minutes
    )
