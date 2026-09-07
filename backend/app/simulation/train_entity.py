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

        # Simulation Demonstration: Align all 10 train services so all trains are actively running concurrently
        shift_map = {
            22500: timedelta(hours=10),               # 06:20 -> 16:20
            56903: timedelta(hours=15, minutes=30),   # 00:40 -> 16:10
            12301: timedelta(minutes=-30),            # 16:50 -> 16:20
            12113: timedelta(hours=-1, minutes=-30),  # 17:35 -> 16:05
            68716: timedelta(hours=-2, minutes=-30),  # 18:40 -> 16:10
            22587: timedelta(hours=-3, minutes=-30),  # 19:30 -> 16:00
            22639: timedelta(hours=-5),               # 20:55 -> 15:55
        }
        train_shift = shift_map.get(self.train_no, timedelta(0))

        for i, stop in enumerate(self.stops):
            raw_elapsed = stop.get("elapsed_minutes", 0.0)
            if raw_elapsed is None or (isinstance(raw_elapsed, float) and (raw_elapsed != raw_elapsed)):
                elapsed_mins = 0.0
            else:
                elapsed_mins = float(raw_elapsed)

            arr_day = stop.get("arrival_day")
            dep_day = stop.get("departure_day")
            arr_day_offset = max(0, int(float(arr_day) - 1)) if (arr_day is not None and arr_day == arr_day) else int(elapsed_mins // 1440)
            dep_day_offset = max(0, int(float(dep_day) - 1)) if (dep_day is not None and dep_day == dep_day) else int(elapsed_mins // 1440)

            arr_str = stop.get("scheduled_arrival")
            dept_str = stop.get("scheduled_departure")

            sched_arr: Optional[datetime] = None
            sched_dept: Optional[datetime] = None

            if arr_str and arr_str != "None" and ":" in str(arr_str):
                parts = str(arr_str).split(":")
                hh, mm = int(parts[0]), int(parts[1])
                sched_arr = datetime.combine(base_day + timedelta(days=arr_day_offset), datetime.min.time()) + timedelta(
                    hours=hh, minutes=mm
                ) + train_shift

            if dept_str and dept_str != "None" and ":" in str(dept_str):
                parts = str(dept_str).split(":")
                hh, mm = int(parts[0]), int(parts[1])
                sched_dept = datetime.combine(base_day + timedelta(days=dep_day_offset), datetime.min.time()) + timedelta(
                    hours=hh, minutes=mm
                ) + train_shift

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

        # Determine active weather: explicit dynamic weather override, or stop's dataset meteorological record
        active_weather = self.current_weather
        if active_weather is None and self.current_stop.get("weather"):
            try:
                active_weather = WeatherInput(**self.current_stop["weather"])
            except Exception:
                active_weather = None

        inference_input = StationInferenceInput(
            hour_of_day=hour_of_day,
            current_accumulated_delay=float(self.current_accumulated_delay),
            priority_tier=self.priority_tier,
            weather=active_weather,
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

        # Case 2: Multi-stop catch-up loop (advances through any stations already passed)
        while self.current_stop_idx < self.total_stops - 1:
            c_stop = self.current_stop
            n_stop = self.next_stop
            if not n_stop:
                break

            effective_dep = (c_stop["scheduled_departure"] or sim_time) + timedelta(
                minutes=self.current_accumulated_delay + self.conflict_delay
            )
            effective_arr = (n_stop["scheduled_arrival"] or sim_time) + timedelta(
                minutes=self.final_predicted_delay
            )
            if effective_arr <= effective_dep:
                effective_arr = effective_dep + timedelta(minutes=10.0)

            # If simulation time has reached or passed next station, advance stop index
            if sim_time >= effective_arr:
                self.current_accumulated_delay = self.final_predicted_delay
                self.conflict_delay = 0.0
                self.current_stop_idx += 1
                if self.current_stop_idx >= self.total_stops - 1:
                    break
                self._predict_next_hop_delay()
            else:
                # Found the active section
                break

        # Case 3: Train has completed all stops
        if self.current_stop_idx >= self.total_stops - 1:
            dest_arr = self.destination_stop["scheduled_arrival"] or self.destination_stop["scheduled_departure"] or sim_time
            # Auto-loop in simulation mode: if 15 mins passed since arrival, cycle back for continuous demonstration
            if sim_time >= (dest_arr + timedelta(minutes=15)):
                self.current_stop_idx = 0
                self.current_accumulated_delay = 0.0
                self.conflict_delay = 0.0
                # Shift base date to keep train running in cycle
                self.base_date = sim_time
                self._parsed_stops = self._initialize_stop_schedule()
                self._predict_next_hop_delay()
                self.status = TrainStatus.AT_STATION
                self.latitude = float(self.origin_stop["latitude"])
                self.longitude = float(self.origin_stop["longitude"])
                self.route_progress = 0.0
                return

            self.status = TrainStatus.COMPLETED
            self.latitude = float(self.destination_stop["latitude"])
            self.longitude = float(self.destination_stop["longitude"])
            self.route_progress = 1.0
            return

        # Case 4: Active section (current_stop -> next_stop)
        c_stop = self.current_stop
        n_stop = self.next_stop

        effective_dep = (c_stop["scheduled_departure"] or sim_time) + timedelta(
            minutes=self.current_accumulated_delay + self.conflict_delay
        )
        effective_arr = (n_stop["scheduled_arrival"] or sim_time) + timedelta(
            minutes=self.final_predicted_delay
        )
        if effective_arr <= effective_dep:
            effective_arr = effective_dep + timedelta(minutes=10.0)

        # 4A: Waiting at station before departure
        if sim_time < effective_dep:
            if self.conflict_delay > 0.0:
                self.status = TrainStatus.HOLDING
            else:
                self.status = TrainStatus.AT_STATION
            self.latitude = float(c_stop["latitude"])
            self.longitude = float(c_stop["longitude"])
            self.route_progress = 0.0
            return

        # 4B: Moving between stations on track section
        if effective_dep <= sim_time < effective_arr:
            total_duration = max(1.0, (effective_arr - effective_dep).total_seconds())
            elapsed = (sim_time - effective_dep).total_seconds()

            progress = max(0.0, min(1.0, elapsed / total_duration))
            self.route_progress = round(progress, 4)

            # Linear geographic interpolation between station coordinates
            lat1, lon1 = float(c_stop["latitude"]), float(c_stop["longitude"])
            lat2, lon2 = float(n_stop["latitude"]), float(n_stop["longitude"])

            self.latitude = round(lat1 + progress * (lat2 - lat1), 6)
            self.longitude = round(lon1 + progress * (lon2 - lon1), 6)

            if self.final_predicted_delay >= 15.0:
                self.status = TrainStatus.DELAYED
            else:
                self.status = TrainStatus.RUNNING
            return

    def get_state(self, sim_time: datetime) -> TrainSimulationState:
        """Assemble current state into a map-ready TrainSimulationState schema."""
        c_code = self.current_stop["station_code"]
        n_code = self.next_stop["station_code"] if self.next_stop else None
        p_code = self._parsed_stops[self.current_stop_idx - 1]["station_code"] if self.current_stop_idx > 0 else None

        sched_arr_str = self.next_stop["scheduled_arrival"].strftime("%Y-%m-%d %H:%M:%S") if (self.next_stop and self.next_stop["scheduled_arrival"]) else None
        sched_dep_str = self.current_stop["scheduled_departure"].strftime("%Y-%m-%d %H:%M:%S") if self.current_stop["scheduled_departure"] else None
        eta_str = self.predicted_eta.strftime("%Y-%m-%d %H:%M:%S") if self.predicted_eta else None

        # Assemble next 2-3 upcoming stations along route with predicted ETAs
        upcoming = []
        if self.status not in (TrainStatus.COMPLETED, TrainStatus.ARRIVED) and (self.current_stop_idx + 1) < len(self._parsed_stops):
            start_idx = self.current_stop_idx + 1
            for idx in range(start_idx, min(len(self._parsed_stops), start_idx + 3)):
                s_data = self._parsed_stops[idx]
                s_arr = s_data.get("scheduled_arrival") or s_data.get("scheduled_departure")
                s_arr_str = s_arr.strftime("%Y-%m-%d %H:%M:%S") if s_arr else None
                s_pred = (s_arr + timedelta(minutes=self.final_predicted_delay)) if s_arr else None
                s_pred_str = s_pred.strftime("%Y-%m-%d %H:%M:%S") if s_pred else None
                upcoming.append({
                    "stop_no": s_data.get("stop_no", idx + 1),
                    "station_code": s_data["station_code"],
                    "station_name": s_data.get("station_name", s_data["station_code"]),
                    "scheduled_arrival": s_arr_str,
                    "predicted_eta": s_pred_str,
                    "distance_km": round(float(s_data.get("distance_km", 0.0) or 0.0), 1),
                })

        # Assemble full sequence of all stations along route with scheduled and estimated ETA
        all_stops = []
        for idx, s_data in enumerate(self._parsed_stops):
            s_arr = s_data.get("scheduled_arrival")
            s_dep = s_data.get("scheduled_departure")
            s_arr_str = s_arr.strftime("%Y-%m-%d %H:%M:%S") if s_arr else None
            s_dep_str = s_dep.strftime("%Y-%m-%d %H:%M:%S") if s_dep else None

            if idx < self.current_stop_idx:
                stop_status = "DEPARTED"
                pred_arr_str = s_arr_str
                pred_dep_str = s_dep_str
            elif idx == self.current_stop_idx:
                stop_status = "AT_STATION" if self.status == TrainStatus.AT_STATION else "DEPARTED"
                pred_arr_str = s_arr_str
                pred_dep = (s_dep + timedelta(minutes=self.final_predicted_delay)) if s_dep else None
                pred_dep_str = pred_dep.strftime("%Y-%m-%d %H:%M:%S") if pred_dep else None
            elif idx == self.current_stop_idx + 1:
                stop_status = "NEXT_STOP"
                pred_arr = (s_arr + timedelta(minutes=self.final_predicted_delay)) if s_arr else None
                pred_arr_str = pred_arr.strftime("%Y-%m-%d %H:%M:%S") if pred_arr else None
                pred_dep = (s_dep + timedelta(minutes=self.final_predicted_delay)) if s_dep else None
                pred_dep_str = pred_dep.strftime("%Y-%m-%d %H:%M:%S") if pred_dep else None
            else:
                stop_status = "UPCOMING"
                pred_arr = (s_arr + timedelta(minutes=self.final_predicted_delay)) if s_arr else None
                pred_arr_str = pred_arr.strftime("%Y-%m-%d %H:%M:%S") if pred_arr else None
                pred_dep = (s_dep + timedelta(minutes=self.final_predicted_delay)) if s_dep else None
                pred_dep_str = pred_dep.strftime("%Y-%m-%d %H:%M:%S") if pred_dep else None

            all_stops.append({
                "stop_no": s_data.get("stop_no", idx + 1),
                "station_code": s_data["station_code"],
                "station_name": s_data.get("station_name", s_data["station_code"]),
                "scheduled_arrival": s_arr_str,
                "scheduled_departure": s_dep_str,
                "predicted_eta": pred_arr_str or s_dep_str,
                "predicted_departure": pred_dep_str,
                "distance_km": round(float(s_data.get("distance_km", 0.0) or 0.0), 1),
                "platform": s_data.get("platform", f"PF {(idx % 4) + 1}"),
                "status": stop_status,
                "delay_minutes": int(round(self.final_predicted_delay)) if idx >= self.current_stop_idx else 0,
            })

        # Compute dynamic operational speed in km/h based on status and priority tier
        if self.status in (TrainStatus.COMPLETED, TrainStatus.ARRIVED, TrainStatus.AT_STATION, TrainStatus.NOT_STARTED, TrainStatus.HOLDING):
            speed_kmh = 0.0
        else:
            tier_val = int(self.priority_tier) if self.priority_tier else 3
            base_tier_speed = {
                1: 130.0,
                2: 110.0,
                3: 80.0,
                4: 65.0,
            }.get(tier_val, 80.0)
            # Adjust slightly if under severe delay or caution
            speed_kmh = base_tier_speed if self.final_predicted_delay < 15.0 else max(45.0, base_tier_speed - 20.0)

        # Dynamic AI operational reasoning generated by simulation backend
        if self.status in (TrainStatus.COMPLETED, TrainStatus.ARRIVED):
            ai_reasoning = f"Train has reached its final scheduled destination station ({self.destination_stop['station_code']}). Platform clearance and turnaround in progress."
        elif self.status == TrainStatus.HOLDING or self.conflict_delay > 0:
            ai_reasoning = f"NetworkX conflict engine detected section contention. Train yielded precedence and is held on loop line (+{int(round(self.conflict_delay))}m hold)."
        elif self.status == TrainStatus.AT_STATION:
            ai_reasoning = f"Scheduled operational platform halt at {self.current_stop['station_code']}. Passenger boarding and departure on signal clearance."
        elif self.status == TrainStatus.NOT_STARTED:
            ai_reasoning = f"Awaiting scheduled initial departure from origin {self.origin_stop['station_code']}."
        elif self.final_predicted_delay >= 15.0:
            ai_reasoning = f"Carrying {int(round(self.current_accumulated_delay))}m accumulated delay plus {int(round(self.ml_predicted_delay))}m ML predicted delay. Dynamic speed pacing active."
        elif self.final_predicted_delay > 0:
            ai_reasoning = f"Minor pacing variance (+{int(round(self.final_predicted_delay))}m). AI models project time recovery on open line before reaching {n_code or 'destination'}."
        else:
            ai_reasoning = f"Operating on schedule with clear line signals and nominal cruise velocity ({int(round(speed_kmh))} km/h)."

        return TrainSimulationState(
            train_no=self.train_no,
            train_name=self.train_name,
            priority_tier=self.priority_tier,
            current_station=c_code,
            previous_station=p_code,
            next_station=n_code,
            origin_station=self.origin_stop["station_code"],
            destination_station=self.destination_stop["station_code"],
            current_section=self.current_section_id,
            route_progress=self.route_progress,
            latitude=self.latitude,
            longitude=self.longitude,
            upcoming_stops=upcoming,
            all_stops=all_stops,
            scheduled_arrival=sched_arr_str,
            scheduled_departure=sched_dep_str,
            simulated_arrival=eta_str,
            current_accumulated_delay=round(self.current_accumulated_delay, 2),
            ml_predicted_delay=round(self.ml_predicted_delay, 2),
            conflict_delay=round(self.conflict_delay, 2),
            final_predicted_delay=round(self.final_predicted_delay, 2),
            predicted_eta=eta_str,
            has_active_conflict=self.conflict_delay > 0.0 or self.status == TrainStatus.HOLDING,
            speed_kmh=round(speed_kmh, 1),
            ai_reasoning=ai_reasoning,
            train_status=self.status,
            simulation_timestamp=sim_time.strftime("%Y-%m-%d %H:%M:%S"),
            is_fallback=self.is_fallback,
            fallback_reason=self.fallback_reason,
        )
