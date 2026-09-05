"""
Master Unified Test Runner for Phase 2A, Phase 2C, Phase 3A, and Phase 3B Railway Intelligence Pipeline.
Executes test suites and writes detailed output to test_results.log.
"""

import sys
import os
import traceback
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from fastapi.testclient import TestClient

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
from app.graph.dataset_loader import load_national_railway_graph, get_available_trains, get_train_timetable
from app.services.pipeline_service import ETAPipelineService
from app.simulation.schemas import TrainStatus, TrainSimulationState, SimulationConfig, SimulationSnapshot
from app.simulation.clock import VirtualClock
from app.simulation.train_entity import TrainEntity
from app.simulation.engine import SimulationEngine
from app.main import app

# Phase 2A Tests
from tests.test_ml_inference import (
    test_model_loading_and_singleton,
    test_feature_schema_loading_and_ordering,
    test_feature_dataframe_structure,
    test_feature_numpy_structure,
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

# Phase 2C Tests
from tests.test_phase2c_integration import (
    test_1_train_a_to_b_no_conflict,
    test_2_single_line_section_conflict_resolution,
    test_3_multi_hop_a_to_b_to_c_delay_propagation,
    test_4_missing_weather_fallback_in_pipeline,
    test_5_deterministic_priority_precedence_hierarchy,
)

# Phase 3A Tests
from tests.test_phase3a_simulation import (
    test_1_dataset_train_loading,
    test_2_timetable_extraction,
    test_3_route_construction,
    test_4_station_coordinate_loading,
    test_5_virtual_clock_ticking,
    test_6_clock_controls,
    test_7_train_position_interpolation,
    test_8_station_to_station_transition,
    test_9_multiple_trains_simultaneous,
    test_10_simulation_ml_integration,
    test_11_simulation_delay_propagation,
    test_12_simulation_networkx_conflict,
    test_13_simulation_priority_resolution,
    test_14_simulation_eta_update,
    test_15_simulation_deterministic_replay,
    test_16_simulation_error_handling,
)

# Phase 3B Tests
from tests.test_phase3b_api import (
    test_01_health_endpoint,
    test_02_system_data_mode_endpoint,
    test_03_simulation_start,
    test_04_simulation_pause,
    test_05_simulation_resume,
    test_06_simulation_speed,
    test_07_simulation_step,
    test_08_simulation_reset,
    test_09_simulation_state,
    test_10_get_all_trains,
    test_11_get_single_train_found,
    test_12_get_single_train_not_found,
    test_13_get_train_eta,
    test_14_get_train_conflicts,
    test_15_get_train_live_status,
    test_16_cache_hit_behavior,
    test_17_request_deduplication_coalescing,
    test_18_stale_fallback_on_api_error,
    test_19_websocket_telemetry_stream,
    test_20_decoupled_integrity,
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
        ("Feature NumPy Vector Construction", test_feature_numpy_structure),
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

    passed_2a, failed_2a = 0, 0
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
        if fn in (test_1_train_a_to_b_no_conflict, test_2_single_line_section_conflict_resolution, test_3_multi_hop_a_to_b_to_c_delay_propagation, test_5_deterministic_priority_precedence_hierarchy):
            fn(service, clear_w)
        elif fn == test_4_missing_weather_fallback_in_pipeline:
            fn(service)

    phase2c_tests = [
        ("TEST 1: Train A -> B with No Conflict", test_1_train_a_to_b_no_conflict),
        ("TEST 2: Single-Line Conflict Resolution (Tier 1 vs Tier 4)", test_2_single_line_section_conflict_resolution),
        ("TEST 3: Multi-Hop A -> B -> C Delay Propagation", test_3_multi_hop_a_to_b_to_c_delay_propagation),
        ("TEST 4: Missing Weather Graceful Fallback in Pipeline", test_4_missing_weather_fallback_in_pipeline),
        ("TEST 5: Deterministic Priority Precedence Hierarchy (Tiers 1-4)", test_5_deterministic_priority_precedence_hierarchy),
    ]

    passed_2c, failed_2c = 0, 0
    for name, test_fn in phase2c_tests:
        try:
            run_2c_test(name, test_fn)
            log(f"[PASS] {name}")
            passed_2c += 1
        except Exception as exc:
            log(f"[FAIL] {name}: {exc}")
            out_lines.append(traceback.format_exc())
            failed_2c += 1

    # =========================================================================
    # 3. PHASE 3A SIMULATION TESTS
    # =========================================================================
    log("\n" + "=" * 80)
    log("PHASE 3A: DETERMINISTIC TRAIN SIMULATION ENGINE TEST SUITE")
    log("=" * 80)

    phase3a_tests = [
        ("TEST 1: Dynamic Dataset Train Loading", test_1_dataset_train_loading),
        ("TEST 2: Timetable Extraction & Stop Parsing", test_2_timetable_extraction),
        ("TEST 3: Route Construction & Sequence Verification", test_3_route_construction),
        ("TEST 4: Station Coordinate Validation (Lat/Lon)", test_4_station_coordinate_loading),
        ("TEST 5: Deterministic Virtual Clock Ticking", test_5_virtual_clock_ticking),
        ("TEST 6: Virtual Clock Controls (Start/Pause/Resume/Reset)", test_6_clock_controls),
        ("TEST 7: Geometric Section Position Interpolation", test_7_train_position_interpolation),
        ("TEST 8: Station-to-Station Transition Progression", test_8_station_to_station_transition),
        ("TEST 9: Multi-Train Simultaneous Simulation", test_9_multiple_trains_simultaneous),
        ("TEST 10: Simulation XGBoost ML Integration (8 Features)", test_10_simulation_ml_integration),
        ("TEST 11: Lag-1 Delay Propagation Across Simulation Hops", test_11_simulation_delay_propagation),
        ("TEST 12: NetworkX Conflict Engine Integration", test_12_simulation_networkx_conflict),
        ("TEST 13: Priority Precedence Arbitration (Tiers 1-4)", test_13_simulation_priority_resolution),
        ("TEST 14: Dynamic Final ETA Recalculation", test_14_simulation_eta_update),
        ("TEST 15: Deterministic Simulation Replay Consistency", test_15_simulation_deterministic_replay),
        ("TEST 16: Missing / Invalid Data Graceful Handling", test_16_simulation_error_handling),
    ]

    passed_3a, failed_3a = 0, 0
    for name, test_fn in phase3a_tests:
        try:
            test_fn()
            log(f"[PASS] {name}")
            passed_3a += 1
        except Exception as exc:
            log(f"[FAIL] {name}: {exc}")
            out_lines.append(traceback.format_exc())
            failed_3a += 1

    # =========================================================================
    # 4. PHASE 3B REST API, WEBSOCKET & RESILIENCE TESTS
    # =========================================================================
    log("\n" + "=" * 80)
    log("PHASE 3B: REST API, WEBSOCKET STREAMING & LIVE PROVIDER TEST SUITE")
    log("=" * 80)

    client = TestClient(app)
    phase3b_tests = [
        ("TEST 1: Health Check Endpoint (GET /api/health)", lambda: test_01_health_endpoint(client)),
        ("TEST 2: System Data Mode (GET /api/system/data-mode)", lambda: test_02_system_data_mode_endpoint(client)),
        ("TEST 3: Simulation Clock Start (POST /api/simulation/start)", lambda: test_03_simulation_start(client)),
        ("TEST 4: Simulation Clock Pause (POST /api/simulation/pause)", lambda: test_04_simulation_pause(client)),
        ("TEST 5: Simulation Clock Resume (POST /api/simulation/resume)", lambda: test_05_simulation_resume(client)),
        ("TEST 6: Simulation Speed Multiplier (POST /api/simulation/speed)", lambda: test_06_simulation_speed(client)),
        ("TEST 7: Simulation Deterministic Step (POST /api/simulation/step)", lambda: test_07_simulation_step(client)),
        ("TEST 8: Simulation State Reset (POST /api/simulation/reset)", lambda: test_08_simulation_reset(client)),
        ("TEST 9: Full Simulation Snapshot (GET /api/simulation/state)", lambda: test_09_simulation_state(client)),
        ("TEST 10: Multi-Train Summary List (GET /api/trains)", lambda: test_10_get_all_trains(client)),
        ("TEST 11: Single Train Detailed Telemetry (GET /api/trains/{trainNo})", lambda: test_11_get_single_train_found(client)),
        ("TEST 12: Train Not Found 404 Handling", lambda: test_12_get_single_train_not_found(client)),
        ("TEST 13: Train Next-Station ETA & ML Delay (GET /api/trains/{trainNo}/eta)", lambda: test_13_get_train_eta(client)),
        ("TEST 14: Train Active Conflict Diagnostics (GET /api/trains/{trainNo}/conflicts)", lambda: test_14_get_train_conflicts(client)),
        ("TEST 15: Decoupled Live Status Query (GET /api/trains/{trainNo}/live-status)", lambda: test_15_get_train_live_status(client)),
        ("TEST 16: In-Memory TTL Cache Hit Behavior", lambda: asyncio.run(test_16_cache_hit_behavior())),
        ("TEST 17: Request Deduplication & In-Flight Coalescing", lambda: asyncio.run(test_17_request_deduplication_coalescing())),
        ("TEST 18: Provider Error Resilience & Stale Fallback", lambda: asyncio.run(test_18_stale_fallback_on_api_error())),
        ("TEST 19: WebSocket Handshake & Telemetry Stream (/ws)", lambda: test_19_websocket_telemetry_stream(client)),
        ("TEST 20: Decoupled Simulation Continuity Across External API Failure", lambda: test_20_decoupled_integrity(client)),
    ]

    passed_3b, failed_3b = 0, 0
    for name, test_fn in phase3b_tests:
        try:
            test_fn()
            log(f"[PASS] {name}")
            passed_3b += 1
        except Exception as exc:
            log(f"[FAIL] {name}: {exc}")
            out_lines.append(traceback.format_exc())
            failed_3b += 1

    total_passed = passed_2a + passed_2c + passed_3a + passed_3b
    total_failed = failed_2a + failed_2c + failed_3a + failed_3b
    total_tests = len(phase2a_tests) + len(phase2c_tests) + len(phase3a_tests) + len(phase3b_tests)

    log("\n" + "-" * 80)
    log(f"MASTER TEST SUMMARY: {total_passed} PASSED, {total_failed} FAILED (Total: {total_tests})")
    log(f"  - Phase 2A (ML Inference):       {passed_2a}/{len(phase2a_tests)} Passed")
    log(f"  - Phase 2C (Pipeline & Graph):   {passed_2c}/{len(phase2c_tests)} Passed")
    log(f"  - Phase 3A (Simulation Engine):  {passed_3a}/{len(phase3a_tests)} Passed")
    log(f"  - Phase 3B (API, WS & Live):     {passed_3b}/{len(phase3b_tests)} Passed")
    log("-" * 80)

    # Write full log file
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines) + "\n")

    return total_failed == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
