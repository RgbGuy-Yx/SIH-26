"""
Graph & Conflict Resolution Module.
Phase 2C: NetworkX Railway Topology and Conflict Resolution Engine.
"""

from app.graph.schemas import (
    TrackType,
    StationNode,
    TrackSection,
    TimeWindow,
    SectionOccupancy,
    ConflictResult,
    PipelineStepResult,
)
from app.graph.railway_graph import RailwayGraph
from app.graph.conflict_engine import ConflictEngine
from app.graph.dataset_loader import (
    load_national_railway_graph,
    get_available_trains,
    get_train_timetable,
)

__all__ = [
    "TrackType",
    "StationNode",
    "TrackSection",
    "TimeWindow",
    "SectionOccupancy",
    "ConflictResult",
    "PipelineStepResult",
    "RailwayGraph",
    "ConflictEngine",
    "load_national_railway_graph",
    "get_available_trains",
    "get_train_timetable",
]
