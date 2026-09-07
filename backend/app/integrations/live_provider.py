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


class TrainInfoCache:
    """
    24-hour cache for static train timetable, route stations, and platform assignments.
    """
    TTL_SECONDS = 24 * 3600  # 24 Hours

    def __init__(self, cache_dir: Optional[Path] = None):
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        if cache_dir is None:
            self.cache_dir = Path(__file__).resolve().parents[2] / ".cache" / "train_info"
        else:
            self.cache_dir = cache_dir

        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not initialize disk cache directory at {self.cache_dir}: {e}")

    def get(self, train_no: int, ignore_expiry: bool = False) -> Optional[Dict[str, Any]]:
        key = str(train_no)
        now = time.time()
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            age = now - entry["timestamp"]
            if ignore_expiry or age < self.TTL_SECONDS:
                return entry["payload"]

        disk_file = self.cache_dir / f"{key}.json"
        if disk_file.exists():
            try:
                mtime = disk_file.stat().st_mtime
                age = now - mtime
                if ignore_expiry or age < self.TTL_SECONDS:
                    with open(disk_file, "r", encoding="utf-8") as f:
                        payload = json.load(f)
                    self._memory_cache[key] = {"timestamp": mtime, "payload": payload}
                    return payload
            except Exception:
                pass
        return None

    def set(self, train_no: int, payload: Dict[str, Any]) -> None:
        if not isinstance(payload, dict) or not payload.get("success"):
            return
        key = str(train_no)
        now = time.time()
        self._memory_cache[key] = {"timestamp": now, "payload": payload}
        try:
            disk_file = self.cache_dir / f"{key}.json"
            with open(disk_file, "w", encoding="utf-8") as f:
                json.dump(payload, f)
        except Exception as e:
            logger.warning(f"Failed to persist train info disk cache: {e}")


# Global Singleton Train Info Cache
train_info_cache = TrainInfoCache()


class TrainBetweenCache:
    """
    6-hour cache for trains between stations query: GET /v1/trains/between/{from}/{to}
    """
    TTL_SECONDS = 6 * 3600  # 6 Hours

    def __init__(self, cache_dir: Optional[Path] = None):
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        if cache_dir is None:
            self.cache_dir = Path(__file__).resolve().parents[2] / ".cache" / "trains_between"
        else:
            self.cache_dir = cache_dir

        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not initialize disk cache directory at {self.cache_dir}: {e}")

    def _get_key(self, from_stn: str, to_stn: str, date: Optional[str] = None) -> str:
        date_str = date.strip() if date else "all"
        return f"{from_stn.upper()}_{to_stn.upper()}_{date_str}"

    def get(self, from_stn: str, to_stn: str, date: Optional[str] = None, ignore_expiry: bool = False) -> Optional[Dict[str, Any]]:
        key = self._get_key(from_stn, to_stn, date)
        now = time.time()
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if ignore_expiry or (now - entry["timestamp"] < self.TTL_SECONDS):
                return entry["payload"]

        disk_file = self.cache_dir / f"{key}.json"
        if disk_file.exists():
            try:
                mtime = disk_file.stat().st_mtime
                age = now - mtime
                if ignore_expiry or age < self.TTL_SECONDS:
                    with open(disk_file, "r", encoding="utf-8") as f:
                        payload = json.load(f)
                    self._memory_cache[key] = {"timestamp": mtime, "payload": payload}
                    return payload
            except Exception:
                pass
        return None

    def set(self, from_stn: str, to_stn: str, payload: Dict[str, Any], date: Optional[str] = None) -> None:
        if not isinstance(payload, dict) or not payload.get("success"):
            return
        key = self._get_key(from_stn, to_stn, date)
        now = time.time()
        self._memory_cache[key] = {"timestamp": now, "payload": payload}
        try:
            disk_file = self.cache_dir / f"{key}.json"
            with open(disk_file, "w", encoding="utf-8") as f:
                json.dump(payload, f)
        except Exception as e:
            logger.warning(f"Failed to persist train between disk cache: {e}")


train_between_cache = TrainBetweenCache()


