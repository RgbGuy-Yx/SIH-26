"""
Real-Time Network-Aware ETA Forecasting & Conflict Resolution Engine
FastAPI Application Entry Point with WebSocket and REST API Layer (Phase 3B)
"""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.simulation import router as simulation_router
from app.api.trains import router as trains_router, v1_router, v1_lookup_router
from app.websocket.connection_manager import manager
from app.websocket.broadcaster import broadcaster

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start simulation clock and WebSocket background telemetry broadcaster
    logger.info("Starting up Real-Time Rail Engine...")
    from app.services.simulation_service import simulation_service
    simulation_service.start()
    broadcaster.start()
    yield
    # Shutdown: Stop broadcaster gracefully
    logger.info("Shutting down Real-Time Rail Engine...")
    await broadcaster.stop()


app = FastAPI(
    title="Indian Railways ETA & Conflict Resolution Engine",
    description="Backend API service for real-time ETA forecasting, simulation, and network-aware conflict resolution.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware setup - explicitly support localhost and 127.0.0.1 origins as well as credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Attach REST API routers
app.include_router(health_router, prefix="/api", tags=["Health & System"])
app.include_router(simulation_router, prefix="/api", tags=["Simulation"])
app.include_router(trains_router, prefix="/api", tags=["Trains"])
app.include_router(v1_router, tags=["RailRadar V1 Public Proxy"])
app.include_router(v1_lookup_router, tags=["RailRadar V1 Lookup Proxy"])
app.include_router(v1_router, prefix="/api", tags=["RailRadar V1 Public Proxy (API Alias)"])
app.include_router(v1_lookup_router, prefix="/api", tags=["RailRadar V1 Lookup Proxy (API Alias)"])



@app.get("/")
def root():
    return {
        "service": "Indian Railways ETA Forecasting Engine",
        "status": "ready",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "data_mode": "/api/system/data-mode",
            "simulation": "/api/simulation/state",
            "trains": "/api/trains",
            "websocket": "/ws",
        },
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming real-time simulation updates, train positions,
    ML delay adjustments, and conflict notifications to frontend clients.
    Immediately delivers a complete network snapshot on connection handshake,
    followed by lightweight periodic delta telemetry broadcasts.
    """
    from app.services.simulation_service import simulation_service

    await manager.connect(websocket)
    try:
        # Deliver full snapshot on initial connection handshake
        initial_snapshot = simulation_service.get_full_state_snapshot()
        await websocket.send_json({
            "type": "full_snapshot",
            "data": initial_snapshot
        })

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            elif data == "request_full_snapshot":
                snapshot = simulation_service.get_full_state_snapshot()
                await websocket.send_json({
                    "type": "full_snapshot",
                    "data": snapshot
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        manager.disconnect(websocket)

