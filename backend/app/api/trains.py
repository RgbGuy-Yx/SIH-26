from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Path

from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/trains", tags=["Trains"])


@router.get("", response_model=List[Dict[str, Any]])
def get_all_trains():
    """Retrieve all active trains in the network with positions, delays, and routes."""
    return simulation_service.get_train_list()


@router.get("/{trainNo}", response_model=Dict[str, Any])
def get_train_by_id(
    trainNo: int = Path(..., description="Train Number (e.g. 12003, 12004, 12229)")
):
    """Retrieve detailed state telemetry for a specific train."""
    state = simulation_service.get_train_state(trainNo)
    if not state:
        raise HTTPException(
            status_code=404,
            detail=f"Train with number {trainNo} not found in simulation network."
        )
    return state


@router.get("/{trainNo}/eta", response_model=Dict[str, Any])
def get_train_eta(
    trainNo: int = Path(..., description="Train Number (e.g. 12003)")
):
    """Retrieve ETA, next station forecasts, ML predicted delay, and route progress."""
    eta_info = simulation_service.get_train_eta(trainNo)
    if not eta_info:
        raise HTTPException(
            status_code=404,
            detail=f"Train with number {trainNo} not found in simulation network."
        )
    return eta_info


@router.get("/{trainNo}/conflicts", response_model=List[Dict[str, Any]])
def get_train_conflicts(
    trainNo: int = Path(..., description="Train Number (e.g. 12003)")
):
    """Retrieve active section conflicts involving this train."""
    if trainNo not in simulation_service.engine.trains:
        raise HTTPException(
            status_code=404,
            detail=f"Train with number {trainNo} not found in simulation network."
        )
    return simulation_service.get_train_conflicts(trainNo)


@router.get("/{trainNo}/live-status", response_model=Dict[str, Any])
async def get_train_live_status(
    trainNo: int = Path(..., description="Train Number (e.g. 12003)")
):
    """
    Retrieve live train status (via RailRadar/RailKit/Mock with caching & deduplication)
    alongside simulation state. Decoupled and resilient against API failures.
    """
    if trainNo not in simulation_service.engine.trains:
        raise HTTPException(
            status_code=404,
            detail=f"Train with number {trainNo} not found in simulation network."
        )
    return await simulation_service.get_train_live_status(trainNo)