class StationSearchCache:
    """
    24-hour cache for station search queries: GET /v1/lookup/search/stations?q={query}
    """
    TTL_SECONDS = 24 * 3600  # 24 Hours

    def __init__(self, cache_dir: Optional[Path] = None):
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        if cache_dir is None:
            self.cache_dir = Path(__file__).resolve().parents[2] / ".cache" / "station_search"
        else:
            self.cache_dir = cache_dir

        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not initialize disk cache directory at {self.cache_dir}: {e}")

    def _get_key(self, query: str) -> str:
        return query.strip().lower()

    def get(self, query: str, ignore_expiry: bool = False) -> Optional[Dict[str, Any]]:
        key = self._get_key(query)
        if not key:
            return None
        now = time.time()
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if ignore_expiry or (now - entry["timestamp"] < self.TTL_SECONDS):
                return entry["payload"]

        disk_file = self.cache_dir / f"{key}.json"
        if disk_file.exists():
            try:
                mtime = disk_file.stat().st_mtime
                age = now - mtime
                if ignore_expiry or age < self.TTL_SECONDS:
                    with open(disk_file, "r", encoding="utf-8") as f:
                        payload = json.load(f)
                    self._memory_cache[key] = {"timestamp": mtime, "payload": payload}
                    return payload
            except Exception:
                pass
        return None

    def set(self, query: str, payload: Dict[str, Any]) -> None:
        if not isinstance(payload, dict) or not payload.get("success"):
            return
        key = self._get_key(query)
        if not key:
            return
        now = time.time()
        self._memory_cache[key] = {"timestamp": now, "payload": payload}
        try:
            disk_file = self.cache_dir / f"{key}.json"
            with open(disk_file, "w", encoding="utf-8") as f:
                json.dump(payload, f)
        except Exception as e:
            logger.warning(f"Failed to persist station search disk cache: {e}")


station_search_cache = StationSearchCache()

