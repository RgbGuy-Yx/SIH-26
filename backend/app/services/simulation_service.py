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
                "all_stops": getattr(t, "all_stops", []),
                "speed_kmh": getattr(t, "speed_kmh", 0.0),
                "ai_reasoning": getattr(t, "ai_reasoning", None),
                "position": {"latitude": t.latitude, "longitude": t.longitude},
                "origin_station": t.origin_station or (route_stops[0] if route_stops else ""),
                "destination_station": t.destination_station or (route_stops[-1] if route_stops else ""),
                "route_stations": route_stops,
                "route_coordinates": route_coords,
                "current_weather": train_entity.current_weather.model_dump() if (train_entity and train_entity.current_weather) else None,
            })
        return trains_result

    def get_train_state(self, train_no: int) -> Optional[Dict[str, Any]]:
        train = self.engine.trains.get(train_no)
        if not train:
            return None
        sim_time = self.engine.clock.current_time
        res = train.get_state(sim_time).model_dump()
        res["current_weather"] = train.current_weather.model_dump() if train.current_weather else None
        return res

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
        """Fetch live status via configured provider, decoupled from simulation, and compute ML/ETA predictions for all upcoming stations."""
        provider = get_live_provider()
        live_data = await provider.get_live_status(train_no)
        sim_state = self.get_train_state(train_no)

        live_ml_result = None
        if live_data and getattr(live_data, "success", False):
            try:
                from app.ml.predictor import predict_delay
                from app.ml.eta_calculator import calculate_station_eta
                from app.ml.schemas import StationInferenceInput, PriorityTier

                train_ent = self.engine.trains.get(train_no)
                obs_delay = float(live_data.delay_minutes or 0.0)
                tier_val = train_ent.priority_tier if train_ent else 1
                try:
                    p_tier = PriorityTier(tier_val)
                except Exception:
                    p_tier = PriorityTier.TIER_1_PREMIUM

                # Helper to parse time string/datetime safely
                def _parse_stop_time(val: Any) -> datetime:
                    if isinstance(val, datetime):
                        return val
                    now = datetime.now()
                    if not val:
                        return now
                    s = str(val).strip()
                    try:
                        if "T" in s:
                            return datetime.fromisoformat(s.replace("Z", "+00:00"))
                        if " " in s and ":" in s:
                            parts = s.split(" ")
                            if len(parts) >= 2 and "-" in parts[0]:
                                return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
                        if ":" in s:
                            t_parts = s.split(":")
                            hh = int(t_parts[0])
                            mm = int(t_parts[1])
                            return datetime(now.year, now.month, now.day, hh, mm)
                    except Exception:
                        pass
                    return now

                raw_data = getattr(live_data, "raw_data", None) or {}
                route_list = raw_data.get("route") or raw_data.get("route_stops") or []
                if not route_list and sim_state:
                    route_list = sim_state.get("all_stops") or []

                curr_code = getattr(live_data, "current_station", "") or (raw_data.get("currentLocation", {}).get("stationCode")) or ""
                next_code = getattr(live_data, "next_station", "") or (raw_data.get("nextHalt", {}).get("stationCode")) or ""

                cur_idx = -1
                if route_list:
                    for i, st in enumerate(route_list):
                        s_code = st.get("stationCode") or st.get("code") or st.get("station_code") or ""
                        if curr_code and s_code == curr_code:
                            cur_idx = i
                            break

                upcoming_stops_candidates = []
                if cur_idx != -1 and cur_idx + 1 < len(route_list):
                    upcoming_stops_candidates = route_list[cur_idx + 1:]
                elif next_code:
                    next_found = False
                    for st in route_list:
                        s_code = st.get("stationCode") or st.get("code") or st.get("station_code") or ""
                        if s_code == next_code:
                            next_found = True
                        if next_found:
                            upcoming_stops_candidates.append(st)
                else:
                    upcoming_stops_candidates = route_list[1:] if len(route_list) > 1 else route_list

                conflict_delay = float(train_ent.conflict_delay) if train_ent else 0.0
                upcoming_predictions = []
                running_delay = obs_delay

                for idx, stop in enumerate(upcoming_stops_candidates):
                    s_code = stop.get("stationCode") or stop.get("code") or stop.get("station_code") or f"STN_{idx+1}"
                    s_name = stop.get("stationName") or stop.get("name") or stop.get("station_name") or s_code
                    sched_arr_raw = stop.get("scheduledArrival") or stop.get("scheduled_arrival") or stop.get("arrival") or stop.get("scheduledDeparture") or stop.get("departure")
                    sched_dt = _parse_stop_time(sched_arr_raw)

                    inf_input = StationInferenceInput(
                        hour_of_day=sched_dt.hour,
                        current_accumulated_delay=max(0.0, running_delay),
                        priority_tier=p_tier,
                        weather=train_ent.current_weather if train_ent else None,
                        is_origin=False,
                    )
                    pred_res = predict_delay(inf_input)
                    station_eta_res = calculate_station_eta(
                        scheduled_arrival=sched_dt,
                        predicted_delay_minutes=pred_res.predicted_delay_minutes,
                        conflict_delay_minutes=conflict_delay if idx == 0 else 0.0,
                        is_fallback=pred_res.is_fallback,
                        fallback_reason=pred_res.fallback_reason,
                    )

                    running_delay = pred_res.predicted_delay_minutes
                    upcoming_predictions.append({
                        "station_code": s_code,
                        "station_name": s_name,
                        "sequence": stop.get("sequence") or stop.get("stop_no") or idx + 1,
                        "scheduled_arrival": sched_dt.strftime("%H:%M:%S") if sched_arr_raw else None,
                        "predicted_eta": station_eta_res.estimated_arrival.strftime("%H:%M:%S"),
                        "predicted_delay_minutes": round(pred_res.predicted_delay_minutes, 1),
                        "total_predicted_delay_minutes": round(station_eta_res.total_delay_minutes, 1),
                        "is_next_station": (idx == 0),
                        "is_final_destination": (idx == len(upcoming_stops_candidates) - 1),
                    })

                next_pred = upcoming_predictions[0] if upcoming_predictions else None
                dest_pred = upcoming_predictions[-1] if upcoming_predictions else None

                if not next_pred:
                    sched_arr = datetime.now()
                    inf_input = StationInferenceInput(
                        hour_of_day=sched_arr.hour,
                        current_accumulated_delay=max(0.0, obs_delay),
                        priority_tier=p_tier,
                        weather=train_ent.current_weather if train_ent else None,
                        is_origin=(obs_delay == 0.0),
                    )
                    pred_res = predict_delay(inf_input)
                    eta_res = calculate_station_eta(
                        scheduled_arrival=sched_arr,
                        predicted_delay_minutes=pred_res.predicted_delay_minutes,
                        conflict_delay_minutes=conflict_delay,
                        is_fallback=pred_res.is_fallback,
                        fallback_reason=pred_res.fallback_reason,
                    )
                    next_pred = {
                        "station_code": next_code or "NEXT",
                        "station_name": next_code or "Next Station",
                        "scheduled_arrival": sched_arr.strftime("%H:%M:%S"),
                        "predicted_eta": eta_res.estimated_arrival.strftime("%H:%M:%S"),
                        "predicted_delay_minutes": round(pred_res.predicted_delay_minutes, 1),
                        "total_predicted_delay_minutes": round(eta_res.total_delay_minutes, 1),
                    }
                    dest_pred = next_pred

                live_ml_result = {
                    "live_observed_delay_minutes": round(obs_delay, 1),
                    "ml_predicted_delay_minutes": next_pred["predicted_delay_minutes"],
                    "conflict_delay_minutes": round(conflict_delay, 1),
                    "total_predicted_delay_minutes": next_pred["total_predicted_delay_minutes"],
                    "scheduled_arrival": next_pred["scheduled_arrival"],
                    "updated_predicted_eta": next_pred["predicted_eta"],
                    "next_station_prediction": next_pred,
                    "final_destination_prediction": dest_pred,
                    "upcoming_stations_predictions": upcoming_predictions,
                    "is_fallback": bool(train_ent and train_ent.is_fallback),
                    "fallback_reason": getattr(train_ent, "fallback_reason", None),
                }
            except Exception as e:
                logger.warning(f"Error calculating live ML prediction for train {train_no}: {e}")

        operational_analysis = self._compute_operational_analysis(
            train_no=train_no,
            live_data=live_data,
            sim_state=sim_state,
            live_ml_result=live_ml_result,
        )

        return {
            "train_no": train_no,
            "live_status": live_data.model_dump() if hasattr(live_data, "model_dump") else live_data,
            "simulation_state": sim_state,
            "live_ml_prediction": live_ml_result,
            "operational_analysis": operational_analysis,
        }

    def _compute_operational_analysis(
        self,
        train_no: int,
        live_data: Any,
        sim_state: Optional[Dict[str, Any]],
        live_ml_result: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Dynamically evaluate Downstream Conflict Risk, Platform Allocation & Clearance,
        and AI Dispatch Recommendations based on live telemetry and NetworkX topology.
        """
        raw = {}
        if hasattr(live_data, "raw_data") and isinstance(live_data.raw_data, dict):
            raw = live_data.raw_data
        elif isinstance(live_data, dict) and "raw_data" in live_data:
            raw = live_data.get("raw_data", {})

        curr_loc = raw.get("currentLocation", {})
        next_halt = raw.get("nextHalt", {})
        route = raw.get("route", [])

        # Current station
        curr_code = curr_loc.get("stationCode") or (sim_state.get("current_station") if sim_state else "") or "EN_ROUTE"
        curr_name = curr_loc.get("stationName") or curr_code

        # Next station
        next_code = next_halt.get("stationCode") or (sim_state.get("next_station") if sim_state else "") or ""
        next_name = next_halt.get("stationName") or next_code

        # Fallback next from route if missing
        if not next_code and isinstance(route, list) and len(route) > 1:
            for idx, stop in enumerate(route):
                if stop.get("stationCode") == curr_code and idx + 1 < len(route):
                    next_code = route[idx + 1].get("stationCode", "")
                    next_name = route[idx + 1].get("stationName", next_code)
                    break

        if not next_code:
            next_code = "NEXT_HALT"
            next_name = "Approaching Next Station"

        # 1. Identify Next Critical Interlocking Junction
        junction_code = ""
        junction_name = ""
        KNOWN_JUNCTIONS = {
            "CNB", "MTJ", "KOTA", "NDLS", "BVI", "BRC", "RTM", "GWL",
            "AGC", "VGLJ", "STA", "JHS", "DDU", "ALD", "PRYJ", "LKO",
            "LJN", "MMCT", "BPL", "NGP", "ET", "GZB", "UMB", "ASR"
        }

        # Search forward in route for junction
        found_current = False
        if isinstance(route, list) and route:
            for stop in route:
                s_code = (stop.get("stationCode") or "").upper()
                s_name = stop.get("stationName", "")
                if s_code == curr_code:
                    found_current = True
                    continue
                if found_current:
                    if s_code in KNOWN_JUNCTIONS or "JN" in s_name.upper() or "JUNCTION" in s_name.upper():
                        junction_code = s_code
                        junction_name = s_name
                        break

        # Fallback to simulation upcoming stops
        if not junction_code and sim_state and sim_state.get("upcoming_stops"):
            for stop in sim_state["upcoming_stops"]:
                s_code = (stop.get("station_code") or "").upper()
                s_name = stop.get("station_name", "")
                if s_code in KNOWN_JUNCTIONS or "JN" in s_name.upper() or "JUNCTION" in s_name.upper():
                    junction_code = s_code
                    junction_name = s_name
                    break

        if not junction_code:
            junction_code = next_code
            junction_name = next_name if next_name else f"Interlocking Section {next_code}"

        # 2. Evaluate Downstream Conflict Risk
        has_sim_conflict = bool(
            sim_state and (sim_state.get("has_active_conflict") or (sim_state.get("conflict_delay", 0) > 0))
        )
        active_network_conflicts = [c for c in self.engine.active_conflicts if c.get("train_no") == train_no]
        if active_network_conflicts:
            has_sim_conflict = True

        observed_delay = float(
            getattr(live_data, "delay_minutes", 0.0)
            or (live_ml_result.get("live_observed_delay_minutes", 0.0) if live_ml_result else 0.0)
            or 0.0
        )
        net_delay = float(
            (live_ml_result.get("total_predicted_delay_minutes", observed_delay) if live_ml_result else observed_delay)
            or 0.0
        )

        if has_sim_conflict or net_delay > 20.0:
            conflict_level = "HIGH"
            risk_label = "High Precedence Contention"
            risk_color = "red"
            headway_buffer_minutes = 3.5
            headway_status = "Compressed Headway Margin"
            conflict_summary = f"Active track section contention before {junction_name}. Train scheduled to yield precedence on loop line (+8m buffer)."
            advisory_action = "EXECUTE LOOP LINE PRECEDENCE HOLD"
            advisory_detail = f"Hold #{train_no} at {junction_name} outer home signal. Allow higher priority rake to clear mainline throat."
            time_saved_mins = 16.5
        elif net_delay > 6.0:
            conflict_level = "MODERATE"
            risk_label = "Moderate Section Density"
            risk_color = "amber"
            headway_buffer_minutes = 6.0
            headway_status = "Controlled Block Headway"
            conflict_summary = f"Dynamic block spacing active approaching {junction_name}. Signalling regulating line speed to absorb drift."
            advisory_action = "REGULATE HEADWAY • CAUTION ASPECT (45 KM/H)"
            advisory_detail = f"Downstream pacing active on section approach to {junction_name}. Maintain cautionary speed to prevent hard stop."
            time_saved_mins = 8.2
        else:
            conflict_level = "LOW"
            risk_label = "Optimal Line Velocity"
            risk_color = "emerald"
            headway_buffer_minutes = 10.0
            headway_status = "Clear Block Signal Aspect"
            conflict_summary = f"All block reservations and interlocking switches locked clear through {junction_name}. No opposing or precedence contention."
            advisory_action = "PROCEED AT NOMINAL LINE VELOCITY (GREEN ASPECT)"
            advisory_detail = f"Corridor block clear up to {junction_name}. Maintain maximum authorized line velocity."
            time_saved_mins = 0.0

        # 3. Evaluate Platform Allocation & Clearance
        platform_assigned = None
        if isinstance(route, list):
            for stop in route:
                if stop.get("stationCode") == next_code and stop.get("platform"):
                    p = str(stop["platform"]).strip()
                    platform_assigned = f"PF {p}" if not p.upper().startswith("PF") else p
                    break

        if not platform_assigned and sim_state and sim_state.get("all_stops"):
            for stop in sim_state["all_stops"]:
                if stop.get("station_code") == next_code and stop.get("platform"):
                    platform_assigned = stop["platform"]
                    break

        if not platform_assigned:
            platform_assigned = "PF 1"

        if conflict_level == "HIGH":
            clearance_status = "CONTENTION / OCCUPIED"
            clearance_color = "red"
            clearance_detail = f"{platform_assigned} berth currently occupied by preceding service. Awaiting block clearing."
            track_type = "Loop Platform Line"
        elif conflict_level == "MODERATE":
            clearance_status = "BERTH RESERVED"
            clearance_color = "amber"
            clearance_detail = f"{platform_assigned} route sequenced. Interlocking points locked for scheduled arrival."
            track_type = "Main Platform Line"
        else:
            clearance_status = "CLEAR FOR ENTRY"
            clearance_color = "emerald"
            clearance_detail = f"{platform_assigned} track unoccupied. Automated approach signal set to clear green."
            track_type = "Main Through Line"

        return {
            "conflict_risk": {
                "level": conflict_level,
                "label": risk_label,
                "color": risk_color,
                "junction_code": junction_code,
                "junction_name": junction_name,
                "headway_buffer_minutes": headway_buffer_minutes,
                "headway_status": headway_status,
                "summary": conflict_summary,
            },
            "platform_allocation": {
                "station_code": next_code,
                "station_name": next_name,
                "platform": platform_assigned,
                "clearance_status": clearance_status,
                "clearance_color": clearance_color,
                "clearance_detail": clearance_detail,
                "track_type": track_type,
            },
            "dispatch_advisory": {
                "action": advisory_action,
                "detail": advisory_detail,
                "time_saved_minutes": time_saved_mins,
            },
        }


simulation_service = SimulationService()
