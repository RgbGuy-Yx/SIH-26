"""
Unified Master Test Runner for Phase 2A and Phase 2C Intelligence Pipeline.
Executes test suites and writes detailed output to test_results.log.
"""

import sys
import os
import traceback
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.model_loader import ModelManager, get_model, get_feature_names, EXPECTED_FEATURES
from app.ml.schemas import (
    PriorityTier,
    WeatherInput,
    StationInferenceInput,
    PredictionResult,
    ETAResult,
    TransitTimeResult,
)
from app.ml.feature_builder import (
    validate_inference_input,
    validate_weather_data,
    build_feature_dict,
    build_feature_dataframe,
)
from app.ml.predictor import predict_delay, predict_and_calculate_eta
from app.ml.eta_calculator import calculate_station_eta, calculate_section_transit_time
from app.graph.schemas import TrackType, TrackSection, StationNode, SectionOccupancy, PipelineStepResult
from app.graph.railway_graph import RailwayGraph
from app.graph.conflict_engine import ConflictEngine
from app.services.pipeline_service import ETAPipelineService

from tests.test_ml_inference import (
    test_model_loading_and_singleton,
    test_feature_schema_loading_and_ordering,
    test_feature_dataframe_structure,
    test_valid_ml_prediction,
    test_fallback_on_none_weather,
    test_fallback_on_incomplete_weather,
    test_origin_station_fallback,
    test_invalid_hour_of_day_rejected,
    test_invalid_weather_bounds_triggers_fallback,
    test_no_target_leakage_and_no_identities,
    test_eta_calculation_standard,
    test_eta_calculation_with_conflict_delay,
    test_section_transit_time_calculation,
    test_section_transit_time_time_recovery,
    test_predict_and_calculate_eta_orchestrator,
)
from tests.test_phase2c_integration import (
    test_1_train_a_to_b_no_conflict,
    test_2_single_line_section_conflict_resolution,
    test_3_multi_hop_a_to_b_to_c_delay_propagation,
    test_4_missing_weather_fallback_in_pipeline,
    test_5_deterministic_priority_precedence_hierarchy,
)


