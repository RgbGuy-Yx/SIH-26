"""
In-Memory Caching and Request Deduplication Service.
Phase 3B: High-Performance TTL Cache with In-Flight Request Coalescing and Stale Fallback.
"""

import time
import asyncio
from typing import Dict, Any, Optional, Tuple, Callable, Awaitable
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class CacheEntry:
    value: Any
    expires_at: float
    created_at: float


class CacheService:
    """
    Thread-safe / Async in-memory cache supporting TTL, stale fallback,
    and request deduplication for external API calls.
    """

    def __init__(self, default_ttl: int = settings.LIVE_STATUS_CACHE_TTL_SECONDS):
        self.default_ttl = default_ttl
        self._store: Dict[str, CacheEntry] = {}
        self._in_flight: Dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if it exists and has not expired.
        """
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.time() > entry.expires_at:
            return None
        return entry.value

    def get_stale(self, key: str) -> Optional[Tuple[Any, float]]:
        """
        Retrieve cached value even if expired (used for graceful fallback on upstream API errors).
        Returns (value, age_in_seconds) if present.
        """
        entry = self._store.get(key)
        if entry is None:
            return None
        age = time.time() - entry.created_at
        return entry.value, round(age, 1)

    def set(self, key: str, value: Any, ttl: Optional[int] = None, ttl_seconds: Optional[int] = None) -> None:
        """
        Store value in cache with specified or default TTL.
        """
        eff_ttl = ttl_seconds if ttl_seconds is not None else (ttl if ttl is not None else self.default_ttl)
        now = time.time()
        self._store[key] = CacheEntry(
            value=value,
            expires_at=now + eff_ttl,
            created_at=now
        )

    def delete(self, key: str) -> None:
        """Remove entry from cache."""
        self._store.pop(key, None)

    def clear(self) -> None:
        """Clear all cached entries."""
        self._store.clear()

    async def get_or_set(
        self,
        key: str,
        fetcher: Callable[[], Awaitable[Any]],
        ttl: Optional[int] = None,
        ttl_seconds: Optional[int] = None,
        fallback_on_error: bool = True,
        return_tuple: bool = False,
    ) -> Any:
        """
        High-concurrency request coalescing:
        If multiple callers request the same key simultaneously:
        - Check fresh cache first.
        - If cache miss: only ONE fetcher() is executed; other callers await the same task.
        - Returns data (or (data, is_cached) if return_tuple is True).
        """
        effective_ttl = ttl_seconds if ttl_seconds is not None else ttl

        # 1. Check cache hit
        cached = self.get(key)
        if cached is not None:
            return (cached, True) if return_tuple else cached

        # 2. Check if another coroutine is already fetching this key
        async with self._lock:
            cached = self.get(key)
            if cached is not None:
                return (cached, True) if return_tuple else cached

            if key in self._in_flight:
                future = self._in_flight[key]
            else:
                loop = asyncio.get_running_loop()
                future = loop.create_future()
                self._in_flight[key] = future
                asyncio.create_task(self._execute_fetch(key, fetcher, effective_ttl, future))

        try:
            result = await future
            return (result, False) if return_tuple else result
        except Exception as exc:
            if fallback_on_error:
                stale = self.get_stale(key)
                if stale is not None:
                    value, age = stale
                    if isinstance(value, dict):
                        value = {**value, "is_stale": True, "stale_age_seconds": age}
                    return (value, True) if return_tuple else value
            raise exc

    async def _execute_fetch(
        self,
        key: str,
        fetcher: Callable[[], Awaitable[Any]],
        ttl: Optional[int],
        future: asyncio.Future
    ) -> None:
        """Helper to run the single in-flight fetcher and notify all awaiting callers."""
        try:
            data = await fetcher()
            self.set(key, data, ttl)
            if not future.done():
                future.set_result(data)
        except Exception as exc:
            if not future.done():
                future.set_exception(exc)
        finally:
            async with self._lock:
                self._in_flight.pop(key, None)


# Global singleton instance
cache_service = CacheService()
