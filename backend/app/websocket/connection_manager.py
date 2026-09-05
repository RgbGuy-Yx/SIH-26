import logging
from typing import Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections for real-time telemetry streaming."""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast_json(self, data: dict) -> None:
        if not self.active_connections:
            return

        dead_connections: Set[WebSocket] = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.warning(f"Failed to send message to websocket client: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()
