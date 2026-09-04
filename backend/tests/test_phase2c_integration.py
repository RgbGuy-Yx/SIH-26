"""
Integration Tests for Phase 2C: XGBoost + NetworkX + Final ETA Intelligence Pipeline.
Phase 2C Test Suite: Covers Tests 1 through 5 and End-to-End Orchestration.
"""

from datetime import datetime, timedelta
import pytest

from app.ml.schemas import PriorityTier, WeatherInput
from app.graph.schemas import TrackType, TrackSection, StationNode, SectionOccupancy
from app.graph.railway_graph import RailwayGraph
from app.graph.conflict_engine import ConflictEngine
from app.services.pipeline_service import ETAPipelineService


@pytest.fixture
def clear_weather() -> WeatherInput:
    """Standard clear daytime weather input."""
    return WeatherInput(
        is_foggy=0.0,
        avg_temperature=28.0,
        total_precipitation=0.0,
        avg_wind_speed=12.0,
        avg_cloud_cover=15.0,
    )


@pytest.fixture
def foggy_weather() -> WeatherInput:
    """Adverse winter fog weather input."""
    return WeatherInput(
        is_foggy=1.0,
        avg_temperature=8.0,
        total_precipitation=0.5,
        avg_wind_speed=5.0,
        avg_cloud_cover=95.0,
    )


@pytest.fixture
def pipeline_service() -> ETAPipelineService:
    """Provides a fresh isolated pipeline service with default corridor."""
    graph = RailwayGraph.create_default_corridor()
    conflict_engine = ConflictEngine()
    return ETAPipelineService(railway_graph=graph, conflict_engine=conflict_engine)


# ==============================================================================
# TEST 1: Train A -> B with No Conflict
# ==============================================================================
def test_1_train_a_to_b_no_conflict(pipeline_service: ETAPipelineService, clear_weather: WeatherInput):
    """
    TEST 1:
    Train A -> B with no track conflict.
    Expected: ML prediction + zero conflict delay -> Final ETA.
    """
    sched_dept = datetime(2026, 8, 28, 8, 0, 0)
    sched_arr = datetime(2026, 8, 28, 8, 35, 0)  # 35 min runtime
    initial_delay = 10.0  # 10 mins late at station A

    step_res = pipeline_service.process_step(
        train_id="12004",
        train_name="Shatabdi Express",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        from_station_id="STN_A",
        to_station_id="STN_B",
        scheduled_departure_from=sched_dept,
        scheduled_arrival_to=sched_arr,
        previous_delay_minutes=initial_delay,
        weather=clear_weather,
        register_occupancy_after=True,
    )

    # 1. Assertions on delays
    assert step_res.previous_delay_minutes == 10.0
    assert step_res.is_fallback is False
    assert step_res.conflict_delay_minutes == 0.0
    assert step_res.conflict_details.has_conflict is False

    # 2. Mathematical Consistency: Total Final Delay = ML Prediction + Conflict Delay
    expected_total_delay = step_res.ml_predicted_delay_minutes + 0.0
    assert step_res.total_final_delay_minutes == round(expected_total_delay, 2)

    # 3. Final ETA = Scheduled Arrival + Total Final Delay
    expected_eta = sched_arr + timedelta(minutes=step_res.total_final_delay_minutes)
    assert step_res.predicted_arrival_eta == expected_eta

    # 4. Section Transit Time = Scheduled Runtime (35 mins) + Delta Delay
    scheduled_runtime = (sched_arr - sched_dept).total_seconds() / 60.0
    assert step_res.scheduled_section_runtime_minutes == 35.0
    expected_transit = scheduled_runtime + (step_res.ml_predicted_delay_minutes - initial_delay)
    assert step_res.derived_section_transit_minutes == round(expected_transit, 2)


