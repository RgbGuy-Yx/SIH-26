from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends

from app.services.simulation_service import simulation_service
from app.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/simulation", tags=["Simulation"])


class ResetPayload(BaseModel):
    initial_time: Optional[datetime] = None


class SpeedPayload(BaseModel):
    speed: float = Field(..., gt=0.0, description="Time multiplier (e.g. 1.0, 5.0, 60.0)")


class StepPayload(BaseModel):
    delta_seconds: Optional[float] = Field(None, gt=0.0, description="Virtual seconds to advance")


@router.post("/start")
def start_simulation(user: Dict[str, Any] = Depends(get_current_user)):
    """Start the simulation clock. Requires authenticated user."""
    return simulation_service.start()


@router.post("/pause")
def pause_simulation(user: Dict[str, Any] = Depends(get_current_user)):
    """Pause the simulation clock. Requires authenticated user."""
    return simulation_service.pause()


@router.post("/resume")
def resume_simulation(user: Dict[str, Any] = Depends(get_current_user)):
    """Resume the simulation clock. Requires authenticated user."""
    return simulation_service.resume()


@router.post("/reset")
def reset_simulation(payload: Optional[ResetPayload] = None, user: Dict[str, Any] = Depends(get_current_user)):
    """Deterministically reset the simulation clock, trains, delays, and graph. Requires authenticated user."""
    init_time = payload.initial_time if payload else None
    return simulation_service.reset(initial_time=init_time)


@router.post("/speed")
def set_simulation_speed(payload: SpeedPayload, user: Dict[str, Any] = Depends(get_current_user)):
    """Update the simulation time speed multiplier. Requires authenticated user."""
    return simulation_service.set_speed(payload.speed)


@router.post("/step")
def step_simulation(payload: Optional[StepPayload] = None, user: Dict[str, Any] = Depends(get_current_user)):
    """Step the simulation engine deterministically by delta_seconds. Requires authenticated user."""
    delta = payload.delta_seconds if payload else None
    return simulation_service.step(delta_seconds=delta)


@router.get("/state")
def get_simulation_state():
    """Get full current simulation snapshot. Public — serves both control room and passenger dashboard."""
    return simulation_service.get_full_state_snapshot()


@router.get("/topology")
def get_network_topology():
    """Retrieve complete railway graph stations, track sections, and GeoJSON data. Public — serves both control room and passenger dashboard."""
    return simulation_service.get_network_topology()
