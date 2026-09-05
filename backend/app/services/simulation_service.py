import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional, List

from app.simulation.engine import SimulationEngine
from app.simulation.schemas import SimulationConfig, SimulationSnapshot
from app.integrations.live_provider import get_live_provider, LiveTrainProvider

logger = logging.getLogger(__name__)


class SimulationService:
    """
    Singleton service managing the lifecycle of the in-process SimulationEngine,
    handling REST API queries, WebSocket snapshots, and live train data feeds.
    """

    def __init__(self, csv_path: Optional[str] = None) -> None:
        self.csv_path = csv_path or os.environ.get(
            "DATASET_PATH",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "final_training_features.csv")
        )
        self.engine: SimulationEngine = SimulationEngine(csv_path=self.csv_path)
        self.live_provider: LiveTrainProvider = get_live_provider()

    @property
    def is_running(self) -> bool:
        return self.engine.clock.is_running and not self.engine.clock.is_paused

    def start(self) -> Dict[str, Any]:
        self.engine.start()
        return {
            "status": "started",
            "simulation_time": self.engine.clock.get_iso_timestamp(),
            "time_multiplier": self.engine.clock.time_multiplier,
            "is_running": self.engine.clock.is_running,
            "is_paused": self.engine.clock.is_paused,
        }

    def pause(self) -> Dict[str, Any]:
        self.engine.pause()
        return {
            "status": "paused",
            "simulation_time": self.engine.clock.get_iso_timestamp(),
            "is_running": self.engine.clock.is_running,
            "is_paused": self.engine.clock.is_paused,
        }

    def resume(self) -> Dict[str, Any]:
        self.engine.resume()
        return {
            "status": "resumed",
            "simulation_time": self.engine.clock.get_iso_timestamp(),
            "is_running": self.engine.clock.is_running,
            "is_paused": self.engine.clock.is_paused,
        }

    def reset(self, initial_time: Optional[datetime] = None) -> Dict[str, Any]:
        self.engine.reset(initial_time=initial_time)
        return {
            "status": "reset",
            "simulation_time": self.engine.clock.get_iso_timestamp(),
            "is_running": self.engine.clock.is_running,
            "is_paused": self.engine.clock.is_paused,
        }

    def set_speed(self, multiplier: float) -> Dict[str, Any]:
        self.engine.set_speed(multiplier)
        return {
            "status": "speed_updated",
            "time_multiplier": self.engine.clock.time_multiplier,
        }

    def step(self, delta_seconds: Optional[float] = None) -> Dict[str, Any]:
        snapshot = self.engine.tick(delta_seconds=delta_seconds)
        return snapshot.model_dump()

    def get_full_state_snapshot(self) -> Dict[str, Any]:
        return self.engine.get_snapshot().model_dump()

    def get_delta_state_snapshot(self) -> Dict[str, Any]:
        return self.engine.get_delta_snapshot().model_dump()

    def get_train_list(self) -> List[Dict[str, Any]]:
        snapshot = self.engine.get_snapshot()
        conflict_train_ids = {c.get("train_no") for c in snapshot.active_conflicts}
        return [
            {
                "train_no": t.train_no,
                "train_name": t.train_name,
                "priority_tier": t.priority_tier,
                "train_status": t.train_status,
                "current_station": t.current_station,
                "next_station": t.next_station,
                "route_progress": t.route_progress,
                "current_accumulated_delay": t.current_accumulated_delay,
                "final_predicted_delay": t.final_predicted_delay,
                "ml_delay_prediction": t.ml_predicted_delay,
                "conflict_delay": t.conflict_delay,
                "has_active_conflict": t.train_no in conflict_train_ids or t.conflict_delay > 0.0,
                "position": {"latitude": t.latitude, "longitude": t.longitude},
            }
            for t in snapshot.trains
        ]

    def get_train_state(self, train_no: int) -> Optional[Dict[str, Any]]:
        train = self.engine.trains.get(train_no)
        if not train:
            return None
        sim_time = self.engine.clock.current_time
        return train.get_state(sim_time).model_dump()

    def get_train_eta(self, train_no: int) -> Optional[Dict[str, Any]]:
        train = self.engine.trains.get(train_no)
        if not train:
            return None
        sim_time = self.engine.clock.current_time
        state = train.get_state(sim_time)
        return {
            "train_no": state.train_no,
            "train_name": state.train_name,
            "current_station": state.current_station,
            "next_station": state.next_station,
            "scheduled_arrival_next": state.scheduled_arrival,
            "estimated_arrival_next": state.predicted_eta,
            "scheduled_departure_next": state.scheduled_departure,
            "estimated_departure_next": state.simulated_arrival,
            "current_accumulated_delay": state.current_accumulated_delay,
            "ml_delay_prediction": state.ml_predicted_delay,
            "conflict_delay": state.conflict_delay,
            "final_predicted_delay": state.final_predicted_delay,
            "route_progress": state.route_progress,
        }

    def get_train_conflicts(self, train_no: int) -> List[Dict[str, Any]]:
        return [c for c in self.engine.active_conflicts if c.get("train_no") == train_no]

    async def get_train_live_status(self, train_no: int) -> Dict[str, Any]:
        """Fetch live status via configured provider, decoupled from simulation."""
        provider = get_live_provider()
        live_data = await provider.get_live_status(train_no)
        sim_state = self.get_train_state(train_no)

        return {
            "train_no": train_no,
            "live_status": live_data.model_dump() if hasattr(live_data, "model_dump") else live_data,
            "simulation_state": sim_state,
        }


simulation_service = SimulationService()