# ==============================================================================
# TEST 2: Two Trains Competing for Same Single-Line Section
# ==============================================================================
def test_2_single_line_section_conflict_resolution(pipeline_service: ETAPipelineService, clear_weather: WeatherInput):
    """
    TEST 2:
    Two trains competing for the same single-line section (STN_B -> STN_C).
    Train 1: Vande Bharat / Tier 1 (High priority)
    Train 2: Freight / Tier 4 (Low priority)
    Expected:
    - Tier 1 train gets precedence with 0 conflict delay.
    - Tier 4 train receives conflict waiting delay until section is cleared.
    """
    sched_dept = datetime(2026, 8, 28, 9, 0, 0)
    sched_arr = datetime(2026, 8, 28, 9, 45, 0)  # 45 min runtime

    # Train 1 (Tier 1 Premium) enters first / occupies STN_B -> STN_C
    res_train1 = pipeline_service.process_step(
        train_id="22436",
        train_name="Vande Bharat Express",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        from_station_id="STN_B",
        to_station_id="STN_C",
        scheduled_departure_from=sched_dept,
        scheduled_arrival_to=sched_arr,
        previous_delay_minutes=0.0,
        weather=clear_weather,
        register_occupancy_after=True,
    )

    assert res_train1.conflict_delay_minutes == 0.0
    assert res_train1.conflict_details.has_conflict is False

    # Train 2 (Tier 4 Freight) scheduled to enter STN_B -> STN_C during overlapping time window (9:10 departure)
    sched_dept_freight = datetime(2026, 8, 28, 9, 10, 0)
    sched_arr_freight = datetime(2026, 8, 28, 10, 0, 0)

    res_train2 = pipeline_service.process_step(
        train_id="BOXN_991",
        train_name="Freight Goods Train",
        priority_tier=PriorityTier.TIER_4_FREIGHT_SPECIAL,
        from_station_id="STN_B",
        to_station_id="STN_C",
        scheduled_departure_from=sched_dept_freight,
        scheduled_arrival_to=sched_arr_freight,
        previous_delay_minutes=0.0,
        weather=clear_weather,
        register_occupancy_after=True,
    )

    # Assertions on Train 2 (Freight)
    assert res_train2.conflict_details.has_conflict is True
    assert res_train2.conflict_details.conflicting_train_id == "22436"
    assert res_train2.conflict_details.conflicting_priority_tier == PriorityTier.TIER_1_PREMIUM
    assert res_train2.conflict_details.precedence_granted_to == "22436"
    assert res_train2.conflict_delay_minutes > 0.0  # Must wait for Tier 1 clearance + headway

    # Mathematical Verification: Total Final Delay = ML Predicted Delay + Conflict Delay
    assert res_train2.total_final_delay_minutes == round(
        res_train2.ml_predicted_delay_minutes + res_train2.conflict_delay_minutes, 2
    )
    # Final ETA = Scheduled Arrival + Total Final Delay
    expected_freight_eta = sched_arr_freight + timedelta(minutes=res_train2.total_final_delay_minutes)
    assert res_train2.predicted_arrival_eta == expected_freight_eta


# ==============================================================================
# TEST 3: Multi-Hop A -> B -> C Propagation
# ==============================================================================
def test_3_multi_hop_a_to_b_to_c_delay_propagation(pipeline_service: ETAPipelineService, clear_weather: WeatherInput):
    """
    TEST 3:
    Journey A -> B -> C.
    Expected: Predicted delay at B becomes the input delay for prediction at C.
    """
    t0_dept = datetime(2026, 8, 28, 6, 0, 0)
    t1_arr = datetime(2026, 8, 28, 6, 35, 0)   # Hop 1: A -> B
    t1_dept = datetime(2026, 8, 28, 6, 40, 0)
    t2_arr = datetime(2026, 8, 28, 7, 25, 0)   # Hop 2: B -> C

    initial_origin_delay = 12.0  # 12 mins late at Station A

    journey_steps = pipeline_service.simulate_multi_hop_journey(
        train_id="12003",
        train_name="Swarna Shatabdi",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        route_stations=["STN_A", "STN_B", "STN_C"],
        timetable=[(t0_dept, t1_arr), (t1_dept, t2_arr)],
        initial_origin_delay_minutes=initial_origin_delay,
        weather_per_hop=[clear_weather, clear_weather],
    )

    assert len(journey_steps) == 2
    hop_1 = journey_steps[0]
    hop_2 = journey_steps[1]

    # Hop 1 Verification (A -> B)
    assert hop_1.from_station_id == "STN_A"
    assert hop_1.to_station_id == "STN_B"
    assert hop_1.previous_delay_minutes == 12.0
    predicted_delay_at_b = hop_1.total_final_delay_minutes

    # Hop 2 Verification (B -> C)
    # The predicted delay from Station B MUST become the previous_delay_minutes for Station C
    assert hop_2.from_station_id == "STN_B"
    assert hop_2.to_station_id == "STN_C"
    assert hop_2.previous_delay_minutes == predicted_delay_at_b

    # Verify ETAs are calculated cleanly without double addition
    assert hop_1.predicted_arrival_eta == t1_arr + timedelta(minutes=hop_1.total_final_delay_minutes)
    assert hop_2.predicted_arrival_eta == t2_arr + timedelta(minutes=hop_2.total_final_delay_minutes)


