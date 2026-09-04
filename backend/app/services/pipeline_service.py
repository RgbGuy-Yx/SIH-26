"""
Deterministic Phase 2 Intelligence Pipeline Service.
Phase 2C: End-to-End Orchestrator connecting Train State -> Feature Builder -> XGBoost -> NetworkX -> Conflict Detection -> Priority Resolution -> Final ETA.
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta

from app.ml.schemas import (
    PriorityTier,
    WeatherInput,
    StationInferenceInput,
    PredictionResult,
    ETAResult,
)
from app.ml.predictor import predict_delay
from app.ml.eta_calculator import calculate_station_eta, calculate_section_transit_time
from app.graph.schemas import (
    StationNode,
    TrackSection,
    SectionOccupancy,
    ConflictResult,
    PipelineStepResult,
)
from app.graph.railway_graph import RailwayGraph
from app.graph.conflict_engine import ConflictEngine

logger = logging.getLogger(__name__)


class ETAPipelineService:
    """
    Unified Phase 2 Intelligence Pipeline Orchestrator.
    Executes deterministic, end-to-end delay prediction, NetworkX conflict checks,
    priority arbitration, and final ETA calculations for single or multi-hop journeys.
    """

    def __init__(self, railway_graph: Optional[RailwayGraph] = None, conflict_engine: Optional[ConflictEngine] = None):
        self.graph = railway_graph or RailwayGraph.create_default_corridor()
        self.conflict_engine = conflict_engine or ConflictEngine()

    def process_step(
        self,
        train_id: str,
        train_name: str,
        priority_tier: PriorityTier,
        from_station_id: str,
        to_station_id: str,
        scheduled_departure_from: datetime,
        scheduled_arrival_to: datetime,
        previous_delay_minutes: float,
        weather: Optional[WeatherInput],
        hour_of_day: Optional[int] = None,
        is_origin: bool = False,
        register_occupancy_after: bool = True,
    ) -> PipelineStepResult:
        r"""
        Processes one deterministic section hop (Station N-1 -> Station N).

        Steps:
        1. Build StationInferenceInput (hour_of_day, current_accumulated_delay=previous_delay, priority_tier, weather).
        2. Run XGBoost Inference (with graceful fallback if weather missing/invalid) -> ml_predicted_delay (\hat{D}_N).
        3. Query NetworkX Track Section properties between from_station and to_station.
        4. Calculate train's projected section entry and exit time window.
        5. Run Conflict Detection & Priority Precedence arbitration against competing trains on NetworkX graph.
        6. Compute Final ETA and derived section transit time:
           - Final Delay = ml_predicted_delay + conflict_delay
           - Final ETA = scheduled_arrival_to + Final Delay
           - Derived Transit Time = scheduled_runtime + (ml_predicted_delay - previous_delay) + conflict_delay
        7. Register the train's actual section occupancy in the conflict engine if requested.
        8. Return comprehensive PipelineStepResult with all intermediate terms kept cleanly separate.
        """
        # 1. Feature parameters
        inferred_hour = hour_of_day if hour_of_day is not None else scheduled_departure_from.hour

        inference_input = StationInferenceInput(
            hour_of_day=inferred_hour,
            current_accumulated_delay=float(previous_delay_minutes),
            priority_tier=priority_tier,
            weather=weather,
            is_origin=is_origin,
        )

        # 2. XGBoost Inference (or graceful deterministic fallback)
        pred_result: PredictionResult = predict_delay(inference_input)
        ml_predicted_delay = pred_result.predicted_delay_minutes

        # 3. Retrieve NetworkX Track Section
        section = self.graph.get_section(from_station_id, to_station_id)
        if not section:
            # Create dynamic virtual section if not pre-registered in topology
            section_id = f"SEC-{from_station_id}-{to_station_id}"
            runtime_mins = max(1.0, (scheduled_arrival_to - scheduled_departure_from).total_seconds() / 60.0)
            from app.graph.schemas import TrackType
            section = TrackSection(
                section_id=section_id,
                station_from=from_station_id,
                station_to=to_station_id,
                length_km=50.0,
                track_type=TrackType.DOUBLE,
                max_speed_kmh=120.0,
                min_headway_minutes=5.0,
                default_transit_minutes=runtime_mins,
            )
            self.graph.add_track_section(section)

        # 4. Projected time window for block section occupancy
        # Entry time at from_station is scheduled_departure + previous_delay
        actual_departure = scheduled_departure_from + timedelta(minutes=previous_delay_minutes)
        # Expected arrival before conflict is scheduled_arrival + ml_predicted_delay
        expected_arrival_before_conflict = scheduled_arrival_to + timedelta(minutes=ml_predicted_delay)

        # 5. Conflict Detection & Priority Precedence Resolution
        conflict_result: ConflictResult = self.conflict_engine.check_and_resolve_conflict(
            candidate_train_id=train_id,
            candidate_train_name=train_name,
            candidate_priority=priority_tier,
            section=section,
            station_from=from_station_id,
            station_to=to_station_id,
            entry_time=actual_departure,
            exit_time=expected_arrival_before_conflict,
        )

        conflict_delay = conflict_result.conflict_delay_minutes

        # 6. Final ETA and Section Transit Calculation
        eta_result: ETAResult = calculate_station_eta(
            scheduled_arrival=scheduled_arrival_to,
            predicted_delay_minutes=ml_predicted_delay,
            conflict_delay_minutes=conflict_delay,
            is_fallback=pred_result.is_fallback,
            fallback_reason=pred_result.fallback_reason,
        )

        scheduled_runtime_mins = max(0.0, (scheduled_arrival_to - scheduled_departure_from).total_seconds() / 60.0)
        
        # Section transit time = Scheduled runtime + delta delay + conflict delay
        # delta delay = (ml_predicted_delay - previous_delay)
        derived_transit_mins = scheduled_runtime_mins + (ml_predicted_delay - previous_delay_minutes) + conflict_delay
        derived_transit_mins = max(0.0, round(derived_transit_mins, 2))

        # 7. Register Occupancy in Conflict Engine
        if register_occupancy_after:
            final_exit_time = eta_result.estimated_arrival
            self.conflict_engine.register_occupancy(
                SectionOccupancy(
                    train_id=train_id,
                    section_id=section.section_id,
                    station_from=from_station_id,
                    station_to=to_station_id,
                    entry_time=actual_departure + timedelta(minutes=conflict_delay),
                    exit_time=final_exit_time,
                    priority_tier=priority_tier,
                )
            )

        # 8. Assemble Pipeline Step Result
        return PipelineStepResult(
            train_id=train_id,
            train_name=train_name,
            priority_tier=priority_tier,
            from_station_id=from_station_id,
            to_station_id=to_station_id,
            section_id=section.section_id,
            scheduled_departure_from=scheduled_departure_from,
            scheduled_arrival_to=scheduled_arrival_to,
            previous_delay_minutes=round(previous_delay_minutes, 2),
            ml_predicted_delay_minutes=ml_predicted_delay,
            conflict_delay_minutes=round(conflict_delay, 2),
            total_final_delay_minutes=eta_result.total_delay_minutes,
            predicted_arrival_eta=eta_result.estimated_arrival,
            scheduled_section_runtime_minutes=round(scheduled_runtime_mins, 2),
            derived_section_transit_minutes=derived_transit_mins,
            is_fallback=pred_result.is_fallback,
            fallback_reason=pred_result.fallback_reason,
            conflict_details=conflict_result,
            feature_vector=pred_result.feature_vector,
        )

    def simulate_multi_hop_journey(
        self,
        train_id: str,
        train_name: str,
        priority_tier: PriorityTier,
        route_stations: List[str],
        timetable: List[Tuple[datetime, datetime]],  # [(sched_dept_0, sched_arr_1), (sched_dept_1, sched_arr_2), ...]
        initial_origin_delay_minutes: float,
        weather_per_hop: List[Optional[WeatherInput]],
    ) -> List[PipelineStepResult]:
        """
        Propagate delay across a multi-hop journey (e.g., Station A -> Station B -> Station C).
        Guarantees that the predicted delay from Station B becomes the input delay for predicting Station C.
        """
        results: List[PipelineStepResult] = []
        current_accumulated_delay = initial_origin_delay_minutes

        for i in range(len(route_stations) - 1):
            stn_from = route_stations[i]
            stn_to = route_stations[i + 1]
            sched_dept, sched_arr = timetable[i]
            hop_weather = weather_per_hop[i] if i < len(weather_per_hop) else None

            step_res = self.process_step(
                train_id=train_id,
                train_name=train_name,
                priority_tier=priority_tier,
                from_station_id=stn_from,
                to_station_id=stn_to,
                scheduled_departure_from=sched_dept,
                scheduled_arrival_to=sched_arr,
                previous_delay_minutes=current_accumulated_delay,
                weather=hop_weather,
                is_origin=(i == 0 and initial_origin_delay_minutes == 0.0),
                register_occupancy_after=True,
            )
            results.append(step_res)

            # PROPAGATION RULE: Total final delay at Station B becomes the input accumulated delay for predicting Station C
            current_accumulated_delay = step_res.total_final_delay_minutes

        return results