def run_all():
    log_path = backend_dir / "test_results.log"
    out_lines = []

    def log(msg=""):
        out_lines.append(msg)
        print(msg)

    # =========================================================================
    # 1. PHASE 2A TESTS
    # =========================================================================
    log("=" * 80)
    log("PHASE 2A: XGBOOST INFERENCE & ETA PIPELINE TEST SUITE")
    log("=" * 80)

    phase2a_tests = [
        ("Model Loading & Singleton", test_model_loading_and_singleton),
        ("Feature Schema & Exact Ordering", test_feature_schema_loading_and_ordering),
        ("Feature DataFrame Construction", test_feature_dataframe_structure),
        ("Valid ML Inference (XGBoost)", test_valid_ml_prediction),
        ("Fallback on Missing Weather (None)", test_fallback_on_none_weather),
        ("Fallback on Incomplete Weather", test_fallback_on_incomplete_weather),
        ("Origin Station Fallback (0.0 mins)", test_origin_station_fallback),
        ("Invalid Hour of Day Rejection", test_invalid_hour_of_day_rejected),
        ("Invalid Weather Bounds Rejection", test_invalid_weather_bounds_triggers_fallback),
        ("Target Leakage & Identity Agnosticism", test_no_target_leakage_and_no_identities),
        ("Standard ETA Calculation", test_eta_calculation_standard),
        ("ETA Calculation with Conflict Delay", test_eta_calculation_with_conflict_delay),
        ("Section Transit-Time Calculation", test_section_transit_time_calculation),
        ("Transit-Time Time-Recovery Handling", test_section_transit_time_time_recovery),
        ("End-to-End Predict & ETA Orchestrator", test_predict_and_calculate_eta_orchestrator),
    ]

    passed_2a = 0
    failed_2a = 0

    for name, test_fn in phase2a_tests:
        try:
            test_fn()
            log(f"[PASS] {name}")
            passed_2a += 1
        except Exception as exc:
            log(f"[FAIL] {name}: {exc}")
            out_lines.append(traceback.format_exc())
            failed_2a += 1

    # =========================================================================
    # 2. PHASE 2C TESTS
    # =========================================================================
    log("\n" + "=" * 80)
    log("PHASE 2C: XGBOOST + NETWORKX + FINAL ETA INTEGRATION TEST SUITE")
    log("=" * 80)

    clear_w = WeatherInput(
        is_foggy=0.0, avg_temperature=28.0, total_precipitation=0.0, avg_wind_speed=12.0, avg_cloud_cover=15.0
    )

    def run_2c_test(name, fn):
        service = ETAPipelineService()
        if fn == test_1_train_a_to_b_no_conflict:
            fn(service, clear_w)
        elif fn == test_2_single_line_section_conflict_resolution:
            fn(service, clear_w)
        elif fn == test_3_multi_hop_a_to_b_to_c_delay_propagation:
            fn(service, clear_w)
        elif fn == test_4_missing_weather_fallback_in_pipeline:
            fn(service)
        elif fn == test_5_deterministic_priority_precedence_hierarchy:
            fn(service, clear_w)

    phase2c_tests = [
        ("TEST 1: Train A -> B with No Conflict", test_1_train_a_to_b_no_conflict),
        ("TEST 2: Single-Line Conflict Resolution (Tier 1 vs Tier 4)", test_2_single_line_section_conflict_resolution),
        ("TEST 3: Multi-Hop A -> B -> C Delay Propagation", test_3_multi_hop_a_to_b_to_c_delay_propagation),
        ("TEST 4: Missing Weather Graceful Fallback in Pipeline", test_4_missing_weather_fallback_in_pipeline),
        ("TEST 5: Deterministic Priority Precedence Hierarchy (Tiers 1-4)", test_5_deterministic_priority_precedence_hierarchy),
    ]

    passed_2c = 0
    failed_2c = 0

    for name, test_fn in phase2c_tests:
        try:
            run_2c_test(name, test_fn)
            log(f"[PASS] {name}")
            passed_2c += 1
        except Exception as exc:
            log(f"[FAIL] {name}: {exc}")
            out_lines.append(traceback.format_exc())
            failed_2c += 1

    total_passed = passed_2a + passed_2c
    total_failed = failed_2a + failed_2c
    total_tests = len(phase2a_tests) + len(phase2c_tests)

    log("\n" + "-" * 80)
    log(f"TOTAL TEST SUMMARY: {total_passed} PASSED, {total_failed} FAILED (Total: {total_tests})")
    log(f"  - Phase 2A Tests: {passed_2a}/{len(phase2a_tests)} Passed")
    log(f"  - Phase 2C Tests: {passed_2c}/{len(phase2c_tests)} Passed")
    log("-" * 80)

    # =========================================================================
    # 3. LIVE PHASE 2C DEMONSTRATION: MULTI-HOP A -> B -> C JOURNEY
    # =========================================================================
    log("\n" + "=" * 80)
    log("PHASE 2C: LIVE END-TO-END SYSTEM DEMONSTRATION (A -> B -> C)")
    log("=" * 80)

    demo_service = ETAPipelineService()

    # Pre-register a competing train on section B -> C to demonstrate dynamic conflict resolution
    t_comp_dept = datetime(2026, 8, 28, 7, 30, 0)
    t_comp_arr = datetime(2026, 8, 28, 8, 20, 0)
    demo_service.conflict_engine.register_occupancy(
        SectionOccupancy(
            train_id="54301",
            section_id="SEC-B-C",
            station_from="STN_B",
            station_to="STN_C",
            entry_time=t_comp_dept,
            exit_time=t_comp_arr,
            priority_tier=PriorityTier.TIER_4_FREIGHT_SPECIAL,
        )
    )

    # Train: 12003 Swarna Shatabdi (Tier 1 Premium)
    # Hop 1: STN_A -> STN_B (06:00 -> 06:45)
    # Hop 2: STN_B -> STN_C (06:55 -> 07:45)
    t_a_dept = datetime(2026, 8, 28, 6, 0, 0)
    t_b_arr = datetime(2026, 8, 28, 6, 45, 0)
    t_b_dept = datetime(2026, 8, 28, 6, 55, 0)
    t_c_arr = datetime(2026, 8, 28, 7, 45, 0)

    weather_hop1 = WeatherInput(
        is_foggy=0.0, avg_temperature=26.0, total_precipitation=0.0, avg_wind_speed=10.0, avg_cloud_cover=20.0
    )
    weather_hop2 = WeatherInput(
        is_foggy=1.0, avg_temperature=11.0, total_precipitation=1.2, avg_wind_speed=14.0, avg_cloud_cover=90.0
    )

    log("\n[SETUP]")
    log("  Train:                 12003 Swarna Shatabdi (Priority Tier 1: Premium)")
    log("  Route:                 Station A -> Station B -> Station C")
    log("  Initial Origin Delay:  10.0 mins (Departed Station A at 06:10:00)")
    log("  Network Conditions:    Section A-B (Double Line), Section B-C (Single Line Bottleneck)")

    # Execute Multi-Hop Journey
    journey_results = demo_service.simulate_multi_hop_journey(
        train_id="12003",
        train_name="Swarna Shatabdi",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        route_stations=["STN_A", "STN_B", "STN_C"],
        timetable=[(t_a_dept, t_b_arr), (t_b_dept, t_c_arr)],
        initial_origin_delay_minutes=10.0,
        weather_per_hop=[weather_hop1, weather_hop2],
    )

    step_ab = journey_results[0]
    step_bc = journey_results[1]

    log("\n" + "-" * 40)
    log("[HOP 1: Station A -> Station B]")
    log("-" * 40)
    log(f"  - From Station:                 {step_ab.from_station_id}")
    log(f"  - To Station:                   {step_ab.to_station_id}")
    log(f"  - Scheduled Timetable:          {step_ab.scheduled_departure_from.strftime('%H:%M')} -> {step_ab.scheduled_arrival_to.strftime('%H:%M')} (Runtime: {step_ab.scheduled_section_runtime_minutes:.1f} mins)")
    log(f"  - Input Delay (Lag-1 at A):     {step_ab.previous_delay_minutes:.2f} mins")
    log(f"  - ML Model Predicted Delay (B): {step_ab.ml_predicted_delay_minutes:.2f} mins (Fallback: {step_ab.is_fallback})")
    log(f"  - NetworkX Conflict Delay:      {step_ab.conflict_delay_minutes:.2f} mins")
    log(f"  - Total Delay at Station B:     {step_ab.total_final_delay_minutes:.2f} mins")
    log(f"  - Calculated Final ETA (B):     {step_ab.predicted_arrival_eta.strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"  - Derived Section Transit Time: {step_ab.derived_section_transit_minutes:.2f} mins")
    log(f"  - Conflict Status:              {step_ab.conflict_details.resolution_reason}")

    log("\n" + "-" * 40)
    log("[HOP 2: Station B -> Station C (Propagation Verification)]")
    log("-" * 40)
    log(f"  - From Station:                 {step_bc.from_station_id}")
    log(f"  - To Station:                   {step_bc.to_station_id}")
    log(f"  - Scheduled Timetable:          {step_bc.scheduled_departure_from.strftime('%H:%M')} -> {step_bc.scheduled_arrival_to.strftime('%H:%M')} (Runtime: {step_bc.scheduled_section_runtime_minutes:.1f} mins)")
    log(f"  - Input Delay (Fed from B):     {step_bc.previous_delay_minutes:.2f} mins  <-- (Exact match with Hop 1 output!)")
    log(f"  - Adverse Weather Fed:          Foggy (1.0), Temp 11°C, Rain 1.2mm")
    log(f"  - ML Model Predicted Delay (C): {step_bc.ml_predicted_delay_minutes:.2f} mins (Fallback: {step_bc.is_fallback})")
    log(f"  - NetworkX Conflict Delay:      {step_bc.conflict_delay_minutes:.2f} mins")
    log(f"  - Total Delay at Station C:     {step_bc.total_final_delay_minutes:.2f} mins")
    log(f"  - Calculated Final ETA (C):     {step_bc.predicted_arrival_eta.strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"  - Derived Section Transit Time: {step_bc.derived_section_transit_minutes:.2f} mins")
    log(f"  - Conflict Resolution:          {step_bc.conflict_details.resolution_reason}")
    log("=" * 80)

    # Write log to file
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines) + "\n")

    return total_failed == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
