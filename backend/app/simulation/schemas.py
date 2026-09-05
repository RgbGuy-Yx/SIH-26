"""
Simulation State, Clock, and Snapshot Schemas.
Phase 3A: Deterministic Realistic Train Simulation Engine.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from app.ml.schemas import PriorityTier


class TrainStatus(str, Enum):
    """Operational status of a train in the simulation network."""
    NOT_STARTED = "NOT_STARTED"   # Simulation time is before train's origin departure
    AT_STATION = "AT_STATION"     # Train is currently stopped at an intermediate halt
    RUNNING = "RUNNING"           # Train is actively in transit between two stations
    DELAYED = "DELAYED"           # Train is running with delay (> 15 mins)
    HOLDING = "HOLDING"           # Train is held on loop line / signal due to conflict
    ARRIVED = "ARRIVED"           # Train has just reached its destination
    COMPLETED = "COMPLETED"       # Train journey has finished


class TrainSimulationState(BaseModel):
    """
    Complete state of an individual train at any instant in simulation time.
    Keeps previous delay, ML predicted delay, conflict delay, and final ETA cleanly separate.
    """
    train_no: int = Field(..., description="Unique train identifier number (e.g. 12003)")
    train_name: str = Field(..., description="Full train name")
    priority_tier: PriorityTier = Field(..., description="Operational priority tier (1 to 4)")
    
    # Positional & Route Info
    current_station: str = Field(..., description="Last departed or currently stopped station code")
    previous_station: Optional[str] = Field(None, description="Preceding station code on route")
    next_station: Optional[str] = Field(None, description="Upcoming target station code")
    current_section: Optional[str] = Field(None, description="Active track section identifier (e.g. 'SEC-LJN-ON')")
    route_progress: float = Field(default=0.0, ge=0.0, le=1.0, description="Section traversal progress [0.0, 1.0]")
    latitude: float = Field(..., description="Current interpolated geographic latitude")
    longitude: float = Field(..., description="Current interpolated geographic longitude")
    
    # Timetable & Schedule Timings (ISO-8601 strings or formatted time strings)
    scheduled_arrival: Optional[str] = Field(None, description="Timetable scheduled arrival time at target stop")
    scheduled_departure: Optional[str] = Field(None, description="Timetable scheduled departure time from current stop")
    simulated_arrival: Optional[str] = Field(None, description="Projected physical arrival time considering delays")
    
    # Decoupled Delays (in minutes)
    current_accumulated_delay: float = Field(default=0.0, description="Lag-1 delay at preceding stop (D_{N-1})")
    ml_predicted_delay: float = Field(default=0.0, description="Delay predicted by XGBoost regressor (\\hat{D}_N)")
    conflict_delay: float = Field(default=0.0, ge=0.0, description="Waiting delay from NetworkX conflict engine (\\Delta_{conflict})")
    final_predicted_delay: float = Field(default=0.0, description="Total delay: \\hat{D}_N + \\Delta_{conflict}")
    predicted_eta: Optional[str] = Field(None, description="Computed final arrival ETA at next stop")
    
    # Status & Diagnostic Metadata
    train_status: TrainStatus = Field(default=TrainStatus.NOT_STARTED, description="Current operational status")
    simulation_timestamp: str = Field(..., description="Current virtual simulation clock timestamp")
    is_fallback: bool = Field(default=False, description="Whether fallback heuristics were used for ETA")
    fallback_reason: Optional[str] = Field(default=None, description="Reason if fallback was triggered")


class SimulationConfig(BaseModel):
    """Configuration parameters for deterministic virtual simulation runs."""
    start_time: Optional[datetime] = Field(default=None, description="Starting virtual clock datetime")
    time_multiplier: float = Field(default=60.0, gt=0.0, description="Virtual speed (e.g. 60.0 = 1 sec is 1 min)")
    tick_interval_seconds: float = Field(default=1.0, gt=0.0, description="Discrete tick interval in seconds")
    selected_train_ids: Optional[List[int]] = Field(default=None, description="Train numbers to include (None = all)")
    weather_enabled: bool = Field(default=True, description="Whether to include atmospheric weather in ML inference")


class SimulationSnapshot(BaseModel):
    """Instantaneous snapshot of the entire railway simulation network."""
    simulation_time: str = Field(..., description="Current virtual simulation clock timestamp")
    is_running: bool = Field(..., description="Whether simulation clock is actively running")
    is_paused: bool = Field(..., description="Whether simulation is paused")
    time_multiplier: float = Field(..., description="Current time multiplier speed")
    active_train_count: int = Field(..., description="Total number of active trains in simulation")
    trains: List[TrainSimulationState] = Field(default_factory=list, description="List of all train states")
    active_conflicts: List[Dict[str, Any]] = Field(default_factory=list, description="Currently detected conflicts")


class TrainDeltaState(BaseModel):
    """
    Minimal lightweight delta state for periodic WebSocket streaming.
    Transmits only frequently mutating dynamic telemetry properties, omitting static timetables.
    """
    train_no: int = Field(..., description="Unique train identifier number (e.g. 12003)")
    latitude: float = Field(..., description="Current interpolated geographic latitude")
    longitude: float = Field(..., description="Current interpolated geographic longitude")
    route_progress: float = Field(..., ge=0.0, le=1.0, description="Section traversal progress [0.0, 1.0]")
    current_station: str = Field(..., description="Last departed or currently stopped station code")
    next_station: Optional[str] = Field(None, description="Upcoming target station code")
    current_accumulated_delay: float = Field(..., description="Lag-1 delay at preceding stop (mins)")
    ml_predicted_delay: float = Field(..., description="Delay predicted by XGBoost regressor (mins)")
    conflict_delay: float = Field(..., description="Waiting delay from NetworkX conflict engine (mins)")
    final_predicted_delay: float = Field(..., description="Total delay: ml_predicted_delay + conflict_delay (mins)")
    predicted_eta: Optional[str] = Field(None, description="Computed final arrival ETA at next stop")
    train_status: TrainStatus = Field(..., description="Current operational status")


class SimulationDeltaSnapshot(BaseModel):
    """Minimal periodic delta telemetry snapshot for bandwidth-efficient streaming."""
    simulation_time: str = Field(..., description="Current virtual simulation clock timestamp")
    is_running: bool = Field(..., description="Whether simulation clock is actively running")
    is_paused: bool = Field(..., description="Whether simulation is paused")
    time_multiplier: float = Field(..., description="Current time multiplier speed")
    active_train_count: int = Field(..., description="Total active trains in simulation")
    trains: List[TrainDeltaState] = Field(default_factory=list, description="Minimal dynamic train states")
    active_conflicts: List[Dict[str, Any]] = Field(default_factory=list, description="Currently detected conflicts")

