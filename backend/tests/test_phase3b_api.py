"""
Phase 3B Test Suite: REST API, WebSockets, Live Train Status, Caching & Resilience.
20 Automated Verification Tests.
"""

import asyncio
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.simulation_service import simulation_service
from app.services.cache_service import cache_service
from app.integrations.live_provider import (
    MockLiveProvider,
    RailRadarProvider,
    RailKitProvider,
    LiveStatusResponse,
    get_live_provider,
)
from app.core.config import settings


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_01_health_endpoint(client):
    """Test 1: GET /api/health returns system health and status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "data_mode" in data


def test_02_system_data_mode_endpoint(client):
    """Test 2: GET /api/system/data-mode returns mode information."""
    response = client.get("/api/system/data-mode")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == settings.DATA_MODE
    assert "provider" in data


def test_03_simulation_start(client):
    """Test 3: POST /api/simulation/start starts simulation clock."""
    response = client.post("/api/simulation/start")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "started"
    assert data["is_running"] is True


def test_04_simulation_pause(client):
    """Test 4: POST /api/simulation/pause pauses simulation clock."""
    response = client.post("/api/simulation/pause")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "paused"
    assert data["is_paused"] is True


def test_05_simulation_resume(client):
    """Test 5: POST /api/simulation/resume resumes paused simulation."""
    response = client.post("/api/simulation/resume")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "resumed"
    assert data["is_paused"] is False


def test_06_simulation_speed(client):
    """Test 6: POST /api/simulation/speed updates time multiplier."""
    response = client.post("/api/simulation/speed", json={"speed": 10.0})
    assert response.status_code == 200
    data = response.json()
    assert data["time_multiplier"] == 10.0


def test_07_simulation_step(client):
    """Test 7: POST /api/simulation/step advances clock and returns snapshot."""
    response = client.post("/api/simulation/step", json={"delta_seconds": 30.0})
    assert response.status_code == 200
    data = response.json()
    assert "simulation_time" in data
    assert "trains" in data
    assert len(data["trains"]) > 0


def test_08_simulation_reset(client):
    """Test 8: POST /api/simulation/reset deterministically resets clock and entities."""
    response = client.post("/api/simulation/reset", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reset"
    assert data["is_running"] is False


def test_09_simulation_state(client):
    """Test 9: GET /api/simulation/state returns complete network snapshot."""
    response = client.get("/api/simulation/state")
    assert response.status_code == 200
    data = response.json()
    assert "simulation_time" in data
    assert "trains" in data
    assert "active_conflicts" in data
    assert isinstance(data["trains"], list)


def test_10_get_all_trains(client):
    """Test 10: GET /api/trains returns list of active trains."""
    response = client.get("/api/trains")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "train_no" in data[0]
    assert "train_name" in data[0]
    assert "route_progress" in data[0]


def test_11_get_single_train_found(client):
    """Test 11: GET /api/trains/{trainNo} returns detailed state."""
    response = client.get("/api/trains/12003")
    assert response.status_code == 200
    data = response.json()
    assert data["train_no"] == 12003
    assert "latitude" in data
    assert "longitude" in data
    assert "priority_tier" in data


def test_12_get_single_train_not_found(client):
    """Test 12: GET /api/trains/{invalid} returns 404."""
    response = client.get("/api/trains/99999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_13_get_train_eta(client):
    """Test 13: GET /api/trains/{trainNo}/eta returns ETA forecasts and ML delay."""
    response = client.get("/api/trains/12003/eta")
    assert response.status_code == 200
    data = response.json()
    assert data["train_no"] == 12003
    assert "ml_delay_prediction" in data
    assert "scheduled_arrival_next" in data
    assert "estimated_arrival_next" in data


def test_14_get_train_conflicts(client):
    """Test 14: GET /api/trains/{trainNo}/conflicts returns conflict array."""
    response = client.get("/api/trains/12003/conflicts")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_15_get_train_live_status(client):
    """Test 15: GET /api/trains/{trainNo}/live-status returns both live & sim state."""
    response = client.get("/api/trains/12003/live-status")
    assert response.status_code == 200
    data = response.json()
    assert data["train_no"] == 12003
    assert "live_status" in data
    assert "simulation_state" in data
    assert data["live_status"]["train_no"] == 12003


@pytest.mark.asyncio
async def test_16_cache_hit_behavior():
    """Test 16: Cache service returns cached response within TTL."""
    call_count = 0

    async def fetcher():
        nonlocal call_count
        call_count += 1
        return {"value": "cached_data", "count": call_count}

    key = "test_cache_hit"
    res1 = await cache_service.get_or_set(key, fetcher, ttl_seconds=10)
    assert res1["count"] == 1
    assert call_count == 1

    # Second call within TTL should return cached object without incrementing count
    res2 = await cache_service.get_or_set(key, fetcher, ttl_seconds=10)
    assert res2["count"] == 1
    assert call_count == 1


@pytest.mark.asyncio
async def test_17_request_deduplication_coalescing():
    """Test 17: Concurrent in-flight requests coalesce into a single fetch execution."""
    fetch_count = 0

    async def slow_fetcher():
        nonlocal fetch_count
        fetch_count += 1
        await asyncio.sleep(0.05)
        return {"data": "coalesced", "fetch_id": fetch_count}

    key = "test_coalesce_key"
    # Launch 5 concurrent requests
    results = await asyncio.gather(
        cache_service.get_or_set(key, slow_fetcher, ttl_seconds=5),
        cache_service.get_or_set(key, slow_fetcher, ttl_seconds=5),
        cache_service.get_or_set(key, slow_fetcher, ttl_seconds=5),
        cache_service.get_or_set(key, slow_fetcher, ttl_seconds=5),
        cache_service.get_or_set(key, slow_fetcher, ttl_seconds=5),
    )

    assert fetch_count == 1
    for r in results:
        assert r["fetch_id"] == 1


@pytest.mark.asyncio
async def test_18_stale_fallback_on_api_error():
    """Test 18: On provider network failure, returns fallback error response."""
    provider = RailRadarProvider(api_key="invalid_test_key")

    with patch("httpx.AsyncClient.get", side_effect=Exception("Connection refused")):
        res = await provider.get_live_train_status(12003)
        assert res.is_live is False
        assert res.error is not None
        assert "Connection refused" in res.error


def test_19_websocket_telemetry_stream(client):
    """Test 19: WebSocket connection handshake (full snapshot), ping-pong, and snapshot requests."""
    with client.websocket_connect("/ws") as websocket:
        # 1. Initial connection automatically delivers full state snapshot
        initial_msg = websocket.receive_json()
        assert initial_msg["type"] == "full_snapshot"
        assert "data" in initial_msg
        assert "trains" in initial_msg["data"]
        assert len(initial_msg["data"]["trains"]) > 0

        # 2. Ping-Pong Heartbeat exchange
        websocket.send_text("ping")
        pong = websocket.receive_text()
        assert pong == "pong"

        # 3. Explicit full snapshot request
        websocket.send_text("request_full_snapshot")
        req_msg = websocket.receive_json()
        assert req_msg["type"] == "full_snapshot"
        assert "data" in req_msg
        assert req_msg["data"]["simulation_time"] is not None



def test_20_decoupled_integrity(client):
    """Test 20: External live fetch failure never halts continuous simulation clock."""
    sim_state_before = client.get("/api/simulation/state").json()
    
    # Trigger live fetch for train 12003
    live_resp = client.get("/api/trains/12003/live-status")
    assert live_resp.status_code == 200

    # Advance simulation step
    step_resp = client.post("/api/simulation/step", json={"delta_seconds": 60.0})
    assert step_resp.status_code == 200
    step_data = step_resp.json()

    # Verify simulation progressed uninterrupted
    assert step_data["simulation_time"] != sim_state_before["simulation_time"]


@pytest.mark.asyncio
async def test_railradar_exact_payload_parsing():
    """Test parsing of the official RailRadar live train running status response."""
    sample_payload = {
        "success": True,
        "data": {
            "trainNumber": "12919",
            "trainName": "Malwa SF Express",
            "startDate": "2026-06-22",
            "lastUpdatedAt": "2026-06-22T07:14:00+05:30",
            "status": "running",
            "delayMinutes": 12,
            "currentLocation": {
                "stationCode": "UJN",
                "sequence": 2,
                "status": "departed",
                "isHalt": True,
                "segmentProgress": 0.45,
                "speedKmh": 65.5,
                "bearingDegrees": 180
            },
            "previousHalt": {"stationCode": "INDB", "stationName": "Indore Junction", "sequence": 1, "distance": 0},
            "nextHalt": {"stationCode": "UJN", "stationName": "Ujjain Junction", "sequence": 2, "distance": 55},
            "exceptions": [{"type": "DIVERTED", "message": "Train is diverted"}],
            "route": [
                {"sequence": 1, "stationCode": "INDB", "stationName": "Indore Junction", "lat": 22.72, "lng": 75.86},
                {"sequence": 2, "stationCode": "UJN", "stationName": "Ujjain Junction", "lat": 23.17, "lng": 75.78}
            ],
            "isLive": True
        }
    }

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = sample_payload

    provider = RailRadarProvider(api_key="rr_live_test_key")
    with patch("httpx.AsyncClient.get", return_value=mock_response):
        res = await provider.get_live_train_status(12919)
        assert res.success is True
        assert res.train_no == 12919
        assert res.train_name == "Malwa SF Express"
        assert res.current_station == "UJN"
        assert res.next_station == "UJN"
        assert res.delay_minutes == 12.0
        assert res.segment_progress == 0.45
        assert res.speed_kmh == 65.5
        assert res.bearing_degrees == 180.0
        # Verify interpolated coordinates (between INDB and UJN with progress 0.45)
        assert res.latitude is not None
        assert round(res.latitude, 2) == 22.92
        assert res.exceptions is not None


@pytest.mark.asyncio
async def test_railradar_error_envelope_parsing():
    """Test parsing of the official RailRadar error response envelope (404 / NOT_FOUND)."""
    error_payload = {
        "success": False,
        "error": {
            "code": "NOT_FOUND",
            "message": "Resource not found (e.g. Train 12919 not found on journey date 2026-06-22)"
        },
        "meta": {
            "traceId": "9772f1c9-6ec6-4d9f-b269-a5210f33ec73",
            "timestamp": "2026-06-22T08:14:00+05:30",
            "executionTime": 5,
            "source": "database"
        }
    }

    mock_response = AsyncMock()
    mock_response.status_code = 404
    mock_response.json.return_value = error_payload
    mock_response.text = str(error_payload)

    provider = RailRadarProvider(api_key="rr_live_test_key")
    with patch("httpx.AsyncClient.get", return_value=mock_response):
        res = await provider.get_live_train_status(12919)
        assert res.success is False
        assert res.is_live is False
        assert res.error_code == "NOT_FOUND"
        assert "NOT_FOUND" in res.error
        assert "Resource not found" in res.error


