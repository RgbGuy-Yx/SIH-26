from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.get("/health")
def get_health():
    """System health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "simulation_running": simulation_service.is_running,
        "data_mode": settings.DATA_MODE,
    }


@router.get("/system/data-mode")
def get_data_mode():
    """Returns the current data mode and active provider."""
    return {
        "mode": settings.DATA_MODE,
        "provider": settings.LIVE_TRAIN_PROVIDER,
        "description": "Deterministic Simulation Engine with decoupled live train status adapter"
        if settings.DATA_MODE == "hybrid"
        else f"Active mode: {settings.DATA_MODE}",
    }
