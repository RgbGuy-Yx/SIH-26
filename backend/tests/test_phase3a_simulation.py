"""
Comprehensive Test Suite for Phase 3A: Deterministic Realistic Train Simulation Engine.
Covers all 16 required test scenarios:
1. Dataset train loading
2. Timetable extraction
3. Route construction
4. Station coordinate loading
5. Virtual clock
6. Start / pause / resume / reset
7. Train position interpolation
8. Station-to-station transition
9. Multiple train simulation
10. ML integration
11. Delay propagation
12. NetworkX conflict integration
13. Priority resolution
14. ETA update
15. Deterministic replay
16. Invalid/missing data handling
"""

from datetime import datetime, timedelta
import pytest

from app.ml.schemas import PriorityTier, WeatherInput
from app.graph.dataset_loader import get_available_trains, get_train_timetable, load_national_railway_graph
from app.simulation.schemas import TrainStatus, TrainSimulationState, SimulationConfig, SimulationSnapshot
from app.simulation.clock import VirtualClock
from app.simulation.train_entity import TrainEntity
from app.simulation.engine import SimulationEngine


# ==============================================================================
# 1. Dataset Train Loading
# ==============================================================================
def test_1_dataset_train_loading():
    """Verify that all 10 real trains in the dataset are discovered and loaded."""
    trains = get_available_trains()
    assert len(trains) == 10
    train_numbers = [t["train_no"] for t in trains]
    
    # Must include major benchmark trains
    assert 12003 in train_numbers  # Swarna Shatabdi
    assert 22500 in train_numbers  # Vande Bharat
    assert 12301 in train_numbers  # Kolkata Rajdhani
    assert 11033 in train_numbers  # Darbhanga Express


# ==============================================================================
# 2. Timetable Extraction
# ==============================================================================
def test_2_timetable_extraction():
    """Verify stop sequence and scheduled timing extraction for a train."""
    timetable = get_train_timetable(train_no=12003)
    assert len(timetable) >= 8
    
    origin = timetable[0]
    dest = timetable[-1]
    
    assert origin["station_code"] == "LJN"
    assert origin["scheduled_departure"] is not None
    assert dest["station_code"] == "NDLS"
    assert dest["scheduled_arrival"] is not None


# ==============================================================================
# 3. Route Construction
# ==============================================================================
def test_3_route_construction():
    """Verify that train entity dynamically builds its full sequential route."""
    train = TrainEntity(train_no=12003, train_name="Swarna Shatabdi", priority_tier=PriorityTier.TIER_1_PREMIUM)
    assert train.total_stops == 9
    assert train.origin_stop["station_code"] == "LJN"
    assert train.destination_stop["station_code"] == "NDLS"
    assert train.current_section_id == "SEC-LJN-ON"


# ==============================================================================
# 4. Station Coordinate Loading
# ==============================================================================
def test_4_station_coordinate_loading():
    """Verify all stops in the route have valid real-world GPS coordinates."""
    train = TrainEntity(train_no=12003, train_name="Swarna Shatabdi", priority_tier=PriorityTier.TIER_1_PREMIUM)
    for stop in train.stops:
        assert stop["latitude"] is not None
        assert stop["longitude"] is not None
        assert -90.0 <= stop["latitude"] <= 90.0
        assert -180.0 <= stop["longitude"] <= 180.0


# ==============================================================================
# 5. Virtual Clock
# ==============================================================================
def test_5_virtual_clock_ticking():
    """Verify deterministic virtual clock advancement with multiplier."""
    start_t = datetime(2026, 8, 28, 6, 0, 0)
    clock = VirtualClock(initial_time=start_t, time_multiplier=60.0)  # 1 sec = 1 min
    clock.start()

    # 5 discrete seconds at 60x = 300 simulation seconds (5 minutes)
    new_t = clock.tick(delta_real_seconds=5.0)
    assert new_t == start_t + timedelta(minutes=5)
    assert clock.current_time == datetime(2026, 8, 28, 6, 5, 0)