# Curated Fallback Hubs for Instant Response & Offline Resiliency
FALLBACK_STATIONS_DATA: List[Dict[str, Any]] = [
    {"code": "NDLS", "name": "New Delhi", "city": "Delhi", "popularity": 100, "isActive": True},
    {"code": "NZM", "name": "Hazrat Nizamuddin", "city": "Delhi", "popularity": 95, "isActive": True},
    {"code": "DLI", "name": "Old Delhi Junction", "city": "Delhi", "popularity": 90, "isActive": True},
    {"code": "DEE", "name": "Delhi Sarai Rohilla", "city": "Delhi", "popularity": 85, "isActive": True},
    {"code": "ANVT", "name": "Anand Vihar Terminal", "city": "Delhi", "popularity": 88, "isActive": True},
    {"code": "DEC", "name": "Delhi Cantt", "city": "Delhi", "popularity": 80, "isActive": True},
    {"code": "HWH", "name": "Howrah Junction", "city": "Kolkata", "popularity": 99, "isActive": True},
    {"code": "SDAH", "name": "Sealdah", "city": "Kolkata", "popularity": 94, "isActive": True},
    {"code": "KOAA", "name": "Kolkata Terminal", "city": "Kolkata", "popularity": 80, "isActive": True},
    {"code": "SHM", "name": "Shalimar", "city": "Kolkata", "popularity": 75, "isActive": True},
    {"code": "CSMT", "name": "Mumbai CSMT", "city": "Mumbai", "popularity": 99, "isActive": True},
    {"code": "MMCT", "name": "Mumbai Central", "city": "Mumbai", "popularity": 96, "isActive": True},
    {"code": "BDTS", "name": "Bandra Terminus", "city": "Mumbai", "popularity": 92, "isActive": True},
    {"code": "LTT", "name": "Lokmanya Tilak Terminus", "city": "Mumbai", "popularity": 90, "isActive": True},
    {"code": "DR", "name": "Dadar Central", "city": "Mumbai", "popularity": 88, "isActive": True},
    {"code": "TNA", "name": "Thane", "city": "Mumbai", "popularity": 85, "isActive": True},
    {"code": "KYN", "name": "Kalyan Junction", "city": "Mumbai", "popularity": 87, "isActive": True},
    {"code": "BVI", "name": "Borivali", "city": "Mumbai", "popularity": 82, "isActive": True},
    {"code": "PNVL", "name": "Panvel", "city": "Navi Mumbai", "popularity": 80, "isActive": True},
    {"code": "MAS", "name": "Chennai Central (MGR)", "city": "Chennai", "popularity": 98, "isActive": True},
    {"code": "MS", "name": "Chennai Egmore", "city": "Chennai", "popularity": 92, "isActive": True},
    {"code": "TBM", "name": "Tambaram", "city": "Chennai", "popularity": 80, "isActive": True},
    {"code": "SBC", "name": "KSR Bengaluru City", "city": "Bengaluru", "popularity": 98, "isActive": True},
    {"code": "YPR", "name": "Yesvantpur Junction", "city": "Bengaluru", "popularity": 92, "isActive": True},
    {"code": "SMVB", "name": "Sir M. Visvesvaraya Terminal", "city": "Bengaluru", "popularity": 88, "isActive": True},
    {"code": "BNC", "name": "Bengaluru Cantt", "city": "Bengaluru", "popularity": 80, "isActive": True},
    {"code": "CNB", "name": "Kanpur Central", "city": "Kanpur", "popularity": 95, "isActive": True},
    {"code": "LJN", "name": "Lucknow Junction", "city": "Lucknow", "popularity": 94, "isActive": True},
    {"code": "LKO", "name": "Lucknow Charbagh", "city": "Lucknow", "popularity": 93, "isActive": True},
    {"code": "PRYJ", "name": "Prayagraj Junction", "city": "Prayagraj", "popularity": 92, "isActive": True},
    {"code": "DDU", "name": "Pt. Deen Dayal Upadhyaya Jn", "city": "Mughalsarai", "popularity": 92, "isActive": True},
    {"code": "BSB", "name": "Varanasi Junction", "city": "Varanasi", "popularity": 95, "isActive": True},
    {"code": "BSBS", "name": "Banaras", "city": "Varanasi", "popularity": 85, "isActive": True},
    {"code": "GKP", "name": "Gorakhpur Junction", "city": "Gorakhpur", "popularity": 89, "isActive": True},
    {"code": "BPL", "name": "Bhopal Junction", "city": "Bhopal", "popularity": 93, "isActive": True},
    {"code": "RKMP", "name": "Rani Kamlapati", "city": "Bhopal", "popularity": 91, "isActive": True},
    {"code": "INDB", "name": "Indore Junction", "city": "Indore", "popularity": 90, "isActive": True},
    {"code": "UJN", "name": "Ujjain Junction", "city": "Ujjain", "popularity": 89, "isActive": True},
    {"code": "GWL", "name": "Gwalior Junction", "city": "Gwalior", "popularity": 87, "isActive": True},
    {"code": "JHS", "name": "Virangana Lakshmibai Jhansi", "city": "Jhansi", "popularity": 90, "isActive": True},
    {"code": "AGC", "name": "Agra Cantt", "city": "Agra", "popularity": 92, "isActive": True},
    {"code": "AF", "name": "Agra Fort", "city": "Agra", "popularity": 82, "isActive": True},
    {"code": "ADI", "name": "Ahmedabad Junction", "city": "Ahmedabad", "popularity": 95, "isActive": True},
    {"code": "BRC", "name": "Vadodara Junction", "city": "Vadodara", "popularity": 92, "isActive": True},
    {"code": "ST", "name": "Surat", "city": "Surat", "popularity": 92, "isActive": True},
    {"code": "RTM", "name": "Ratlam Junction", "city": "Ratlam", "popularity": 88, "isActive": True},
    {"code": "PUNE", "name": "Pune Junction", "city": "Pune", "popularity": 94, "isActive": True},
    {"code": "NGP", "name": "Nagpur Junction", "city": "Nagpur", "popularity": 93, "isActive": True},
    {"code": "HYB", "name": "Hyderabad Deccan", "city": "Hyderabad", "popularity": 90, "isActive": True},
    {"code": "SC", "name": "Secunderabad Junction", "city": "Secunderabad", "popularity": 95, "isActive": True},
    {"code": "KCG", "name": "Kacheguda", "city": "Hyderabad", "popularity": 88, "isActive": True},
    {"code": "BZA", "name": "Vijayawada Junction", "city": "Vijayawada", "popularity": 93, "isActive": True},
    {"code": "VSKP", "name": "Visakhapatnam Junction", "city": "Visakhapatnam", "popularity": 91, "isActive": True},
    {"code": "PNBE", "name": "Patna Junction", "city": "Patna", "popularity": 95, "isActive": True},
    {"code": "DNR", "name": "Danapur", "city": "Patna", "popularity": 85, "isActive": True},
    {"code": "RJPB", "name": "Rajendra Nagar Terminal", "city": "Patna", "popularity": 86, "isActive": True},
    {"code": "GHY", "name": "Guwahati", "city": "Guwahati", "popularity": 90, "isActive": True},
    {"code": "KYQ", "name": "Kamakhya Junction", "city": "Guwahati", "popularity": 82, "isActive": True},
    {"code": "NJP", "name": "New Jalpaiguri Junction", "city": "Siliguri", "popularity": 90, "isActive": True},
    {"code": "JP", "name": "Jaipur Junction", "city": "Jaipur", "popularity": 94, "isActive": True},
    {"code": "JU", "name": "Jodhpur Junction", "city": "Jodhpur", "popularity": 88, "isActive": True},
    {"code": "AII", "name": "Ajmer Junction", "city": "Ajmer", "popularity": 86, "isActive": True},
    {"code": "KOTA", "name": "Kota Junction", "city": "Kota", "popularity": 90, "isActive": True},
    {"code": "ASR", "name": "Amritsar Junction", "city": "Amritsar", "popularity": 91, "isActive": True},
    {"code": "CDG", "name": "Chandigarh Junction", "city": "Chandigarh", "popularity": 90, "isActive": True},
    {"code": "LDH", "name": "Ludhiana Junction", "city": "Ludhiana", "popularity": 88, "isActive": True},
    {"code": "JAT", "name": "Jammu Tawi", "city": "Jammu", "popularity": 92, "isActive": True},
    {"code": "SVDK", "name": "Shri Mata Vaishno Devi Katra", "city": "Katra", "popularity": 94, "isActive": True},
    {"code": "DDN", "name": "Dehradun", "city": "Dehradun", "popularity": 87, "isActive": True},
    {"code": "HW", "name": "Haridwar Junction", "city": "Haridwar", "popularity": 90, "isActive": True},
    {"code": "GZB", "name": "Ghaziabad Junction", "city": "Ghaziabad", "popularity": 88, "isActive": True},
    {"code": "MB", "name": "Moradabad Junction", "city": "Moradabad", "popularity": 86, "isActive": True},
    {"code": "BE", "name": "Bareilly Junction", "city": "Bareilly", "popularity": 86, "isActive": True},
    {"code": "ALJN", "name": "Aligarh Junction", "city": "Aligarh", "popularity": 85, "isActive": True},
    {"code": "MTJ", "name": "Mathura Junction", "city": "Mathura", "popularity": 89, "isActive": True},
    {"code": "JBP", "name": "Jabalpur", "city": "Jabalpur", "popularity": 88, "isActive": True},
    {"code": "R", "name": "Raipur Junction", "city": "Raipur", "popularity": 89, "isActive": True},
    {"code": "BSP", "name": "Bilaspur Junction", "city": "Bilaspur", "popularity": 88, "isActive": True},
    {"code": "BBS", "name": "Bhubaneswar", "city": "Bhubaneswar", "popularity": 92, "isActive": True},
    {"code": "PURI", "name": "Puri", "city": "Puri", "popularity": 91, "isActive": True},
    {"code": "CTC", "name": "Cuttack Junction", "city": "Cuttack", "popularity": 86, "isActive": True},
    {"code": "TVC", "name": "Thiruvananthapuram Central", "city": "Thiruvananthapuram", "popularity": 92, "isActive": True},
    {"code": "ERS", "name": "Ernakulam Junction (South)", "city": "Kochi", "popularity": 92, "isActive": True},
    {"code": "ERN", "name": "Ernakulam Town (North)", "city": "Kochi", "popularity": 85, "isActive": True},
    {"code": "CLT", "name": "Kozhikode Main", "city": "Kozhikode", "popularity": 86, "isActive": True},
    {"code": "CBE", "name": "Coimbatore Junction", "city": "Coimbatore", "popularity": 90, "isActive": True},
    {"code": "MDU", "name": "Madurai Junction", "city": "Madurai", "popularity": 89, "isActive": True},
    {"code": "TPJ", "name": "Tiruchchirappalli Junction", "city": "Tiruchirappalli", "popularity": 88, "isActive": True},
    {"code": "RU", "name": "Renigunta Junction", "city": "Tirupati", "popularity": 88, "isActive": True},
    {"code": "TPTY", "name": "Tirupati", "city": "Tirupati", "popularity": 91, "isActive": True},
    {"code": "GTL", "name": "Guntakal Junction", "city": "Guntakal", "popularity": 85, "isActive": True},
    {"code": "MYS", "name": "Mysuru Junction", "city": "Mysuru", "popularity": 88, "isActive": True},
    {"code": "MAQ", "name": "Mangaluru Central", "city": "Mangaluru", "popularity": 86, "isActive": True},
    {"code": "MAJN", "name": "Mangaluru Junction", "city": "Mangaluru", "popularity": 84, "isActive": True},
    {"code": "GOA", "name": "Madgaon Junction (MAO)", "city": "Goa", "popularity": 90, "isActive": True},
    {"code": "MAO", "name": "Madgaon Junction", "city": "Goa", "popularity": 91, "isActive": True},
]


