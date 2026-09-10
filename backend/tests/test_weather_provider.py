"""
Unit Tests for OpenWeather Current Weather Provider and Cache.
Validates field mapping, cache TTL, fallback handling, and XGBoost integration.
"""

import time
import pytest
from unittest.mock import patch, MagicMock

from app.integrations.weather_provider import OpenWeatherProvider
from app.ml.schemas import WeatherInput, StationInferenceInput, PriorityTier
from app.ml.predictor import predict_delay


@pytest.fixture
def mock_openweather_payload():
    return {
        "coord": {"lon": 80.9462, "lat": 26.8467},
        "weather": [
            {
                "id": 721,
                "main": "Haze",
                "description": "haze",
                "icon": "50d"
            }
        ],
        "main": {
            "temp": 32.5,
            "feels_like": 37.0,
            "pressure": 1008,
            "humidity": 60
        },
        "visibility": 4000,
        "wind": {
            "speed": 3.8
        },
        "clouds": {
            "all": 40
        },
        "rain": {
            "1h": 1.2
        },
        "dt": 1625000000,
        "name": "Lucknow",
        "cod": 200
    }


def test_weather_field_mapping(mock_openweather_payload):
    """Test that OpenWeather payload correctly maps to WeatherInput schema."""
    provider = OpenWeatherProvider(api_key="test_key")
    mapped = provider._map_openweather_payload(mock_openweather_payload)

    assert mapped.avg_temperature == 32.5
    assert mapped.total_precipitation == 1.2
    assert mapped.avg_wind_speed == 3.8
    assert mapped.avg_cloud_cover == 40.0
    assert mapped.is_foggy == 1.0  # Haze / id 721 triggers fog


def test_weather_cache_hit_and_ttl(mock_openweather_payload):
    """Test cache hit logic and TTL expiry behavior."""
    provider = OpenWeatherProvider(api_key="test_key", cache_ttl_seconds=2)

    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_openweather_payload
        mock_get.return_value = mock_resp

        # 1. First fetch (Cache MISS)
        w1 = provider.get_weather(station_code="LJN", lat=26.8467, lon=80.9462)
        assert w1 is not None
        assert mock_get.call_count == 1

        # 2. Immediate second fetch (Cache HIT - no network call)
        w2 = provider.get_weather(station_code="LJN", lat=26.8467, lon=80.9462)
        assert w2 is not None
        assert w1 == w2
        assert mock_get.call_count == 1  # Still 1 call

        # 3. Wait for TTL to expire
        time.sleep(2.1)

        # 4. Third fetch after TTL (Cache MISS - network call triggered)
        w3 = provider.get_weather(station_code="LJN", lat=26.8467, lon=80.9462)
        assert w3 is not None
        assert mock_get.call_count == 2


def test_weather_api_failure_graceful_fallback(mock_openweather_payload):
    """Test that upstream API errors gracefully fall back to stale cache or None without crashing."""
    provider = OpenWeatherProvider(api_key="test_key", cache_ttl_seconds=1)

    with patch("requests.get") as mock_get:
        # First successful call to populate cache
        mock_resp_ok = MagicMock()
        mock_resp_ok.status_code = 200
        mock_resp_ok.json.return_value = mock_openweather_payload
        mock_get.return_value = mock_resp_ok

        w_initial = provider.get_weather(station_code="CNB", lat=26.4542, lon=80.3507)
        assert w_initial is not None

        # Expire cache
        time.sleep(1.1)

        # Subsequent call fails (e.g. HTTP 500 or timeout)
        mock_get.side_effect = Exception("OpenWeather gateway timeout")

        # Provider should fall back to stale cache gracefully without raising exception
        w_stale = provider.get_weather(station_code="CNB", lat=26.4542, lon=80.3507)
        assert w_stale is not None
        assert w_stale.avg_temperature == w_initial.avg_temperature


def test_xgboost_inference_with_mapped_weather(mock_openweather_payload):
    """Test that mapped WeatherInput is accepted by validate_weather_data and runs XGBoost without fallback."""
    provider = OpenWeatherProvider(api_key="test_key")
    weather = provider._map_openweather_payload(mock_openweather_payload)

    inf_input = StationInferenceInput(
        hour_of_day=10,
        current_accumulated_delay=5.0,
        priority_tier=PriorityTier.TIER_1_PREMIUM,
        weather=weather,
        is_origin=False,
    )

    pred = predict_delay(inf_input)
    assert not pred.is_fallback
    assert pred.fallback_reason is None
    assert pred.feature_vector["avg_temperature"] == 32.5
    assert pred.feature_vector["total_precipitation"] == 1.2
