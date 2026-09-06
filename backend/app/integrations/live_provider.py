"""
Live Train Status Provider Adapters.
Phase 3B: Live Train Verification Adapter Supporting RailRadar (https://railradar.in/docs) and RailKit.
Parses both success and structured JSON error envelopes (404 NOT_FOUND, 400 BAD_REQUEST, 429 RATE_LIMITED).
"""

import os
import time
import json
from pathlib import Path
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import httpx
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)


class LiveTrainStatus(BaseModel):
    """
    Normalized response schema for live train status verification.
    Strictly separated from internal simulation state.
    """
    success: bool = Field(..., description="Whether live query succeeded")
    source: str = Field(..., description="Provider source name ('RailRadar', 'RailKit', 'Mock')")
    train_no: int = Field(..., description="Train number")
    train_name: Optional[str] = Field(None, description="Official train name")
    current_station: str = Field(..., description="Current or last passed station code")
    next_station: Optional[str] = Field(None, description="Upcoming halt station code")
    delay_minutes: float = Field(default=0.0, description="Observed real-world delay in minutes")
    segment_progress: float = Field(default=0.0, ge=0.0, le=1.0, description="Progress between stations [0, 1]")
    speed_kmh: float = Field(default=0.0, ge=0.0, description="Current GPS/speed estimate in km/h")
    bearing_degrees: Optional[float] = Field(default=None, description="Current heading bearing in degrees")
    latitude: Optional[float] = Field(None, description="Live GPS latitude if available")
    longitude: Optional[float] = Field(None, description="Live GPS longitude if available")
    last_updated: str = Field(..., description="ISO timestamp of live observation")
    is_live: bool = Field(default=True, description="True if data is fresh live observation")
    is_stale: bool = Field(default=False, description="True if returning stale cached fallback")
    error_code: Optional[str] = Field(default=None, description="Standard error code from provider (e.g. 'NOT_FOUND', 'BAD_REQUEST', 'RATE_LIMITED')")
    error: Optional[str] = Field(default=None, description="Error message if query failed")
    exceptions: Optional[List[Dict[str, Any]]] = Field(default=None, description="Diversions, rescheduling or cancellation alerts")
    raw_data: Optional[Dict[str, Any]] = Field(default=None, description="Raw provider payload if needed")


# Alias for backward compatibility
LiveStatusResponse = LiveTrainStatus


class TrainRouteCache:
    """
    24-hour in-memory and persistent disk cache for static train route GeoJSON.
    Eliminates repetitive downloading of 2MB+ LineString coordinates from RailRadar API.
    """
    TTL_SECONDS = 24 * 3600  # 24 Hours

    def __init__(self, cache_dir: Optional[Path] = None):
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        if cache_dir is None:
            self.cache_dir = Path(__file__).resolve().parents[2] / ".cache" / "train_routes"
        else:
            self.cache_dir = cache_dir

        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not initialize disk cache directory at {self.cache_dir}: {e}")

    def _get_key(self, train_no: int, stops: bool = True) -> str:
        return f"{train_no}_{'stops' if stops else 'nostops'}"

    def get(self, train_no: int, stops: bool = True, ignore_expiry: bool = False) -> Optional[Dict[str, Any]]:
        key = self._get_key(train_no, stops)
        now = time.time()

        # 1. Check in-memory cache
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            age = now - entry["timestamp"]
            if ignore_expiry or age < self.TTL_SECONDS:
                logger.info(f"[CACHE HIT - MEMORY] Route GeoJSON for #{train_no} (age: {age / 3600:.1f}h / 24h TTL)")
                return entry["payload"]

        # 2. Check persistent disk cache
        disk_file = self.cache_dir / f"{key}.json"
        if disk_file.exists():
            try:
                mtime = disk_file.stat().st_mtime
                age = now - mtime
                if ignore_expiry or age < self.TTL_SECONDS:
                    with open(disk_file, "r", encoding="utf-8") as f:
                        payload = json.load(f)
                    self._memory_cache[key] = {"timestamp": mtime, "payload": payload}
                    logger.info(f"[CACHE HIT - DISK] Route GeoJSON for #{train_no} loaded from {disk_file.name} (age: {age / 3600:.1f}h)")
                    return payload
            except Exception as e:
                logger.warning(f"Failed to read route disk cache for train {train_no}: {e}")

        return None

    def set(self, train_no: int, payload: Dict[str, Any], stops: bool = True) -> None:
        if not isinstance(payload, dict) or not payload.get("success"):
            return

        key = self._get_key(train_no, stops)
        now = time.time()

        # Save to memory cache
        self._memory_cache[key] = {"timestamp": now, "payload": payload}

        # Persist to disk
        try:
            disk_file = self.cache_dir / f"{key}.json"
            with open(disk_file, "w", encoding="utf-8") as f:
                json.dump(payload, f)
            size_kb = disk_file.stat().st_size / 1024
            logger.info(f"[CACHE STORE] Cached 24-hr route GeoJSON for train {train_no} ({size_kb:.1f} KB written to {disk_file.name})")
        except Exception as e:
            logger.warning(f"Failed to persist route disk cache for train {train_no}: {e}")

    def clear(self, train_no: Optional[int] = None) -> None:
        if train_no is not None:
            for k in [self._get_key(train_no, True), self._get_key(train_no, False)]:
                self._memory_cache.pop(k, None)
                f = self.cache_dir / f"{k}.json"
                if f.exists():
                    try:
                        f.unlink()
                    except Exception:
                        pass
        else:
            self._memory_cache.clear()


