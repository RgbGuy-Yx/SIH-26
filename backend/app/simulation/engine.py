"""
Deterministic Multi-Train Railway Simulation Engine.
Phase 3A: Orchestrates Dynamic Route Replay, Virtual Clock, Movement Interpolation,
NetworkX Conflict Detection, Priority Precedence, and Final ETA Updates.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging

from app.graph.schemas import TrackType, TrackSection, StationNode, SectionOccupancy
from app.graph.railway_graph import RailwayGraph
from app.graph.conflict_engine import ConflictEngine, ConflictResult
from app.graph.dataset_loader import get_available_trains, load_national_railway_graph
from app.simulation.schemas import (
    TrainStatus,
    TrainSimulationState,
    TrainDeltaState,
    SimulationConfig,
    SimulationSnapshot,
    SimulationDeltaSnapshot,
)
from app.simulation.clock import VirtualClock
from app.simulation.train_entity import TrainEntity
from app.ml.schemas import PriorityTier, WeatherInput

logger = logging.getLogger(__name__)


class SimulationEngine:
    """
    Deterministic Railway Network Simulation Engine.
    Manages multi-train state trajectories, continuous geographic interpolation,
    live NetworkX conflict arbitration, and Phase 2 ML delay updates.
    """

    def __init__(
        self,
        config: Optional[SimulationConfig] = None,
        railway_graph: Optional[RailwayGraph] = None,
        conflict_engine: Optional[ConflictEngine] = None,
        csv_path: Optional[str] = None,
    ):
        self.config = config or SimulationConfig()
        self.csv_path = csv_path
        self.graph = railway_graph or load_national_railway_graph(csv_path=self.csv_path)
        self.conflict_engine = conflict_engine or ConflictEngine()
        
        # Virtual clock initialization
        start_t = self.config.start_time or datetime(2026, 8, 28, 6, 0, 0)
        self.clock = VirtualClock(initial_time=start_t, time_multiplier=self.config.time_multiplier)

        # Active Train Entities
        self.trains: Dict[int, TrainEntity] = {}
        self.active_conflicts: List[Dict[str, Any]] = []

        # Load selected or default trains from dataset
        self.load_trains(self.config.selected_train_ids)

    def load_trains(self, train_numbers: Optional[List[int]] = None) -> None:
        """
        Dynamically construct TrainEntity objects from dataset.
        If train_numbers is None, loads all available trains in the dataset.
        """
        self.trains.clear()
        available = get_available_trains(csv_path=self.csv_path)
        avail_map = {t["train_no"]: t for t in available}

        target_nos = train_numbers if train_numbers is not None else list(avail_map.keys())

        for t_no in target_nos:
            if t_no in avail_map:
                meta = avail_map[t_no]
                entity = TrainEntity(
                    train_no=t_no,
                    train_name=meta["train_name"],
                    priority_tier=PriorityTier(meta["priority_tier"]),
                    base_date=self.clock.current_time,
                    csv_path=self.csv_path,
                )
                self.trains[t_no] = entity

    def start(self) -> None:
        """Start the simulation clock."""
        self.clock.start()

    def pause(self) -> None:
        """Pause the simulation clock."""
        self.clock.pause()

    def resume(self) -> None:
        """Resume the simulation clock."""
        self.clock.resume()

    def set_speed(self, multiplier: float) -> None:
        """Adjust simulation time scaling factor."""
        self.clock.set_speed(multiplier)

    def reset(self, initial_time: Optional[datetime] = None) -> None:
        """
        Deterministically reset clock, positions, delays, conflicts, and train states.
        """
        start_t = initial_time or self.config.start_time or datetime(2026, 8, 28, 6, 0, 0)
        self.clock.reset(initial_time=start_t)
        self.conflict_engine.clear()
        self.active_conflicts.clear()
        self.load_trains(self.config.selected_train_ids)

    def set_train_weather(self, train_no: int, weather: Optional[WeatherInput]) -> None:
        """Inject atmospheric weather into an active train's ML predictor."""
        if train_no in self.trains:
            self.trains[train_no].set_weather(weather)

    def tick(self, delta_seconds: Optional[float] = None) -> SimulationSnapshot:
        """
        Execute one deterministic simulation step:
        1. Advance Virtual Clock.
        2. Update train positions and timetable progress.
        3. Check NetworkX graph conflicts across active block sections.
        4. Resolve priority precedence and apply waiting delays.
        5. Return a complete snapshot.
        """
        sim_time = self.clock.tick(delta_real_seconds=delta_seconds)

        # 1. Update movement for each train
        for train in self.trains.values():
            train.update_position(sim_time)

        # 2. Check and arbitrate track section conflicts
        self._evaluate_network_conflicts(sim_time)

        return self.get_snapshot()

    def _evaluate_network_conflicts(self, sim_time: datetime) -> None:
        """
        Gathers active section occupancies and checks for resource contention in NetworkX graph.
        Applies priority resolution if trains contend for single-line sections or headway limits.
        """
        self.conflict_engine.clear()
        self.active_conflicts.clear()

        # Gather trains currently on track or waiting at stations
        active_trains = [
            t for t in self.trains.values()
            if t.status in (TrainStatus.RUNNING, TrainStatus.DELAYED, TrainStatus.AT_STATION, TrainStatus.HOLDING)
            and t.next_stop is not None
        ]

        # Register occupancies and detect conflicts
        for train in active_trains:
            s_from = train.current_stop["station_code"]
            s_to = train.next_stop["station_code"]
            section = self.graph.get_section(s_from, s_to)

            if not section:
                continue

            entry_t = (train.current_stop["scheduled_departure"] or sim_time) + timedelta(
                minutes=train.current_accumulated_delay
            )
            exit_t = (train.next_stop["scheduled_arrival"] or sim_time) + timedelta(
                minutes=train.final_predicted_delay
            )

            # Check conflict against already registered occupancies
            conflict_res: ConflictResult = self.conflict_engine.check_and_resolve_conflict(
                candidate_train_id=str(train.train_no),
                candidate_train_name=train.train_name,
                candidate_priority=train.priority_tier,
                section=section,
                station_from=s_from,
                station_to=s_to,
                entry_time=entry_t,
                exit_time=exit_t,
            )

            if conflict_res.has_conflict:
                # Record conflict diagnostic
                self.active_conflicts.append({
                    "train_no": train.train_no,
                    "section_id": section.section_id,
                    "conflicting_train_id": conflict_res.conflicting_train_id,
                    "precedence_granted_to": conflict_res.precedence_granted_to,
                    "conflict_delay_minutes": conflict_res.conflict_delay_minutes,
                    "resolution_reason": conflict_res.resolution_reason,
                })

                # Apply waiting delay if candidate yielded precedence
                if conflict_res.conflict_delay_minutes > 0.0:
                    train.apply_conflict_delay(conflict_res.conflict_delay_minutes, is_holding=True)
                else:
                    train.apply_conflict_delay(0.0, is_holding=False)
            else:
                train.apply_conflict_delay(0.0, is_holding=False)

            # Register this train's occupancy in the conflict engine
            self.conflict_engine.register_occupancy(
                SectionOccupancy(
                    train_id=str(train.train_no),
                    section_id=section.section_id,
                    station_from=s_from,
                    station_to=s_to,
                    entry_time=entry_t + timedelta(minutes=train.conflict_delay),
                    exit_time=exit_t + timedelta(minutes=train.conflict_delay),
                    priority_tier=train.priority_tier,
                )
            )

    def get_snapshot(self) -> SimulationSnapshot:
        """Produce full immutable snapshot of current network state."""
        sim_time = self.clock.current_time
        train_states = [t.get_state(sim_time) for t in self.trains.values()]

        return SimulationSnapshot(
            simulation_time=self.clock.get_iso_timestamp(),
            is_running=self.clock.is_running,
            is_paused=self.clock.is_paused,
            time_multiplier=self.clock.time_multiplier,
            active_train_count=len([t for t in train_states if t.train_status not in (TrainStatus.NOT_STARTED, TrainStatus.COMPLETED)]),
            trains=train_states,
            active_conflicts=list(self.active_conflicts),
        )

    def get_delta_snapshot(self) -> SimulationDeltaSnapshot:
        """Produce lightweight delta snapshot containing only mutating telemetry for WebSocket streaming."""
        sim_time = self.clock.current_time
        delta_trains: List[TrainDeltaState] = []

        for t in self.trains.values():
            s = t.get_state(sim_time)
            delta_trains.append(
                TrainDeltaState(
                    train_no=s.train_no,
                    latitude=s.latitude,
                    longitude=s.longitude,
                    route_progress=s.route_progress,
                    current_station=s.current_station,
                    next_station=s.next_station,
                    current_accumulated_delay=s.current_accumulated_delay,
                    ml_predicted_delay=s.ml_predicted_delay,
                    conflict_delay=s.conflict_delay,
                    final_predicted_delay=s.final_predicted_delay,
                    predicted_eta=s.predicted_eta,
                    train_status=s.train_status,
                )
            )

        return SimulationDeltaSnapshot(
            simulation_time=self.clock.get_iso_timestamp(),
            is_running=self.clock.is_running,
            is_paused=self.clock.is_paused,
            time_multiplier=self.clock.time_multiplier,
            active_train_count=len([t for t in delta_trains if t.train_status not in (TrainStatus.NOT_STARTED, TrainStatus.COMPLETED)]),
            trains=delta_trains,
            active_conflicts=list(self.active_conflicts),
        )

    def get_map_state(self) -> List[Dict[str, Any]]:
        """
        Direct JSON-serializable list of train state objects for map UI consumption.
        """
        snapshot = self.get_snapshot()
        return [t.model_dump() for t in snapshot.trains]