# ==============================================================================
# TEST 4: Missing Weather Fallback
# ==============================================================================
def test_4_missing_weather_fallback_in_pipeline(pipeline_service: ETAPipelineService):
    """
    TEST 4:
    Missing weather in end-to-end pipeline.
    Expected: Fallback is activated (is_fallback = True), conflict check runs, final ETA correct.
    """
    sched_dept = datetime(2026, 8, 28, 14, 0, 0)
    sched_arr = datetime(2026, 8, 28, 14, 40, 0)
    current_delay = 25.0

    step_res = pipeline_service.process_step(
        train_id="12424",
        train_name="Rajdhani Express",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        from_station_id="STN_A",
        to_station_id="STN_B",
        scheduled_departure_from=sched_dept,
        scheduled_arrival_to=sched_arr,
        previous_delay_minutes=current_delay,
        weather=None,  # Missing weather feed
        register_occupancy_after=False,
    )

    # Assertions on Fallback
    assert step_res.is_fallback is True
    assert "Weather data" in step_res.fallback_reason
    # Under fallback heuristic, predicted delay equals last known accumulated delay
    assert step_res.ml_predicted_delay_minutes == 25.0
    assert step_res.feature_vector is None

    # Total Delay & ETA
    assert step_res.total_final_delay_minutes == 25.0
    assert step_res.predicted_arrival_eta == sched_arr + timedelta(minutes=25.0)


# ==============================================================================
# TEST 5: Multiple Trains with Different Priority Tiers
# ==============================================================================
def test_5_deterministic_priority_precedence_hierarchy(pipeline_service: ETAPipelineService, clear_weather: WeatherInput):
    """
    TEST 5:
    Comprehensive precedence checks across all 4 priority tiers:
    - Tier 1 vs Tier 2 (Tier 1 gets precedence)
    - Tier 2 vs Tier 3 (Tier 2 gets precedence)
    - Tier 3 vs Tier 4 (Tier 3 gets precedence)
    - Equal Tier 2 vs Tier 2 (FIFO tie-breaker)
    """
    sched_dept = datetime(2026, 8, 28, 16, 0, 0)
    sched_arr = datetime(2026, 8, 28, 16, 45, 0)
    engine = pipeline_service.conflict_engine
    section = pipeline_service.graph.get_section("STN_B", "STN_C")

    # 1. Tier 1 vs Tier 2
    engine.clear()
    engine.register_occupancy(
        SectionOccupancy(
            train_id="T_SF_101",
            section_id=section.section_id,
            station_from="STN_B",
            station_to="STN_C",
            entry_time=sched_dept,
            exit_time=sched_arr,
            priority_tier=PriorityTier.TIER_2_SUPERFAST,
        )
    )
    # Higher-priority Tier 1 candidate arrives
    res_t1 = engine.check_and_resolve_conflict(
        candidate_train_id="T_VB_001",
        candidate_train_name="Vande Bharat",
        candidate_priority=PriorityTier.TIER_1_PREMIUM,
        section=section,
        station_from="STN_B",
        station_to="STN_C",
        entry_time=sched_dept + timedelta(minutes=5),
        exit_time=sched_arr + timedelta(minutes=5),
    )
    assert res_t1.has_conflict is True
    assert res_t1.conflict_delay_minutes == 0.0
    assert res_t1.precedence_granted_to == "T_VB_001"

    # 2. Tier 2 vs Tier 3
    engine.clear()
    engine.register_occupancy(
        SectionOccupancy(
            train_id="T_SF_102",
            section_id=section.section_id,
            station_from="STN_B",
            station_to="STN_C",
            entry_time=sched_dept,
            exit_time=sched_arr,
            priority_tier=PriorityTier.TIER_2_SUPERFAST,
        )
    )
    # Lower-priority Tier 3 candidate arrives
    res_t3 = engine.check_and_resolve_conflict(
        candidate_train_id="T_EXP_301",
        candidate_train_name="Express",
        candidate_priority=PriorityTier.TIER_3_EXPRESS,
        section=section,
        station_from="STN_B",
        station_to="STN_C",
        entry_time=sched_dept + timedelta(minutes=5),
        exit_time=sched_arr + timedelta(minutes=5),
    )
    assert res_t3.has_conflict is True
    assert res_t3.conflict_delay_minutes > 0.0
    assert res_t3.precedence_granted_to == "T_SF_102"

    # 3. Tier 3 vs Tier 4
    engine.clear()
    engine.register_occupancy(
        SectionOccupancy(
            train_id="T_EXP_302",
            section_id=section.section_id,
            station_from="STN_B",
            station_to="STN_C",
            entry_time=sched_dept,
            exit_time=sched_arr,
            priority_tier=PriorityTier.TIER_3_EXPRESS,
        )
    )
    # Lower-priority Tier 4 candidate arrives
    res_t4 = engine.check_and_resolve_conflict(
        candidate_train_id="T_FRT_401",
        candidate_train_name="Freight",
        candidate_priority=PriorityTier.TIER_4_FREIGHT_SPECIAL,
        section=section,
        station_from="STN_B",
        station_to="STN_C",
        entry_time=sched_dept + timedelta(minutes=5),
        exit_time=sched_arr + timedelta(minutes=5),
    )
    assert res_t4.has_conflict is True
    assert res_t4.conflict_delay_minutes > 0.0
    assert res_t4.precedence_granted_to == "T_EXP_302"
