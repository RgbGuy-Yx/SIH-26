"""
Graph, Topology, and Conflict Resolution Schemas.
Phase 2C: XGBoost + NetworkX Integration.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from app.ml.schemas import PriorityTier, PredictionResult, ETAResult


class TrackType(str, Enum):
    """Railway track capacity classification."""
    SINGLE = "single"
    DOUBLE = "double"
    QUAD = "quad"


class StationNode(BaseModel):
    """Railway station node definition in NetworkX graph."""
    station_id: str = Field(..., description="Unique station code/identifier (e.g., 'NDLS', 'CNB')")
    name: str = Field(..., description="Full station name (e.g., 'New Delhi', 'Kanpur Central')")
    latitude: Optional[float] = Field(None, description="Geographic latitude")
    longitude: Optional[float] = Field(None, description="Geographic longitude")
    loop_capacity: int = Field(default=2, ge=0, description="Number of loop lines for overtaking/crossing")


class TrackSection(BaseModel):
    """Railway track section / block edge connecting two adjacent stations."""
    section_id: str = Field(..., description="Unique section identifier (e.g., 'NDLS-GZB')")
    station_from: str = Field(..., description="Origin station ID of section")
    station_to: str = Field(..., description="Destination station ID of section")
    length_km: float = Field(..., gt=0.0, description="Length of block section in km")
    track_type: TrackType = Field(default=TrackType.DOUBLE, description="Single or double line")
    max_speed_kmh: float = Field(default=130.0, gt=0.0, description="Maximum permissible section speed")
    min_headway_minutes: float = Field(default=5.0, ge=0.0, description="Minimum safety headway between trains")
    default_transit_minutes: float = Field(default=30.0, gt=0.0, description="Timetable standard transit time")


class TimeWindow(BaseModel):
    """Continuous temporal window for block section occupancy."""
    start_time: datetime = Field(..., description="Entry time into block section")
    end_time: datetime = Field(..., description="Exit/clearance time from block section")

    @property
    def duration_minutes(self) -> float:
        return max(0.0, (self.end_time - self.start_time).total_seconds() / 60.0)

    def overlaps_with(self, other: "TimeWindow", buffer_minutes: float = 0.0) -> bool:
        """Check if this time window overlaps with another window, considering safety buffer."""
        buf = timedelta(minutes=buffer_minutes)
        return not (self.end_time + buf <= other.start_time or self.start_time >= other.end_time + buf)


class SectionOccupancy(BaseModel):
    """Tracks projected or active occupancy of a track section by a train."""
    train_id: str
    section_id: str
    station_from: str
    station_to: str
    entry_time: datetime
    exit_time: datetime
    priority_tier: PriorityTier

    @property
    def time_window(self) -> TimeWindow:
        return TimeWindow(start_time=self.entry_time, end_time=self.exit_time)


class ConflictResult(BaseModel):
    """Structured resolution output from conflict detection engine."""
    has_conflict: bool = Field(..., description="True if resource contention was detected")
    conflict_delay_minutes: float = Field(default=0.0, ge=0.0, description="Additional waiting time applied")
    conflicting_train_id: Optional[str] = Field(None, description="ID of train creating contention")
    conflicting_priority_tier: Optional[PriorityTier] = Field(None, description="Priority tier of contending train")
    precedence_granted_to: Optional[str] = Field(None, description="ID of train granted track precedence")
    holding_station_id: Optional[str] = Field(None, description="Station/loop where train is held")
    resolution_reason: str = Field(..., description="Human-readable audit rationale for dispatch decision")


class PipelineStepResult(BaseModel):
    """
    Comprehensive result of one end-to-end Phase 2 intelligence step (Station N-1 -> Station N).
    Keeps previous delay, ML predicted delay, conflict delay, and final ETA completely separate.
    """
    train_id: str
    train_name: str
    priority_tier: PriorityTier
    from_station_id: str
    to_station_id: str
    section_id: str
    
    # Timing & Delays
    scheduled_departure_from: datetime
    scheduled_arrival_to: datetime
    previous_delay_minutes: float = Field(..., description="Lag-1 delay at stop N-1 (D_{N-1})")
    ml_predicted_delay_minutes: float = Field(..., description="ML model arrival delay (\\hat{D}_N)")
    conflict_delay_minutes: float = Field(..., description="NetworkX conflict waiting delay (\\Delta_{conflict})")
    total_final_delay_minutes: float = Field(..., description="Combined delay: \\hat{D}_N + \\Delta_{conflict}")
    
    # ETAs
    predicted_arrival_eta: datetime = Field(..., description="T_{sched,N} + \\hat{D}_N + \\Delta_{conflict}")
    
    # Derived Section Transit Times
    scheduled_section_runtime_minutes: float = Field(..., description="T_{sched,N} - T_{sched,N-1}")
    derived_section_transit_minutes: float = Field(
        ...,
        description="Scheduled transit + (\\hat{D}_N - D_{N-1}) + \\Delta_{conflict}"
    )
    
    # Fallback and Diagnostics
    is_fallback: bool
    fallback_reason: Optional[str]
    conflict_details: ConflictResult
    feature_vector: Optional[Dict[str, float]] = None
