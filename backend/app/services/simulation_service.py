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
        if self.is_running:
            self.engine.tick()
        return self.engine.get_delta_snapshot().model_dump()

    def get_network_topology(self) -> Dict[str, Any]:
        stations_list = []
        station_features = []
        for s_id, s in self.engine.graph.stations.items():
            stn_data = {
                "station_id": s.station_id,
                "name": s.name,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "loop_capacity": s.loop_capacity,
            }
            stations_list.append(stn_data)
            station_features.append({
                "type": "Feature",
                "properties": {
                    "station_id": s.station_id,
                    "name": s.name,
                    "loop_capacity": s.loop_capacity,
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [s.longitude, s.latitude],
                },
            })

        sections_list = []
        track_features = []
        for sec_id, sec in self.engine.graph.sections.items():
            from_stn = self.engine.graph.get_station(sec.station_from)
            to_stn = self.engine.graph.get_station(sec.station_to)
            if from_stn and to_stn:
                coords = [
                    [from_stn.longitude, from_stn.latitude],
                    [to_stn.longitude, to_stn.latitude],
                ]
                sec_data = {
                    "section_id": sec.section_id,
                    "station_from": sec.station_from,
                    "station_to": sec.station_to,
                    "length_km": sec.length_km,
                    "track_type": sec.track_type.value if hasattr(sec.track_type, "value") else str(sec.track_type),
                    "max_speed_kmh": sec.max_speed_kmh,
                    "coordinates": coords,
                }
                sections_list.append(sec_data)
                track_features.append({
                    "type": "Feature",
                    "properties": {
                        "section_id": sec.section_id,
                        "station_from": sec.station_from,
                        "station_to": sec.station_to,
                        "length_km": sec.length_km,
                        "track_type": sec.track_type.value if hasattr(sec.track_type, "value") else str(sec.track_type),
                        "max_speed_kmh": sec.max_speed_kmh,
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords,
                    },
                })

        TRAIN_ROUTE_COLORS = {
            12003: "#00f2fe",  # Electric Cyan (Shatabdi)
            12301: "#f59e0b",  # Amber Gold (Rajdhani)
            22500: "#38bdf8",  # Sky Blue (Vande Bharat)
            22587: "#10b981",  # Emerald Green (Amrit Bharat)
            12113: "#a855f7",  # Purple (Garib Rath)
            22639: "#f43f5e",  # Rose Red (Alleppey)
            11033: "#fb923c",  # Orange (Darbhanga)
            17392: "#84cc16",  # Lime Green (SNNR SBC)
            56903: "#14b8a6",  # Teal (Passenger)
            68716: "#ec4899",  # Pink (MEMU)
        }

        train_route_features = []
        for t_no, train in self.engine.trains.items():
            coords = []
            stop_codes = []
            for s in train.stops:
                lat = s.get("latitude")
                lon = s.get("longitude")
                if lat is not None and lon is not None:
                    try:
                        f_lat, f_lon = float(lat), float(lon)
                        if f_lat != 0.0 and f_lon != 0.0:
                            coords.append([f_lon, f_lat])
                            stop_codes.append(s.get("station_code") or s.get("station_id") or "")
                    except (ValueError, TypeError):
                        pass
            if len(coords) >= 2:
                train_route_features.append({
                    "type": "Feature",
                    "properties": {
                        "train_no": t_no,
                        "train_name": train.train_name,
                        "priority_tier": train.priority_tier.value if hasattr(train.priority_tier, "value") else int(train.priority_tier),
                        "color": TRAIN_ROUTE_COLORS.get(t_no, "#38bdf8"),
                        "origin": stop_codes[0] if stop_codes else "",
                        "destination": stop_codes[-1] if stop_codes else "",
                        "stops": stop_codes,
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords,
                    },
                })

        return {
            "stations": stations_list,
            "sections": sections_list,
            "geojson": {
                "stations": {
                    "type": "FeatureCollection",
                    "features": station_features,
                },
                "tracks": {
                    "type": "FeatureCollection",
                    "features": track_features,
                },
                "train_routes": {
                    "type": "FeatureCollection",
                    "features": train_route_features,
                },
            },
        }

    def get_train_list(self) -> List[Dict[str, Any]]:
        snapshot = self.engine.get_snapshot()
        conflict_train_ids = {c.get("train_no") for c in snapshot.active_conflicts}
        trains_result = []
        for t in snapshot.trains:
            train_entity = self.engine.trains.get(t.train_no)
            route_coords = []
            route_stops = []
            if train_entity:
                for s in train_entity.stops:
                    lat, lon = s.get("latitude"), s.get("longitude")
                    if lat is not None and lon is not None:
                        try:
                            route_coords.append([float(lon), float(lat)])
                            route_stops.append(s.get("station_code") or s.get("station_id") or "")
                        except (ValueError, TypeError):
                            pass
            trains_result.append({
                "train_no": t.train_no,
                "train_name": t.train_name,
                "priority_tier": t.priority_tier,
                "train_status": t.train_status,
                "current_station": t.current_station,
                "next_station": t.next_station,
                "route_progress": t.route_progress,
                "scheduled_arrival": t.scheduled_arrival,
                "predicted_eta": t.predicted_eta,
                "current_accumulated_delay": t.current_accumulated_delay,
                "final_predicted_delay": t.final_predicted_delay,
                "ml_delay_prediction": t.ml_predicted_delay,
                "conflict_delay": t.conflict_delay,
                "has_active_conflict": t.train_no in conflict_train_ids or t.conflict_delay > 0.0 or t.has_active_conflict,
                "upcoming_stops": t.upcoming_stops,
                "position": {"latitude": t.latitude, "longitude": t.longitude},
                "origin_station": t.origin_station or (route_stops[0] if route_stops else ""),
                "destination_station": t.destination_station or (route_stops[-1] if route_stops else ""),
                "route_stations": route_stops,
                "route_coordinates": route_coords,
            })
        return trains_result

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