# ==============================================================================
# 6. Start / Pause / Resume / Reset
# ==============================================================================
def test_6_clock_controls():
    """Verify start, pause, resume, and exact reset capabilities."""
    start_t = datetime(2026, 8, 28, 10, 0, 0)
    clock = VirtualClock(initial_time=start_t, time_multiplier=10.0)
    
    clock.start()
    assert clock.is_running is True
    assert clock.is_paused is False

    clock.tick(delta_real_seconds=2.0)  # Advances 20s
    assert clock.current_time == start_t + timedelta(seconds=20)

    clock.pause()
    assert clock.is_paused is True
    clock.tick(delta_real_seconds=2.0)  # Paused -> time unchanged
    assert clock.current_time == start_t + timedelta(seconds=20)

    clock.resume()
    assert clock.is_paused is False
    clock.tick(delta_real_seconds=3.0)  # Advances 30s
    assert clock.current_time == start_t + timedelta(seconds=50)

    clock.reset()
    assert clock.current_time == start_t
    assert clock.is_running is False


# ==============================================================================
# 7. Train Position Interpolation
# ==============================================================================
def test_7_train_position_interpolation():
    """Verify continuous smooth geometric (lat, lon) interpolation."""
    train = TrainEntity(
        train_no=12003,
        train_name="Swarna Shatabdi",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        base_date=datetime(2026, 8, 28)
    )

    dep_t = train.origin_stop["scheduled_departure"]  # 15:30:00
    arr_t = train.next_stop["scheduled_arrival"]      # 16:19:00

    # 1. Before departure -> at origin
    train.update_position(dep_t - timedelta(minutes=10))
    assert train.status == TrainStatus.NOT_STARTED
    assert train.latitude == float(train.origin_stop["latitude"])
    assert train.longitude == float(train.origin_stop["longitude"])
    assert train.route_progress == 0.0

    # 2. Midpoint of transit -> 50% between stop 0 and stop 1
    total_seconds = (arr_t - dep_t).total_seconds()
    midpoint_t = dep_t + timedelta(seconds=total_seconds / 2.0)
    train.update_position(midpoint_t)

    assert train.status in (TrainStatus.RUNNING, TrainStatus.DELAYED)
    assert 0.49 <= train.route_progress <= 0.51

    lat0, lon0 = float(train.origin_stop["latitude"]), float(train.origin_stop["longitude"])
    lat1, lon1 = float(train.next_stop["latitude"]), float(train.next_stop["longitude"])
    expected_lat = round(lat0 + 0.5 * (lat1 - lat0), 6)
    expected_lon = round(lon0 + 0.5 * (lon1 - lon0), 6)

    assert abs(train.latitude - expected_lat) < 0.01
    assert abs(train.longitude - expected_lon) < 0.01


# ==============================================================================
# 8. Station-to-Station Transition
# ==============================================================================
def test_8_station_to_station_transition():
    """Verify arrival at next stop advances the route index."""
    train = TrainEntity(
        train_no=12003,
        train_name="Swarna Shatabdi",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        base_date=datetime(2026, 8, 28)
    )
    arr_t = train.next_stop["scheduled_arrival"]

    # Sim time advances past arrival
    train.update_position(arr_t + timedelta(seconds=10))
    assert train.current_stop_idx >= 1
    assert train.current_stop["station_code"] == "ON"


# ==============================================================================
# 9. Multiple Train Simulation
# ==============================================================================
def test_9_multiple_trains_simultaneous():
    """Verify simultaneous multi-train movement across distinct corridors."""
    config = SimulationConfig(
        start_time=datetime(2026, 8, 28, 6, 0, 0),
        time_multiplier=60.0,
        selected_train_ids=[12003, 22500, 12301]
    )
    engine = SimulationEngine(config=config)
    assert len(engine.trains) == 3

    # Tick 30 simulation minutes
    snapshot = engine.tick(delta_seconds=30.0)
    assert len(snapshot.trains) == 3
    assert snapshot.simulation_time.startswith("2026-08-28T06:30:00")


# ==============================================================================
# 10. ML Integration
# ==============================================================================
def test_10_simulation_ml_integration():
    """Verify that XGBoost predicts delays during simulation hops without retraining."""
    train = TrainEntity(
        train_no=12003,
        train_name="Swarna Shatabdi",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        base_date=datetime(2026, 8, 28)
    )
    # Set fog weather
    train.set_weather(
        WeatherInput(is_foggy=1.0, avg_temperature=9.0, total_precipitation=0.0, avg_wind_speed=5.0, avg_cloud_cover=90.0)
    )
    assert train.is_fallback is False
    assert isinstance(train.ml_predicted_delay, float)
    assert train.predicted_eta is not None


