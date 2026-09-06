from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Path, Query

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
    trainNo: int = Path(..., description="Train Number (e.g. 12003, 12919)")
):
    """
    Retrieve live train status (via RailRadar/RailKit/Mock with caching & deduplication)
    alongside simulation state. Decoupled and resilient against API failures.
    """
    return await simulation_service.get_train_live_status(trainNo)


@router.get("/{trainNo}/route", response_model=Dict[str, Any])
async def get_train_route(
    trainNo: int = Path(..., description="Train Number (e.g. 12919, 12003)"),
    forceRefresh: bool = Query(default=False, description="Bypass 24-hour cache and fetch fresh from provider")
):
    """
    Retrieve official track route and geometry from RailRadar (cached for 24 hours):
    GET https://api.railradar.in/v1/trains/{number}/route?stops=true
    """
    from app.integrations.live_provider import get_live_provider
    provider = get_live_provider()
    res = await provider.get_train_route(trainNo, stops=True, force_refresh=forceRefresh)
    if res.get("success"):
        return res
    raise HTTPException(status_code=404, detail=f"Route not found for train {trainNo}: {res.get('error')}")
