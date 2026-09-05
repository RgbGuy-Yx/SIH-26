from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter

from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/simulation", tags=["Simulation"])


class ResetPayload(BaseModel):
    initial_time: Optional[datetime] = None


class SpeedPayload(BaseModel):
    speed: float = Field(..., gt=0.0, description="Time multiplier (e.g. 1.0, 5.0, 60.0)")


class StepPayload(BaseModel):
    delta_seconds: Optional[float] = Field(None, gt=0.0, description="Virtual seconds to advance")


@router.post("/start")
def start_simulation():
    """Start the simulation clock."""
    return simulation_service.start()


@router.post("/pause")
def pause_simulation():
    """Pause the simulation clock."""
    return simulation_service.pause()


@router.post("/resume")
def resume_simulation():
    """Resume the simulation clock."""
    return simulation_service.resume()


@router.post("/reset")
def reset_simulation(payload: Optional[ResetPayload] = None):
    """Deterministically reset the simulation clock, trains, delays, and graph."""
    init_time = payload.initial_time if payload else None
    return simulation_service.reset(initial_time=init_time)


@router.post("/speed")
def set_simulation_speed(payload: SpeedPayload):
    """Update the simulation time speed multiplier."""
    return simulation_service.set_speed(payload.speed)


@router.post("/step")
def step_simulation(payload: Optional[StepPayload] = None):
    """Step the simulation engine deterministically by delta_seconds."""
    delta = payload.delta_seconds if payload else None
    return simulation_service.step(delta_seconds=delta)


@router.get("/state")
def get_simulation_state():
    """Get full current simulation snapshot."""
    return simulation_service.get_full_state_snapshot()