class LiveTrainProvider(ABC):
    """Abstract interface for external live train status providers."""

    @abstractmethod
    async def get_live_train_status(self, train_no: int, journey_date: Optional[str] = None) -> LiveTrainStatus:
        """Fetch and normalize real-time live running status for a train."""
        pass

    async def get_train_info(self, train_no: int, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetch official static train schedule, timetable, stations, and platforms."""
        return {"success": False, "error": "Not implemented for provider"}

    async def get_trains_between(
        self,
        from_station: str,
        to_station: str,
        journey_date: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Fetch all trains operating between source and destination stations."""
        return {"success": False, "error": "Not implemented for provider"}

    async def get_train_route(self, train_no: int, stops: bool = True, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetch official train track route geometry & stations."""
        return {"success": False, "error": "Not implemented for provider"}

    async def search_stations(self, query: str, force_refresh: bool = False) -> Dict[str, Any]:
        """Search stations by name, code or city matching query."""
        return {"success": False, "error": "Not implemented for provider"}

    async def get_live_status(self, train_no: int, journey_date: Optional[str] = None) -> LiveTrainStatus:
        """Convenience alias for get_live_train_status."""
        return await self.get_live_train_status(train_no, journey_date=journey_date)


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

    async def get_train_info(self, train_no: int, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetch official train schedule, route, timetable, stations, and platforms from RailRadar:
        GET https://api.railradar.in/v1/trains/{number}
        Cached for 24 hours.
        """
        if not force_refresh:
            cached = train_info_cache.get(train_no)
            if cached is not None:
                return cached

        current_key = self.api_key
        url = f"{self.base_url}/trains/{train_no}"
        headers = {
            "Accept": "application/json",
            "User-Agent": "RailwayIntelligenceEngine/1.0",
        }
        if current_key:
            headers["Authorization"] = f"Bearer {current_key}" if not current_key.startswith("Bearer ") else current_key
            headers["x-api-key"] = current_key

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict) and data.get("success"):
                        train_info_cache.set(train_no, data)
                    return data
                else:
                    logger.warning(f"RailRadar train info query for train {train_no} returned {response.status_code}: {response.text}")
                    stale = train_info_cache.get(train_no, ignore_expiry=True)
                    if stale is not None:
                        return stale
                    return {"success": False, "error": f"HTTP {response.status_code}", "detail": response.text}
        except Exception as e:
            logger.error(f"Failed to fetch static train info for train {train_no}: {e}")
            stale = train_info_cache.get(train_no, ignore_expiry=True)
            if stale is not None:
                return stale
            return {"success": False, "error": str(e)}

    async def get_trains_between(
        self,
        from_station: str,
        to_station: str,
        journey_date: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Fetch all trains operating between source and destination stations from RailRadar:
        GET https://api.railradar.in/v1/trains/between/{from}/{to}
        """
        clean_from = from_station.strip().upper()
        clean_to = to_station.strip().upper()

        if "(" in clean_from and ")" in clean_from:
            clean_from = clean_from[clean_from.find("(") + 1 : clean_from.find(")")].strip()
        if "(" in clean_to and ")" in clean_to:
            clean_to = clean_to[clean_to.find("(") + 1 : clean_to.find(")")].strip()

        if not clean_from or not clean_to:
            return {"success": False, "error": "Source and Destination station codes are required."}

        if not force_refresh:
            cached = train_between_cache.get(clean_from, clean_to, date=journey_date)
            if cached is not None:
                return cached

        current_key = self.api_key
        url = f"{self.base_url}/trains/between/{clean_from}/{clean_to}"
        headers = {
            "Accept": "application/json",
            "User-Agent": "RailwayIntelligenceEngine/1.0",
        }
        if current_key:
            headers["Authorization"] = f"Bearer {current_key}" if not current_key.startswith("Bearer ") else current_key
            headers["x-api-key"] = current_key

        params: Dict[str, Any] = {}
        if journey_date:
            params["date"] = journey_date

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    json_body = response.json()
                    if isinstance(json_body, dict) and json_body.get("success"):
                        train_between_cache.set(clean_from, clean_to, json_body, date=journey_date)
                    return json_body
                elif response.status_code == 404:
                    return {
                        "success": True,
                        "data": {
                            "from": {"code": clean_from, "name": clean_from},
                            "to": {"code": clean_to, "name": clean_to},
                            "trains": [],
                            "count": 0
                        }
                    }
                else:
                    logger.warning(f"RailRadar trains between {clean_from}-{clean_to} returned {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to fetch trains between {clean_from} and {clean_to}: {e}")
            stale = train_between_cache.get(clean_from, clean_to, date=journey_date, ignore_expiry=True)
            if stale is not None:
                return stale
            return {
                "success": True,
                "data": {
                    "from": {"code": clean_from, "name": clean_from},
                    "to": {"code": clean_to, "name": clean_to},
                    "trains": [],
                    "count": 0
                },
                "meta": {"source": "fallback_offline", "error": str(e)}
            }
    async def get_train_info(self, train_no: int, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetch official static train timetable, route stations, platforms, distance, and duration from RailRadar:
        GET https://api.railradar.in/v1/trains/{number}
        """
        if not force_refresh:
            cached = train_info_cache.get(train_no)
            if cached is not None:
                return cached

        current_key = self.api_key
        url = f"{self.base_url}/trains/{train_no}"
        headers = {
            "Accept": "application/json",
            "User-Agent": "RailwayIntelligenceEngine/1.0",
        }
        if current_key:
            headers["Authorization"] = f"Bearer {current_key}" if not current_key.startswith("Bearer ") else current_key
            headers["x-api-key"] = current_key

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict) and data.get("success"):
                        train_info_cache.set(train_no, data)
                    return data
                else:
                    stale = train_info_cache.get(train_no, ignore_expiry=True)
                    if stale is not None:
                        return stale
                    return {"success": False, "error": f"HTTP {response.status_code}", "detail": response.text}
        except Exception as e:
            stale = train_info_cache.get(train_no, ignore_expiry=True)
            if stale is not None:
                return stale
            return {"success": False, "error": str(e)}

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

    async def search_stations(self, query: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Search stations by name, code or city from RailRadar:
        GET https://api.railradar.in/v1/lookup/search/stations?q={query}
        Cached for 24 hours.
        """
        clean_q = (query or "").strip()
        if not clean_q:
            return {"success": True, "data": FALLBACK_STATIONS_DATA[:20], "meta": {"source": "default"}}

        # 1. Check cache first
        if not force_refresh:
            cached = station_search_cache.get(clean_q)
            if cached is not None:
                return cached

        current_key = self.api_key
        url = f"{self.base_url}/lookup/search/stations"
        headers = {
            "Accept": "application/json",
            "User-Agent": "RailwayIntelligenceEngine/1.0",
        }
        if current_key:
            headers["Authorization"] = f"Bearer {current_key}" if not current_key.startswith("Bearer ") else current_key
            headers["x-api-key"] = current_key

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, headers=headers, params={"q": clean_q})
                if response.status_code == 200:
                    json_body = response.json()
                    if isinstance(json_body, dict) and json_body.get("success"):
                        station_search_cache.set(clean_q, json_body)
                        return json_body
                    return json_body
                else:
                    logger.warning(f"RailRadar station search for '{clean_q}' returned {response.status_code}: {response.text}")
                    stale = station_search_cache.get(clean_q, ignore_expiry=True)
                    if stale is not None:
                        return stale

                    # Fallback to rich local database filter on rate limit / server error
                    q_lower = clean_q.lower()
                    filtered = [
                        s for s in FALLBACK_STATIONS_DATA
                        if q_lower in s["code"].lower()
                        or q_lower in s["name"].lower()
                        or (s.get("city") and q_lower in s["city"].lower())
                    ]
                    return {
                        "success": True,
                        "data": filtered,
                        "meta": {"source": "fallback_offline", "status": response.status_code}
                    }
        except Exception as e:
            logger.error(f"Failed to search stations for '{clean_q}': {e}")
            stale = station_search_cache.get(clean_q, ignore_expiry=True)
            if stale is not None:
                return stale

            q_lower = clean_q.lower()
            filtered = [
                s for s in FALLBACK_STATIONS_DATA
                if q_lower in s["code"].lower()
                or q_lower in s["name"].lower()
                or (s.get("city") and q_lower in s["city"].lower())
            ]
            return {
                "success": True,
                "data": filtered,
                "meta": {"source": "fallback_exception", "error": str(e)}
            }


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
        }
    }

    async def get_train_info(self, train_no: int, force_refresh: bool = False) -> Dict[str, Any]:
        profile = self.MOCK_TRAIN_PROFILES.get(train_no, {
            "name": f"EXP TRAIN {train_no}",
            "station": "NDLS",
            "next": "GZB",
        })
        return {
            "success": True,
            "data": {
                "train": {
                    "number": str(train_no),
                    "name": profile.get("name", f"Train #{train_no}"),
                    "source": {"code": profile.get("station", "NDLS"), "name": profile.get("station", "NDLS")},
                    "destination": {"code": profile.get("next", "GZB"), "name": profile.get("next", "GZB")},
                    "runDays": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
                },
                "route": [
                    {"sequence": 1, "station": {"code": profile.get("station", "NDLS"), "name": profile.get("station", "NDLS")}, "isHalt": True, "departure": "06:00", "platform": "1"},
                    {"sequence": 2, "station": {"code": profile.get("next", "GZB"), "name": profile.get("next", "GZB")}, "isHalt": True, "arrival": "06:45", "departure": "06:50", "platform": "2"},
                ]
            }
        }

    async def get_live_train_status(self, train_no: int, journey_date: Optional[str] = None) -> LiveTrainStatus:
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

    async def get_trains_between(
        self,
        from_station: str,
        to_station: str,
        journey_date: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        clean_from = from_station.strip().upper()
        clean_to = to_station.strip().upper()
        if "(" in clean_from and ")" in clean_from:
            clean_from = clean_from[clean_from.find("(") + 1 : clean_from.find(")")].strip()
        if "(" in clean_to and ")" in clean_to:
            clean_to = clean_to[clean_to.find("(") + 1 : clean_to.find(")")].strip()

        mock_trains = [
            {
                "train": {
                    "number": "12004",
                    "name": "New Delhi - Lucknow Swarn Shatabdi Express",
                    "type": "Shatabdi Express",
                    "runDays": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
                },
                "from": {"code": clean_from or "NDLS", "name": clean_from or "New Delhi", "city": "New Delhi", "departure": "06:10", "day": 1, "sequence": 1},
                "to": {"code": clean_to or "LJN", "name": clean_to or "Lucknow Jn", "city": "Lucknow", "arrival": "13:00", "day": 1, "sequence": 6},
                "distance": 511,
                "duration": 410,
                "totalHaltsBetween": 6,
            },
            {
                "train": {
                    "number": "12274",
                    "name": "New Delhi - Howrah Duronto Express",
                    "type": "Duronto Express",
                    "runDays": ["tue", "sat"],
                },
                "from": {"code": clean_from or "NDLS", "name": clean_from or "New Delhi", "city": "New Delhi", "departure": "12:35", "day": 1, "sequence": 1},
                "to": {"code": clean_to or "HWH", "name": clean_to or "Howrah", "city": "Kolkata", "arrival": "10:35", "day": 2, "sequence": 8},
                "distance": 1503,
                "duration": 1320,
                "totalHaltsBetween": 5,
            }
        ]
        return {
            "success": True,
            "data": {
                "from": {"code": clean_from, "name": clean_from},
                "to": {"code": clean_to, "name": clean_to},
                "trains": mock_trains,
                "count": len(mock_trains),
            }
        }

    async def search_stations(self, query: str, force_refresh: bool = False) -> Dict[str, Any]:
        """Mock station search querying fallback dataset."""
        clean_q = (query or "").strip().lower()
        if not clean_q:
            return {"success": True, "data": FALLBACK_STATIONS_DATA[:20], "meta": {"source": "mock"}}
        filtered = [
            s for s in FALLBACK_STATIONS_DATA
            if clean_q in s["code"].lower()
            or clean_q in s["name"].lower()
            or (s.get("city") and clean_q in s["city"].lower())
        ]
        return {
            "success": True,
            "data": filtered,
            "meta": {"source": "mock", "count": len(filtered)}
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
