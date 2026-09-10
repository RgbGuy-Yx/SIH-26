"""
OpenWeather Current Weather API Integration with In-Memory TTL Cache.
Maps OpenWeather telemetry to Phase 2 WeatherInput schema for XGBoost inference.
"""

import time
import logging
from typing import Dict, Optional, Tuple, Any
import requests

from app.core.config import settings
from app.ml.schemas import WeatherInput

logger = logging.getLogger("railway.weather")


class OpenWeatherProvider:
    """
    Fetches real-time atmospheric conditions from OpenWeather Current Weather API.
    Features:
    - In-memory TTL cache (10–15 mins) keyed by station and/or geographic coordinates.
    - Rate limit protection and thread-safe cache re-use during simulation ticks.
    - Graceful fallback on upstream API failure or timeout.
    - Detailed logging of cache hits, misses, API fetches, and mapped parameters.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        cache_ttl_seconds: Optional[int] = None,
    ):
        self.api_key = api_key or settings.OPENWEATHER_API_KEY
        self.base_url = (base_url or settings.OPENWEATHER_BASE_URL).rstrip("/")
        self.cache_ttl = cache_ttl_seconds or settings.WEATHER_CACHE_TTL_SECONDS or 900
        # Cache storage: key -> (WeatherInput, expires_at_timestamp, created_at_timestamp)
        self._cache: Dict[str, Tuple[WeatherInput, float, float]] = {}

    def _build_cache_key(
        self,
        station_code: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> str:
        """Construct normalized cache key for station or rounded coordinates (~1km grid)."""
        if station_code and station_code.strip():
            return f"stn:{station_code.strip().upper()}"
        if lat is not None and lon is not None:
            return f"coord:{round(float(lat), 2):.2f},{round(float(lon), 2):.2f}"
        return "default"

    def get_cached_weather(self, cache_key: str) -> Optional[WeatherInput]:
        """Retrieve valid cached weather if unexpired."""
        entry = self._cache.get(cache_key)
        if not entry:
            return None
        weather, expires_at, created_at = entry
        now = time.time()
        if now < expires_at:
            remaining = int(expires_at - now)
            logger.info(
                f"[WeatherCache HIT] Key: {cache_key} | TTL remaining: {remaining}s | "
                f"avg_temp={weather.avg_temperature}°C, total_precipitation={weather.total_precipitation}mm, "
                f"avg_wind_speed={weather.avg_wind_speed}km/h, avg_cloud_cover={weather.avg_cloud_cover}%, "
                f"is_foggy={weather.is_foggy}"
            )
            return weather
        return None

    def get_stale_weather(self, cache_key: str) -> Optional[WeatherInput]:
        """Retrieve last known weather data as a fallback when upstream API is unreachable."""
        entry = self._cache.get(cache_key)
        if entry:
            weather, _, created_at = entry
            age = int(time.time() - created_at)
            logger.warning(
                f"[WeatherCache STALE FALLBACK] Key: {cache_key} | Age: {age}s | Reusing last valid observation."
            )
            return weather
        return None

    def _map_openweather_payload(self, data: Dict[str, Any]) -> WeatherInput:
        """
        Maps OpenWeather API fields to Phase 2 WeatherInput schema:
        temp -> avg_temperature
        rain.1h -> total_precipitation (default 0.0 if missing)
        wind_speed -> avg_wind_speed
        clouds -> avg_cloud_cover
        condition/visibility -> is_foggy
        """
        main = data.get("main", {})
        temp = float(main.get("temp", 25.0))
        # Handle Kelvin if units wasn't metric
        if temp > 150.0:
            temp = temp - 273.15

        # Rain: OpenWeather returns rain.1h or rain.3h
        rain_obj = data.get("rain")
        if isinstance(rain_obj, dict):
            rain_1h = float(rain_obj.get("1h", rain_obj.get("3h", 0.0)))
        else:
            rain_1h = 0.0

        # Wind speed (m/s in metric; map directly or keep in realistic range)
        wind_obj = data.get("wind", {})
        if isinstance(wind_obj, dict):
            wind_speed = float(wind_obj.get("speed", data.get("wind_speed", 0.0)))
        else:
            wind_speed = float(data.get("wind_speed", 0.0))

        # Clouds
        clouds_obj = data.get("clouds", {})
        if isinstance(clouds_obj, dict):
            clouds = float(clouds_obj.get("all", 0.0))
        else:
            clouds = float(data.get("clouds", 0.0))

        # Determine fog indicator
        weather_list = data.get("weather", [])
        first_w = weather_list[0] if weather_list else {}
        main_desc = str(first_w.get("main", "")).lower()
        detail_desc = str(first_w.get("description", "")).lower()
        weather_id = int(first_w.get("id", 800))
        visibility = data.get("visibility")

        is_foggy = 0.0
        if (
            "fog" in main_desc
            or "fog" in detail_desc
            or "mist" in main_desc
            or "mist" in detail_desc
            or "haze" in main_desc
            or "smoke" in main_desc
            or (700 <= weather_id <= 741)
            or (visibility is not None and float(visibility) <= 1000)
        ):
            is_foggy = 1.0

        mapped = WeatherInput(
            is_foggy=is_foggy,
            avg_temperature=round(temp, 2),
            total_precipitation=round(max(0.0, rain_1h), 2),
            avg_wind_speed=round(max(0.0, min(200.0, wind_speed)), 2),
            avg_cloud_cover=round(max(0.0, min(100.0, clouds)), 2),
        )

        logger.info(
            f"[OpenWeather API] Mapped observation: "
            f"temp={temp:.2f}°C -> avg_temperature={mapped.avg_temperature}, "
            f"rain.1h={rain_1h:.2f} -> total_precipitation={mapped.total_precipitation}, "
            f"wind_speed={wind_speed:.2f} -> avg_wind_speed={mapped.avg_wind_speed}, "
            f"clouds={clouds:.1f}% -> avg_cloud_cover={mapped.avg_cloud_cover}, "
            f"is_foggy={mapped.is_foggy}"
        )
        return mapped

    def get_weather(
        self,
        station_code: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> Optional[WeatherInput]:
        """
        Synchronously get weather for a given station and/or coordinates.
        Checks TTL cache first; on miss, calls OpenWeather API and updates cache.
        """
        if lat is None or lon is None:
            # If coordinates are missing, check if station_code can hit cache
            cache_key = self._build_cache_key(station_code=station_code)
            cached = self.get_cached_weather(cache_key)
            if cached:
                return cached
            return None

        cache_key = self._build_cache_key(station_code=station_code, lat=lat, lon=lon)

        # 1. Cache lookup
        cached = self.get_cached_weather(cache_key)
        if cached:
            return cached

        if not self.api_key:
            logger.debug(f"[OpenWeather API] OPENWEATHER_API_KEY not configured. Falling back.")
            return self.get_stale_weather(cache_key)

        # 2. Cache miss: Fetch from OpenWeather Current Weather API
        logger.info(
            f"[WeatherCache MISS] Key: {cache_key} | Fetching live OpenWeather (lat={lat:.4f}, lon={lon:.4f})"
        )

        url = f"{self.base_url}"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": "metric",
        }

        try:
            resp = requests.get(url, params=params, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                weather = self._map_openweather_payload(data)

                # Store in cache
                now = time.time()
                expires_at = now + self.cache_ttl
                self._cache[cache_key] = (weather, expires_at, now)

                # Also cache under secondary key if station_code was provided
                if station_code:
                    stn_key = f"stn:{station_code.strip().upper()}"
                    self._cache[stn_key] = (weather, expires_at, now)
                coord_key = f"coord:{round(float(lat), 2):.2f},{round(float(lon), 2):.2f}"
                self._cache[coord_key] = (weather, expires_at, now)

                return weather
            else:
                logger.warning(
                    f"[OpenWeather API] Upstream returned HTTP {resp.status_code}: {resp.text[:120]}. "
                    f"Attempting graceful fallback."
                )
                return self.get_stale_weather(cache_key)
        except Exception as exc:
            logger.warning(
                f"[OpenWeather API] Request error for {cache_key} (lat={lat}, lon={lon}): {exc}. "
                f"Attempting graceful fallback."
            )
            return self.get_stale_weather(cache_key)


# Global singleton instance
weather_provider = OpenWeatherProvider()