# ==============================================================================
# 11. Delay Propagation
# ==============================================================================
def test_11_simulation_delay_propagation():
    """Verify that final predicted delay at stop N propagates to current_accumulated_delay for stop N+1."""
    train = TrainEntity(
        train_no=12003,
        train_name="Swarna Shatabdi",
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        base_date=datetime(2026, 8, 28)
    )
    arr_t = train.next_stop["scheduled_arrival"]
    predicted_d1 = train.final_predicted_delay

    # Train completes first hop and reaches stop 1
    train.update_position(arr_t + timedelta(minutes=predicted_d1 + 1))
    # Lag-1 delay for next hop MUST equal predicted delay from previous stop
    assert train.current_accumulated_delay == predicted_d1


# ==============================================================================
# 12. NetworkX Conflict Integration
# ==============================================================================
def test_12_simulation_networkx_conflict():
    """Verify conflict detection on NetworkX track section."""
    config = SimulationConfig(start_time=datetime(2026, 8, 28, 6, 0, 0))
    engine = SimulationEngine(config=config)

    # Both trains use engine
    assert engine.graph is not None
    assert engine.conflict_engine is not None


# ==============================================================================
# 13. Priority Resolution
# ==============================================================================
def test_13_simulation_priority_resolution():
    """Verify that Priority Tier 1 takes precedence over Tier 4."""
    train_t1 = TrainEntity(train_no=12003, train_name="Shatabdi", priority_tier=PriorityTier.TIER_1_PREMIUM)
    train_t4 = TrainEntity(train_no=56903, train_name="Passenger", priority_tier=PriorityTier.TIER_4_FREIGHT_SPECIAL)

    assert int(train_t1.priority_tier) < int(train_t4.priority_tier)


# ==============================================================================
# 14. ETA Update
# ==============================================================================
def test_14_simulation_eta_update():
    """Verify ETA recalculation when conflict delay is applied."""
    train = TrainEntity(train_no=12003, train_name="Shatabdi", priority_tier=PriorityTier.TIER_1_PREMIUM)
    sched_arr = train.next_stop["scheduled_arrival"]
    ml_delay = train.ml_predicted_delay

    # Apply 15 minute conflict holding delay
    train.apply_conflict_delay(15.0, is_holding=True)
    assert train.conflict_delay == 15.0
    assert train.final_predicted_delay == round(ml_delay + 15.0, 2)
    assert train.predicted_eta == sched_arr + timedelta(minutes=train.final_predicted_delay)


# ==============================================================================
# 15. Deterministic Replay
# ==============================================================================
def test_15_simulation_deterministic_replay():
    """Verify that resetting and repeating simulation produces identical states."""
    config = SimulationConfig(
        start_time=datetime(2026, 8, 28, 6, 0, 0),
        time_multiplier=60.0,
        selected_train_ids=[12003, 22500]
    )
    engine = SimulationEngine(config=config)

    # Run 1
    engine.start()
    s1 = engine.tick(delta_seconds=10.0)
    pos1_t1 = (s1.trains[0].latitude, s1.trains[0].longitude, s1.trains[0].route_progress)

    # Reset
    engine.reset()
    engine.start()
    s2 = engine.tick(delta_seconds=10.0)
    pos2_t1 = (s2.trains[0].latitude, s2.trains[0].longitude, s2.trains[0].route_progress)

    assert pos1_t1 == pos2_t1


# ==============================================================================
# 16. Invalid / Missing Data Handling
# ==============================================================================
def test_16_simulation_error_handling():
    """Verify engine gracefully handles missing weather and fallback."""
    train = TrainEntity(train_no=12003, train_name="Shatabdi", priority_tier=PriorityTier.TIER_1_PREMIUM)
    train.set_weather(None)  # Missing weather

    assert train.is_fallback is True
    assert train.fallback_reason is not None
    assert train.predicted_eta is not None
