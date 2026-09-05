import asyncio
import logging
from typing import Optional
from app.websocket.connection_manager import manager
from app.core.config import settings

logger = logging.getLogger(__name__)


class SimulationBroadcaster:
    """Periodically broadcasts simulation state to connected WebSocket clients."""

    def __init__(self, interval_seconds: float = 1.0) -> None:
        self.interval_seconds = interval_seconds
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._broadcast_loop())
        logger.info(f"Simulation broadcaster started with interval {self.interval_seconds}s")

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Simulation broadcaster stopped.")

    async def _broadcast_loop(self) -> None:
        # Import simulation_service lazily to avoid circular imports
        from app.services.simulation_service import simulation_service

        while self._running:
            try:
                # Only broadcast if there are connected clients
                if manager.connection_count > 0:
                    delta_snapshot = simulation_service.get_delta_state_snapshot()
                    payload = {
                        "type": "telemetry_delta",
                        "data": delta_snapshot
                    }
                    await manager.broadcast_json(payload)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in broadcast loop: {e}", exc_info=True)

            await asyncio.sleep(self.interval_seconds)


broadcaster = SimulationBroadcaster(interval_seconds=settings.WS_BROADCAST_RATE_SECONDS)
