"""
Deterministic Virtual Simulation Clock.
Phase 3A: Controllable, Reproducible Simulation Clock with Configurable Speed Multipliers.
"""

from datetime import datetime, timedelta
import time
from typing import Optional


class VirtualClock:
    """
    Deterministic simulation clock supporting configurable speed scaling,
    discrete stepping for unit tests, pause/resume, and exact state reset.
    """

    def __init__(self, initial_time: Optional[datetime] = None, time_multiplier: float = 60.0):
        self._initial_time = initial_time or datetime(2026, 8, 28, 6, 0, 0)
        self._current_time = self._initial_time
        self._time_multiplier = max(0.1, float(time_multiplier))
        
        self._is_running = False
        self._is_paused = False
        self._last_real_time: Optional[float] = None

    @property
    def current_time(self) -> datetime:
        """Get current virtual simulation datetime."""
        return self._current_time

    @property
    def is_running(self) -> bool:
        """True if the clock has been started."""
        return self._is_running

    @property
    def is_paused(self) -> bool:
        """True if the clock is paused."""
        return self._is_paused

    @property
    def time_multiplier(self) -> float:
        """Current simulation speed multiplier."""
        return self._time_multiplier

    def set_speed(self, multiplier: float) -> None:
        """Set simulation speed multiplier (e.g. 60.0 means 1 real second = 1 simulation minute)."""
        self._time_multiplier = max(0.01, float(multiplier))

    def set_time(self, new_time: datetime) -> None:
        """Set the current virtual time directly."""
        self._current_time = new_time

    def start(self) -> None:
        """Start the virtual simulation clock."""
        self._is_running = True
        self._is_paused = False
        self._last_real_time = time.perf_counter()

    def pause(self) -> None:
        """Pause the virtual clock."""
        if self._is_running:
            self._is_paused = True

    def resume(self) -> None:
        """Resume the paused virtual clock."""
        if self._is_running and self._is_paused:
            self._is_paused = False
            self._last_real_time = time.perf_counter()

    def reset(self, initial_time: Optional[datetime] = None) -> None:
        """Reset the clock to original starting state."""
        if initial_time is not None:
            self._initial_time = initial_time
        self._current_time = self._initial_time
        self._is_running = False
        self._is_paused = False
        self._last_real_time = None

    def tick(self, delta_real_seconds: Optional[float] = None) -> datetime:
        """
        Advance the simulation clock deterministically.
        
        - In discrete/manual mode: pass `delta_real_seconds` explicitly (advances time deterministically).
        - In continuous wall-clock mode: computes elapsed real wall time if running and not paused.
        """
        if delta_real_seconds is not None:
            if not self._is_paused:
                sim_advance_seconds = delta_real_seconds * self._time_multiplier
                self._current_time += timedelta(seconds=sim_advance_seconds)
            return self._current_time

        # Continuous wall-clock mode
        if not self._is_running or self._is_paused:
            return self._current_time

        now = time.perf_counter()
        if self._last_real_time is not None:
            elapsed_real = now - self._last_real_time
            sim_advance_seconds = elapsed_real * self._time_multiplier
            self._current_time += timedelta(seconds=sim_advance_seconds)
        self._last_real_time = now
        return self._current_time

    def get_iso_timestamp(self) -> str:
        """Return ISO formatted string of current virtual time."""
        return self._current_time.strftime("%Y-%m-%dT%H:%M:%S")

    def __repr__(self) -> str:
        status = "PAUSED" if self._is_paused else ("RUNNING" if self._is_running else "STOPPED")
        return f"<VirtualClock time='{self.get_iso_timestamp()}' speed={self._time_multiplier}x status={status}>"
