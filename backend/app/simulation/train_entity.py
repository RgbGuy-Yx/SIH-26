"""
Train Simulation Entity and Route Movement Tracker.
Phase 3A: Dynamic Route Loading, Smooth Geographic Section Interpolation, and Phase 2 ML Integration.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging

from app.graph.schemas import StationNode, TrackSection, PriorityTier
from app.graph.dataset_loader import get_train_timetable, find_dataset_path
from app.simulation.schemas import TrainStatus, TrainSimulationState
from app.ml.schemas import WeatherInput, StationInferenceInput, PredictionResult
from app.ml.predictor import predict_delay
from app.graph.conflict_engine import ConflictEngine, ConflictResult

logger = logging.getLogger(__name__)


class TrainEntity:
    """
    Represents an active train in the simulation network.
    Dynamically loads its route sequence, schedule, and coordinates from the dataset.
    Interpolates position section-by-section and integrates Phase 2 delay predictions.
    """

    def __init__(
        self,
        train_no: int,
        train_name: str,
        priority_tier: PriorityTier,
        base_date: Optional[datetime] = None,
        csv_path: Optional[str] = None,
    ):
        self.train_no = int(train_no)
        self.train_name = train_name
        self.priority_tier = priority_tier
        self.base_date = base_date or datetime(2026, 8, 28)
        self.csv_path = csv_path

        # 1. Load dynamic timetable from dataset
        self.stops: List[Dict[str, Any]] = get_train_timetable(self.train_no, csv_path=self.csv_path)
        if not self.stops:
            raise ValueError(f"No stops found for train number {train_no} in dataset.")

        # 2. Build full schedule timestamps with base date
        self._parsed_stops = self._initialize_stop_schedule()

        # 3. Dynamic State Variables
        self.current_stop_idx = 0
        self.status = TrainStatus.NOT_STARTED
        
        # Positional
        self.latitude = float(self._parsed_stops[0]["latitude"] or 28.6143)
        self.longitude = float(self._parsed_stops[0]["longitude"] or 77.2187)
        self.route_progress = 0.0

        # Delay breakdown terms (kept strictly separate)
        self.current_accumulated_delay = 0.0  # Lag-1 delay at stop N-1
        self.ml_predicted_delay = 0.0         # Model predicted delay for stop N
        self.conflict_delay = 0.0             # Conflict waiting delay
        self.final_predicted_delay = 0.0      # ml_predicted_delay + conflict_delay
        self.predicted_eta: Optional[datetime] = None
        self.is_fallback = False
        self.fallback_reason: Optional[str] = None

        # Environmental
        self.current_weather: Optional[WeatherInput] = None

        # Initialize first hop prediction
        self._predict_next_hop_delay()

    def _initialize_stop_schedule(self) -> List[Dict[str, Any]]:
        """
        Parses scheduled arrival and departure strings into full datetimes,
        handling elapsed journey day offsets and missing timestamps.
        """
        parsed = []
        base_day = self.base_date.date()
        last_known_time = datetime.combine(base_day, datetime.min.time()) + timedelta(hours=6)

        for i, stop in enumerate(self.stops):
            raw_elapsed = stop.get("elapsed_minutes", 0.0)
            if raw_elapsed is None or (isinstance(raw_elapsed, float) and (raw_elapsed != raw_elapsed)):
                elapsed_mins = 0.0
            else:
                elapsed_mins = float(raw_elapsed)

            day_offset = int(elapsed_mins // 1440) if elapsed_mins >= 0 else 0

            arr_str = stop.get("scheduled_arrival")
            dept_str = stop.get("scheduled_departure")

            sched_arr: Optional[datetime] = None
            sched_dept: Optional[datetime] = None

            if arr_str and arr_str != "None" and ":" in str(arr_str):
                parts = str(arr_str).split(":")
                hh, mm = int(parts[0]), int(parts[1])
                sched_arr = datetime.combine(base_day + timedelta(days=day_offset), datetime.min.time()) + timedelta(
                    hours=hh, minutes=mm
                )

            if dept_str and dept_str != "None" and ":" in str(dept_str):
                parts = str(dept_str).split(":")
                hh, mm = int(parts[0]), int(parts[1])
                sched_dept = datetime.combine(base_day + timedelta(days=day_offset), datetime.min.time()) + timedelta(
                    hours=hh, minutes=mm
                )

            # If both arrival and departure are missing, interpolate from last known stop time
            if sched_arr is None and sched_dept is None:
                if i == 0:
                    sched_dept = last_known_time
                    sched_arr = sched_dept
                else:
                    prev_dist = float(parsed[i - 1]["distance_km"])
                    curr_dist = float(stop.get("distance_km", prev_dist + 30.0) or (prev_dist + 30.0))
                    dist_delta = max(5.0, curr_dist - prev_dist)
                    runtime_mins = max(10.0, (dist_delta / 75.0) * 60.0)
                    sched_arr = parsed[i - 1]["scheduled_departure"] + timedelta(minutes=runtime_mins)
                    sched_dept = sched_arr + timedelta(minutes=2)

            # Alignment if one is missing
            if sched_arr is None and sched_dept is not None:
                sched_arr = sched_dept
            elif sched_dept is None and sched_arr is not None:
                sched_dept = sched_arr

            last_known_time = sched_dept or last_known_time

            lat = stop.get("latitude")
            lon = stop.get("longitude")

            parsed.append({
                "stop_no": stop["stop_no"],
                "station_code": stop["station_code"],
                "station_name": stop["station_name"],
                "latitude": float(lat) if (lat is not None and lat == lat) else 20.5937,
                "longitude": float(lon) if (lon is not None and lon == lon) else 78.9629,
                "distance_km": float(stop.get("distance_km", 0.0) or 0.0),
                "scheduled_arrival": sched_arr,
                "scheduled_departure": sched_dept,
            })

        return parsed

    @property
    def total_stops(self) -> int:
        return len(self._parsed_stops)

    @property
    def origin_stop(self) -> Dict[str, Any]:
        return self._parsed_stops[0]

    @property
    def destination_stop(self) -> Dict[str, Any]:
        return self._parsed_stops[-1]

    @property
    def current_stop(self) -> Dict[str, Any]:
        return self._parsed_stops[self.current_stop_idx]

    @property
    def next_stop(self) -> Optional[Dict[str, Any]]:
        if self.current_stop_idx + 1 < self.total_stops:
            return self._parsed_stops[self.current_stop_idx + 1]
        return None

    @property
    def current_section_id(self) -> Optional[str]:
        if self.next_stop:
            return f"SEC-{self.current_stop['station_code']}-{self.next_stop['station_code']}"
        return None

    def set_weather(self, weather: Optional[WeatherInput]) -> None:
        """Update current atmospheric weather for the active section."""
        self.current_weather = weather
        self._predict_next_hop_delay()

    def _predict_next_hop_delay(self) -> None:
        """
        Invokes the Phase 2 XGBoost predictor for the upcoming station stop.
        Uses lag-1 previous delay (current_accumulated_delay) and current section weather.
        """
        if not self.next_stop:
            return

        sched_dep = self.current_stop["scheduled_departure"] or self.base_date
        hour_of_day = sched_dep.hour

        inference_input = StationInferenceInput(
            hour_of_day=hour_of_day,
            current_accumulated_delay=float(self.current_accumulated_delay),
            priority_tier=self.priority_tier,
            weather=self.current_weather,
            is_origin=(self.current_stop_idx == 0 and self.current_accumulated_delay == 0.0),
        )

        pred_res: PredictionResult = predict_delay(inference_input)
        self.ml_predicted_delay = pred_res.predicted_delay_minutes
        self.is_fallback = pred_res.is_fallback
        self.fallback_reason = pred_res.fallback_reason
        self._recalculate_final_eta()

    def apply_conflict_delay(self, delay_minutes: float, is_holding: bool = False) -> None:
        """Apply waiting time determined by NetworkX conflict resolution engine."""
        self.conflict_delay = max(0.0, float(delay_minutes))
        if is_holding and self.conflict_delay > 0:
            self.status = TrainStatus.HOLDING
        self._recalculate_final_eta()

    def _recalculate_final_eta(self) -> None:
        """Recalculate total final delay and predicted arrival ETA at next stop."""
        self.final_predicted_delay = round(self.ml_predicted_delay + self.conflict_delay, 2)
        if self.next_stop and self.next_stop["scheduled_arrival"]:
            sched_arr = self.next_stop["scheduled_arrival"]
            self.predicted_eta = sched_arr + timedelta(minutes=self.final_predicted_delay)

    def update_position(self, sim_time: datetime) -> None:
        """
        Update train's geographic position, route progress, and status for current virtual time.
        """
        origin_dep = self.origin_stop["scheduled_departure"]

        # Case 1: Simulation time is before initial train departure
        if sim_time < origin_dep:
            self.status = TrainStatus.NOT_STARTED
            self.latitude = float(self.origin_stop["latitude"])
            self.longitude = float(self.origin_stop["longitude"])
            self.route_progress = 0.0
            return

        # Case 2: Train has completed all stops
        if self.current_stop_idx >= self.total_stops - 1:
            self.status = TrainStatus.COMPLETED
            self.latitude = float(self.destination_stop["latitude"])
            self.longitude = float(self.destination_stop["longitude"])
            self.route_progress = 1.0
            return

        # Case 3: In transit across current section (Hop: current_stop -> next_stop)
        c_stop = self.current_stop
        n_stop = self.next_stop

        # Simulated departure from current stop includes previous delay + any conflict holding time
        effective_dep = (c_stop["scheduled_departure"] or sim_time) + timedelta(
            minutes=self.current_accumulated_delay + self.conflict_delay
        )
        # Simulated arrival at next stop includes predicted total delay
        effective_arr = (n_stop["scheduled_arrival"] or sim_time) + timedelta(minutes=self.final_predicted_delay)

        # Ensure valid non-negative time span
        if effective_arr <= effective_dep:
            effective_arr = effective_dep + timedelta(minutes=10.0)

        # 3A: Train is waiting at station before departure
        if sim_time < effective_dep:
            if self.conflict_delay > 0.0:
                self.status = TrainStatus.HOLDING
            else:
                self.status = TrainStatus.AT_STATION
            self.latitude = float(c_stop["latitude"])
            self.longitude = float(c_stop["longitude"])
            self.route_progress = 0.0
            return

        # 3B: Train is moving on track between stations
        if effective_dep <= sim_time < effective_arr:
            total_duration = (effective_arr - effective_dep).total_seconds()
            elapsed = (sim_time - effective_dep).total_seconds()

            progress = max(0.0, min(1.0, elapsed / total_duration))
            self.route_progress = round(progress, 4)

            # Linear geographic interpolation
            lat1, lon1 = float(c_stop["latitude"]), float(c_stop["longitude"])
            lat2, lon2 = float(n_stop["latitude"]), float(n_stop["longitude"])

            self.latitude = round(lat1 + progress * (lat2 - lat1), 6)
            self.longitude = round(lon1 + progress * (lon2 - lon1), 6)

            if self.final_predicted_delay >= 15.0:
                self.status = TrainStatus.DELAYED
            else:
                self.status = TrainStatus.RUNNING
            return

        # 3C: Train has arrived at or passed next_stop -> Transition to next stop
        if sim_time >= effective_arr:
            # Propagate delay: final delay at stop N becomes accumulated delay for next hop N -> N+1
            self.current_accumulated_delay = self.final_predicted_delay
            self.conflict_delay = 0.0
            self.current_stop_idx += 1

            if self.current_stop_idx >= self.total_stops - 1:
                # Reached final destination
                self.status = TrainStatus.COMPLETED
                self.latitude = float(self.destination_stop["latitude"])
                self.longitude = float(self.destination_stop["longitude"])
                self.route_progress = 1.0
            else:
                # Reached intermediate station; predict next hop
                self.status = TrainStatus.AT_STATION
                self.latitude = float(self.current_stop["latitude"])
                self.longitude = float(self.current_stop["longitude"])
                self.route_progress = 0.0
                self._predict_next_hop_delay()

    def get_state(self, sim_time: datetime) -> TrainSimulationState:
        """Assemble current state into a map-ready TrainSimulationState schema."""
        c_code = self.current_stop["station_code"]
        n_code = self.next_stop["station_code"] if self.next_stop else None
        p_code = self._parsed_stops[self.current_stop_idx - 1]["station_code"] if self.current_stop_idx > 0 else None

        sched_arr_str = self.next_stop["scheduled_arrival"].strftime("%Y-%m-%d %H:%M:%S") if (self.next_stop and self.next_stop["scheduled_arrival"]) else None
        sched_dep_str = self.current_stop["scheduled_departure"].strftime("%Y-%m-%d %H:%M:%S") if self.current_stop["scheduled_departure"] else None
        eta_str = self.predicted_eta.strftime("%Y-%m-%d %H:%M:%S") if self.predicted_eta else None

        return TrainSimulationState(
            train_no=self.train_no,
            train_name=self.train_name,
            priority_tier=self.priority_tier,
            current_station=c_code,
            previous_station=p_code,
            next_station=n_code,
            current_section=self.current_section_id,
            route_progress=self.route_progress,
            latitude=self.latitude,
            longitude=self.longitude,
            scheduled_arrival=sched_arr_str,
            scheduled_departure=sched_dep_str,
            simulated_arrival=eta_str,
            current_accumulated_delay=round(self.current_accumulated_delay, 2),
            ml_predicted_delay=round(self.ml_predicted_delay, 2),
            conflict_delay=round(self.conflict_delay, 2),
            final_predicted_delay=round(self.final_predicted_delay, 2),
            predicted_eta=eta_str,
            train_status=self.status,
            simulation_timestamp=sim_time.strftime("%Y-%m-%d %H:%M:%S"),
            is_fallback=self.is_fallback,
            fallback_reason=self.fallback_reason,
        )