# Global Singleton Route Cache
route_cache = TrainRouteCache()


class LiveTrainProvider(ABC):
    """Abstract interface for external live train status providers."""

    @abstractmethod
    async def get_live_train_status(self, train_no: int) -> LiveTrainStatus:
        """Fetch and normalize real-time live running status for a train."""
        pass

    async def get_train_route(self, train_no: int, stops: bool = True, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetch official train track route geometry & stations."""
        return {"success": False, "error": "Not implemented for provider"}

    async def get_live_status(self, train_no: int) -> LiveTrainStatus:
        """Convenience alias for get_live_train_status."""
        return await self.get_live_train_status(train_no)


class RailRadarProvider(LiveTrainProvider):
    """
    Official Adapter for RailRadar REST API (https://railradar.in/docs).
    
    API Specifications:
      - Base URL: https://api.railradar.in/v1
      - Live Train Endpoint: GET /v1/trains/{number}/live
      - Train Route Endpoint: GET /v1/trains/{number}/route?stops=true
      - Auth Headers: Authorization: Bearer <key>  or  x-api-key: <key>
      - Parameters:
          * date: optional YYYY-MM-DD
          * authoritative: bool (bypass cache)
          * includeCoordinates: bool (GPS coordinates in route stops)
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self._explicit_api_key = api_key
        raw_url = (base_url or os.environ.get("RAILRADAR_BASE_URL", settings.RAILRADAR_BASE_URL)).rstrip("/")
        if not raw_url.endswith("/v1"):
            raw_url = f"{raw_url}/v1"
        self.base_url = raw_url

    async def get_train_route(self, train_no: int, stops: bool = True, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetch official train track GIS geometry & stops from RailRadar:
        GET https://api.railradar.in/v1/trains/{number}/route?stops=true

        Cached for 24 hours in-memory and on disk to eliminate redundant 2MB LineString downloads.
        """
        # 1. Check 24-hour cache first
        if not force_refresh:
            cached = route_cache.get(train_no, stops=stops)
            if cached is not None:
                return cached

        # 2. Cache miss or forced refresh: query external RailRadar endpoint
        current_key = self.api_key
        url = f"{self.base_url}/trains/{train_no}/route"
        headers = {
            "Accept": "application/json",
            "User-Agent": "RailwayIntelligenceEngine/1.0",
        }
        if current_key:
            headers["Authorization"] = f"Bearer {current_key}" if not current_key.startswith("Bearer ") else current_key
            headers["x-api-key"] = current_key

        params = {}
        if stops:
            params["stops"] = "true"

        try:
            logger.info(f"[CACHE MISS] Fetching 2MB route GeoJSON from RailRadar for train #{train_no}...")
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict) and data.get("success"):
                        route_cache.set(train_no, data, stops=stops)
                    return data
                else:
                    logger.warning(f"RailRadar route query for train {train_no} returned {response.status_code}: {response.text}")
                    stale = route_cache.get(train_no, stops=stops, ignore_expiry=True)
                    if stale is not None:
                        logger.info(f"[STALE CACHE FALLBACK] Serving stale route cache for #{train_no} after HTTP {response.status_code}")
                        return stale
                    return {"success": False, "error": f"HTTP {response.status_code}", "detail": response.text}
        except Exception as e:
            logger.error(f"Failed to fetch route for train {train_no}: {e}")
            stale = route_cache.get(train_no, stops=stops, ignore_expiry=True)
            if stale is not None:
                logger.info(f"[STALE CACHE FALLBACK] Serving stale route cache for #{train_no} after exception")
                return stale
            return {"success": False, "error": str(e)}

    @property
    def api_key(self) -> Optional[str]:
        """Dynamically read API key from environment variable or explicit config."""
        key = self._explicit_api_key or os.environ.get("RAILRADAR_API_KEY") or settings.RAILRADAR_API_KEY
        if not key:
            try:
                from dotenv import dotenv_values
                from pathlib import Path
                env_path = Path(__file__).resolve().parents[2] / ".env"
                if env_path.exists():
                    env_dict = dotenv_values(env_path)
                    key = env_dict.get("RAILRADAR_API_KEY")
            except Exception:
                pass
        return key

    async def get_live_train_status(
        self,
        train_no: int,
        journey_date: Optional[str] = None,
        authoritative: bool = False,
        include_coordinates: bool = True
    ) -> LiveTrainStatus:
        current_key = self.api_key
        if not current_key or current_key.strip() == "":
            return LiveTrainStatus(
                success=False,
                source="RailRadar",
                train_no=train_no,
                current_station="UNKNOWN",
                delay_minutes=0.0,
                last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                is_live=False,
                error_code="UNCONFIGURED_API_KEY",
                error="RAILRADAR_API_KEY environment variable is not set. Please set RAILRADAR_API_KEY in your environment or .env file."
            )

        url = f"{self.base_url}/trains/{train_no}/live"
        headers = {
            "Authorization": f"Bearer {current_key}" if not current_key.startswith("Bearer ") else current_key,
            "x-api-key": current_key,
            "Accept": "application/json",
            "User-Agent": "RailwayIntelligenceEngine/1.0",
        }
        params: Dict[str, Any] = {
            "includeCoordinates": "true" if include_coordinates else "false"
        }
        if journey_date:
            params["date"] = journey_date
        if authoritative:
            params["authoritative"] = "true"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, headers=headers, params=params)

                # Try parsing JSON body (works for both 200 OK and error envelopes)
                try:
                    json_body = response.json()
                except Exception:
                    json_body = {}

                # Check for RailRadar structured error envelope: {"success": false, "error": {"code": "...", "message": "..."}}
                if isinstance(json_body, dict) and json_body.get("success") is False:
                    error_obj = json_body.get("error", {})
                    if isinstance(error_obj, dict):
                        err_code = error_obj.get("code", "ERROR")
                        err_msg = error_obj.get("message", response.text)
                    else:
                        err_code = "ERROR"
                        err_msg = str(error_obj) if error_obj else response.text

                    logger.warning(f"[RailRadar Error Envelope] Train {train_no}: {err_code} - {err_msg}")
                    return LiveTrainStatus(
                        success=False,
                        source="RailRadar",
                        train_no=train_no,
                        current_station="UNKNOWN",
                        delay_minutes=0.0,
                        last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                        is_live=False,
                        error_code=err_code,
                        error=f"[{err_code}] {err_msg}",
                        raw_data=json_body
                    )

                if response.status_code != 200:
                    return LiveTrainStatus(
                        success=False,
                        source="RailRadar",
                        train_no=train_no,
                        current_station="UNKNOWN",
                        delay_minutes=0.0,
                        last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                        is_live=False,
                        error_code=f"HTTP_{response.status_code}",
                        error=f"RailRadar API error: HTTP {response.status_code} - {response.text}",
                        raw_data={"status_code": response.status_code, "text": response.text}
                    )

                # Parse successful response envelope: {"success": true, "data": {...}, "meta": {...}}
                data = json_body.get("data", json_body) if isinstance(json_body, dict) else {}

                train_name = data.get("trainName") or (data.get("train", {}).get("name") if isinstance(data.get("train"), dict) else None)
                
                # Extract current location telemetry
                cur_loc = data.get("currentLocation", {})
                current_station = "UNKNOWN"
                if isinstance(cur_loc, dict) and "stationCode" in cur_loc:
                    current_station = str(cur_loc["stationCode"])
                elif "current_station" in data:
                    c_st = data["current_station"]
                    current_station = c_st.get("code", "UNKNOWN") if isinstance(c_st, dict) else str(c_st)
                
                # Extract next halt station
                next_station = None
                next_halt = data.get("nextHalt", {})
                if isinstance(next_halt, dict) and "stationCode" in next_halt:
                    next_station = str(next_halt["stationCode"])
                elif "next_station" in data:
                    n_st = data["next_station"]
                    next_station = n_st.get("code") if isinstance(n_st, dict) else str(n_st)

                # Delay minutes
                delay = float(data.get("delayMinutes", data.get("delay", 0.0)) or 0.0)

                # Segment progress and speed
                segment_progress = 0.0
                speed_kmh = 0.0
                bearing_degrees = None
                if isinstance(cur_loc, dict):
                    segment_progress = float(cur_loc.get("segmentProgress", 0.0) or 0.0)
                    speed_kmh = float(cur_loc.get("speedKmh", cur_loc.get("speed", 0.0)) or 0.0)
                    if "bearingDegrees" in cur_loc and cur_loc["bearingDegrees"] is not None:
                        bearing_degrees = float(cur_loc["bearingDegrees"])

                # GPS Coordinates extraction & route-based interpolation
                lat = None
                lon = None
                if isinstance(cur_loc, dict):
                    lat = cur_loc.get("lat") or cur_loc.get("latitude")
                    lon = cur_loc.get("lng") or cur_loc.get("lon") or cur_loc.get("longitude")
                    if (lat is None or lon is None) and isinstance(cur_loc.get("coordinates"), dict):
                        lat = cur_loc["coordinates"].get("lat")
                        lon = cur_loc["coordinates"].get("lng")

                # If coordinates not explicitly in currentLocation, extract or interpolate from route array
                route_stops = data.get("route", [])
                if (lat is None or lon is None) and isinstance(route_stops, list) and len(route_stops) > 0:
                    prev_h = data.get("previousHalt", {})
                    next_h = data.get("nextHalt", {})
                    prev_code = prev_h.get("stationCode") if isinstance(prev_h, dict) else None
                    next_code = next_h.get("stationCode") if isinstance(next_h, dict) else None

                    prev_match = next((s for s in route_stops if isinstance(s, dict) and s.get("stationCode") == prev_code), None)
                    next_match = next((s for s in route_stops if isinstance(s, dict) and s.get("stationCode") == next_code), None)

                    if prev_match and next_match and prev_match.get("lat") and next_match.get("lat"):
                        p_lat, p_lon = float(prev_match["lat"]), float(prev_match["lng"])
                        n_lat, n_lon = float(next_match["lat"]), float(next_match["lng"])
                        lat = p_lat + segment_progress * (n_lat - p_lat)
                        lon = p_lon + segment_progress * (n_lon - p_lon)
                    else:
                        cur_match = next((s for s in route_stops if isinstance(s, dict) and s.get("stationCode") == current_station), None)
                        if cur_match and cur_match.get("lat"):
                            lat = float(cur_match["lat"])
                            lon = float(cur_match["lng"])

                last_updated = data.get("lastUpdatedAt") or data.get("last_updated") or datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                exceptions = data.get("exceptions")

                # Fetch official train track GIS geometry & stops from RailRadar Route API:
                # GET https://api.railradar.in/v1/trains/{number}/route?stops=true
                try:
                    route_payload = await self.get_train_route(train_no, stops=True)
                    if isinstance(route_payload, dict) and route_payload.get("success"):
                        r_data = route_payload.get("data", {})
                        if "geojson" in r_data:
                            data["route_geojson"] = r_data["geojson"]
                        if "stops" in r_data:
                            data["route_stops"] = r_data["stops"]
                            # If lat or lon not yet resolved, snap to current station in route stops
                            if (lat is None or lon is None) and current_station != "UNKNOWN":
                                st_match = next((s for s in r_data["stops"] if isinstance(s, dict) and s.get("code") == current_station), None)
                                if st_match and st_match.get("lat") and st_match.get("lng"):
                                    lat = float(st_match["lat"])
                                    lon = float(st_match["lng"])
                except Exception as route_err:
                    logger.warning(f"Could not append RailRadar route geometry for train {train_no}: {route_err}")

                return LiveTrainStatus(
                    success=True,
                    source="RailRadar",
                    train_no=train_no,
                    train_name=train_name,
                    current_station=current_station,
                    next_station=next_station,
                    delay_minutes=delay,
                    segment_progress=segment_progress,
                    speed_kmh=speed_kmh,
                    bearing_degrees=bearing_degrees,
                    latitude=float(lat) if lat is not None else None,
                    longitude=float(lon) if lon is not None else None,
                    last_updated=str(last_updated),
                    is_live=True,
                    is_stale=False,
                    error=None,
                    exceptions=exceptions if isinstance(exceptions, list) else None,
                    raw_data=data
                )

        except httpx.TimeoutException:
            logger.error(f"[RailRadar Timeout] Request timed out for train {train_no}")
            return LiveTrainStatus(
                success=False,
                source="RailRadar",
                train_no=train_no,
                current_station="UNKNOWN",
                delay_minutes=0.0,
                last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                is_live=False,
                error_code="TIMEOUT",
                error="RailRadar API request timed out."
            )
        except Exception as exc:
            logger.error(f"[RailRadar Error] Failed to fetch live status: {exc}")
            return LiveTrainStatus(
                success=False,
                source="RailRadar",
                train_no=train_no,
                current_station="UNKNOWN",
                delay_minutes=0.0,
                last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                is_live=False,
                error_code="CONNECTION_ERROR",
                error=f"RailRadar connection error: {str(exc)}"
            )


class RailKitProvider(LiveTrainProvider):
    """
    Adapter for RailKit API (https://railkit.in/docs).
    Endpoints: GET /api/trackTrain/{number}/today
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self._explicit_api_key = api_key
        self.base_url = (base_url or os.environ.get("RAILKIT_BASE_URL", settings.RAILKIT_BASE_URL)).rstrip("/")

    @property
    def api_key(self) -> Optional[str]:
        return self._explicit_api_key or os.environ.get("RAILKIT_API_KEY") or settings.RAILKIT_API_KEY

    async def get_live_train_status(self, train_no: int) -> LiveTrainStatus:
        current_key = self.api_key
        if not current_key or current_key.strip() == "":
            return LiveTrainStatus(
                success=False,
                source="RailKit",
                train_no=train_no,
                current_station="UNKNOWN",
                delay_minutes=0.0,
                last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                is_live=False,
                error_code="UNCONFIGURED_API_KEY",
                error="RAILKIT_API_KEY environment variable is not set."
            )

        url = f"{self.base_url}/api/trackTrain/{train_no}/today"
        headers = {"x-api-key": current_key, "Accept": "application/json"}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 429:
                    return LiveTrainStatus(
                        success=False,
                        source="RailKit",
                        train_no=train_no,
                        current_station="UNKNOWN",
                        delay_minutes=0.0,
                        last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                        is_live=False,
                        error_code="RATE_LIMITED",
                        error="RailKit API rate limit exceeded (HTTP 429)."
                    )

                if response.status_code != 200:
                    return LiveTrainStatus(
                        success=False,
                        source="RailKit",
                        train_no=train_no,
                        current_station="UNKNOWN",
                        delay_minutes=0.0,
                        last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                        is_live=False,
                        error_code=f"HTTP_{response.status_code}",
                        error=f"RailKit API error: HTTP {response.status_code}"
                    )

                data = response.json()
                train_data = data.get("data", data)
                return LiveTrainStatus(
                    success=True,
                    source="RailKit",
                    train_no=train_no,
                    train_name=train_data.get("trainName"),
                    current_station=train_data.get("currentStationCode", "UNKNOWN"),
                    next_station=train_data.get("nextStationCode"),
                    delay_minutes=float(train_data.get("delay", 0.0) or 0.0),
                    segment_progress=float(train_data.get("progress", 0.0) or 0.0),
                    speed_kmh=float(train_data.get("speed", 0.0) or 0.0),
                    latitude=float(train_data["lat"]) if "lat" in train_data and train_data["lat"] is not None else None,
                    longitude=float(train_data["lon"]) if "lon" in train_data and train_data["lon"] is not None else None,
                    last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                    is_live=True,
                    is_stale=False,
                    error=None
                )
        except Exception as exc:
            return LiveTrainStatus(
                success=False,
                source="RailKit",
                train_no=train_no,
                current_station="UNKNOWN",
                delay_minutes=0.0,
                last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                is_live=False,
                error_code="CONNECTION_ERROR",
                error=f"RailKit connection error: {str(exc)}"
            )


class MockLiveProvider(LiveTrainProvider):
    """
    Explicit Mock Live Provider for isolated test mocks.
    """

    MOCK_TRAIN_PROFILES = {
        12003: {"name": "NDLS SWARNA SHATABDI", "station": "ON", "next": "CNB", "delay": 8.0, "speed": 95.0, "lat": 26.5483, "lon": 80.4862, "bearing": 115.0},
        22500: {"name": "VANDE BHARAT EX", "station": "DDU", "next": "SSM", "delay": 2.0, "speed": 115.0, "lat": 25.2818, "lon": 83.1189, "bearing": 98.0},
        12301: {"name": "KOLKATA RAJDHNI", "station": "HWH", "next": "ASN", "delay": 14.0, "speed": 80.0, "lat": 22.5841, "lon": 88.3410, "bearing": 310.0},
        11033: {"name": "DARBHANGA EXP", "station": "ANG", "next": "BAP", "delay": 25.0, "speed": 65.0, "lat": 19.0755, "lon": 74.7219, "bearing": 45.0},
        12919: {
            "name": "Malwa SF Express",
            "station": "UJN",
            "next": "MKSM",
            "delay": 12.0,
            "speed": 65.5,
            "lat": 23.1827,
            "lon": 75.7682,
            "bearing": 180.0,
            "segment_progress": 0.45,
            "raw_data": {
                "trainNumber": "12919",
                "trainName": "Malwa SF Express",
                "status": "Running",
                "delayMinutes": 12.0,
                "lastUpdatedAt": datetime.now().strftime("%Y-%m-%dT07:14:00+05:30"),
                "isLive": True,
                "currentLocation": {
                    "stationCode": "UJN",
                    "stationName": "Ujjain Junction",
                    "status": "Departed",
                    "isActualPosition": True,
                    "speedKmh": 65.5,
                    "segmentProgress": 0.45,
                    "bearingDegrees": 180.0,
                    "coordinates": {"lat": 23.1827, "lng": 75.7682}
                },
                "train": {
                    "number": "12919",
                    "name": "Malwa SF Express",
                    "type": "Superfast Express",
                    "source": {"code": "INDB", "name": "Indore Junction"},
                    "destination": {"code": "SVDK", "name": "Shri Mata Vaishno Devi Katra"},
                    "distance": 1640.0,
                    "totalHalts": 45,
                    "avgSpeed": 57.2,
                    "maxSpeed": 110.0
                },
                "previousHalt": {
                    "stationCode": "INDB",
                    "stationName": "Indore Junction",
                    "status": "Departed",
                    "delay": 12
                },
                "nextHalt": {
                    "stationCode": "MKSM",
                    "stationName": "Maksi",
                    "scheduledArrival": "02:10:00",
                    "status": "Upcoming"
                },
                "exceptions": [
                    {
                        "type": "DIVERTED",
                        "title": "Route Diversion Detected",
                        "description": "Train is diverted between UJN → MKSM",
                        "from": "UJN",
                        "to": "MKSM",
                        "fromStationName": "Ujjain Junction",
                        "toStationName": "Maksi",
                        "affectedStations": ["UJN", "MKSM"],
                        "skippedStations": ["Maksi"],
                        "diversionDistanceKm": 41.2,
                        "reason": "Track maintenance and chord bypass"
                    }
                ]
            }
        },
    }

    async def get_live_train_status(self, train_no: int) -> LiveTrainStatus:
        profile = self.MOCK_TRAIN_PROFILES.get(train_no, {
            "name": f"EXP TRAIN {train_no}",
            "station": "NDLS",
            "next": "GZB",
            "delay": 5.0,
            "speed": 75.0,
            "lat": 28.6143,
            "lon": 77.2187,
            "bearing": 90.0,
            "segment_progress": 0.45,
        })

        raw = profile.get("raw_data")
        exceptions = raw.get("exceptions") if isinstance(raw, dict) else None

        return LiveTrainStatus(
            success=True,
            source="MockProvider",
            train_no=train_no,
            train_name=profile["name"],
            current_station=profile["station"],
            next_station=profile["next"],
            delay_minutes=float(profile["delay"]),
            segment_progress=float(profile.get("segment_progress", 0.45)),
            speed_kmh=float(profile["speed"]),
            bearing_degrees=profile.get("bearing"),
            latitude=profile["lat"],
            longitude=profile["lon"],
            last_updated=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            is_live=True,
            is_stale=False,
            error=None,
            exceptions=exceptions,
            raw_data=raw
        )

    async def get_train_route(self, train_no: int, stops: bool = True, force_refresh: bool = False) -> Dict[str, Any]:
        """Mock RailRadar Route API returning track coordinates and stops."""
        profile = self.MOCK_TRAIN_PROFILES.get(train_no, {
            "name": f"EXP TRAIN {train_no}",
            "station": "NDLS",
            "next": "GZB",
            "lat": 28.6143,
            "lon": 77.2187,
        })
        lat = profile["lat"]
        lon = profile["lon"]
        return {
            "success": True,
            "data": {
                "trainNumber": str(train_no),
                "format": "geojson",
                "geojson": {
                    "type": "Feature",
                    "properties": {"trainNumber": str(train_no)},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [lon, lat],
                            [80.3537, 26.4539],
                            [81.8340, 25.4358],
                            [83.1189, 25.2818]
                        ]
                    }
                },
                "stops": [
                    {"sequence": 1, "code": profile.get("station", "NDLS"), "name": profile.get("station", "NDLS"), "lat": lat, "lng": lon},
                    {"sequence": 2, "code": "CNB", "name": "Kanpur Central", "lat": 26.4539, "lng": 80.3537},
                    {"sequence": 3, "code": "PRYJ", "name": "Prayagraj Junction", "lat": 25.4358, "lng": 81.8340},
                    {"sequence": 4, "code": "DDU", "name": "Pt. Deen Dayal Upadhyaya", "lat": 25.2818, "lng": 83.1189}
                ]
            }
        }


def get_live_provider(provider_type: Optional[str] = None) -> LiveTrainProvider:
    """
    Factory to instantiate the active LiveTrainProvider.
    Uses RailRadar by default (or if RAILRADAR_API_KEY is configured),
    RailKit if configured, or Mock if explicitly specified.
    """
    p_type = (provider_type or os.environ.get("LIVE_TRAIN_PROVIDER", settings.LIVE_TRAIN_PROVIDER)).lower().strip()
    if p_type == "mock":
        return MockLiveProvider()
    elif p_type == "railkit":
        return RailKitProvider()
    # Default is RailRadar
    return RailRadarProvider()
