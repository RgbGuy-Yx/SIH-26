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


@router.get("/between/{from_station}/{to_station}", response_model=Dict[str, Any])
async def get_trains_between_alias(
    from_station: str = Path(..., description="Origin Station Code"),
    to_station: str = Path(..., description="Destination Station Code"),
    date: str = Query(default=None, description="Journey date YYYY-MM-DD")
):
    """Alias for /v1/trains/between/{from}/{to} on the /api prefix."""
    return await v1_get_trains_between(from_station, to_station, date)


@router.get("/search/stations", response_model=Dict[str, Any])
async def get_stations_search_alias(
    q: str = Query(default=""),
    query: str = Query(default=None),
    forceRefresh: bool = Query(default=False)
):
    """Alias for station autocomplete on /api/trains/search/stations."""
    from app.integrations.live_provider import get_live_provider
    search_term = q or query or ""
    provider = get_live_provider()
    return await provider.search_stations(search_term, force_refresh=forceRefresh)


# Direct /v1/trains Router for Between Stations Search
v1_router = APIRouter(prefix="/v1/trains", tags=["RailRadar V1 Trains"])


@v1_router.get("/between/{from_station}/{to_station}", response_model=Dict[str, Any])
async def v1_get_trains_between(
    from_station: str = Path(..., description="Origin Station Code (e.g. NDLS, HWH)"),
    to_station: str = Path(..., description="Destination Station Code (e.g. LJN, NDLS)"),
    date: str = Query(default=None, description="Optional Journey date YYYY-MM-DD")
):
    """
    Retrieve all trains operating between source and destination stations.
    Matches: GET /v1/trains/between/{from}/{to}
    """
    from app.integrations.live_provider import get_live_provider
    provider = get_live_provider()
    try:
        res = await provider.get_trains_between(from_station, to_station, journey_date=date)
        if isinstance(res, dict) and res.get("success"):
            return res
        if isinstance(res, dict) and "data" in res:
            return res
    except Exception as e:
        logger.error(f"Error in v1_get_trains_between: {e}")

    return {
        "success": True,
        "data": {
            "from": {"code": from_station.upper(), "name": from_station.upper()},
            "to": {"code": to_station.upper(), "name": to_station.upper()},
            "trains": [],
            "count": 0
        },
        "meta": {"source": "fallback", "message": f"No trains currently found between {from_station} and {to_station}"}
    }


@v1_router.get("/{trainNo}", response_model=Dict[str, Any])
async def v1_get_train_info(
    trainNo: int = Path(..., description="Train Number (e.g. 12919, 12003)"),
    forceRefresh: bool = Query(default=False, description="Bypass cache")
):
    """
    Retrieve official train schedule, timetable, stations, and platforms from RailRadar API.
    Matches: GET /v1/trains/{number}
    """
    from app.integrations.live_provider import get_live_provider
    provider = get_live_provider()
    res = await provider.get_train_info(trainNo, force_refresh=forceRefresh)
    if isinstance(res, dict) and res.get("success"):
        return res
    return {
        "success": True,
        "data": {
            "train": {"number": str(trainNo), "name": f"Train #{trainNo}"},
            "route": []
        }
    }


@v1_router.get("/{trainNo}/live", response_model=Dict[str, Any])
async def v1_get_train_live(
    trainNo: int = Path(..., description="Train Number (e.g. 12919, 12003)"),
    date: str = Query(default=None, description="Optional Journey date YYYY-MM-DD")
):
    """
    Retrieve live running status, GPS position, current delay, speed, and actual times.
    Matches: GET /v1/trains/{number}/live
    """
    from app.integrations.live_provider import get_live_provider
    provider = get_live_provider()
    res = await provider.get_live_train_status(trainNo, journey_date=date)
    res_dict = res.dict()
    if "data" not in res_dict or not res_dict["data"]:
        res_dict["data"] = res_dict.get("raw_data") or res_dict
    return res_dict


# Dedicated /v1/lookup Router for Station Autocomplete & Searches
v1_lookup_router = APIRouter(prefix="/v1/lookup", tags=["RailRadar V1 Lookup"])


@v1_lookup_router.get("/search/stations", response_model=Dict[str, Any])
async def v1_search_stations(
    q: str = Query(default="", description="Search query string for station name, code or city"),
    query: str = Query(default=None, description="Alternative alias for search query"),
    forceRefresh: bool = Query(default=False, description="Bypass 24-hr station search cache")
):
    """
    Search stations by name, code or city from RailRadar lookup endpoint.
    Matches: GET /v1/lookup/search/stations?q={query}
    """
    from app.integrations.live_provider import get_live_provider
    search_term = q or query or ""
    provider = get_live_provider()
    res = await provider.search_stations(search_term, force_refresh=forceRefresh)
    if isinstance(res, dict) and res.get("success"):
        return res
    return {
        "success": True,
        "data": [],
        "meta": {"query": search_term, "fallback": True}
    }


# Also provide alias on v1_router for convenience
@v1_router.get("/lookup/search/stations", response_model=Dict[str, Any])
async def v1_search_stations_alias(
    q: str = Query(default="", description="Search query string for station name, code or city"),
    query: str = Query(default=None, description="Alternative alias for search query"),
    forceRefresh: bool = Query(default=False, description="Bypass 24-hr station search cache")
):
    from app.integrations.live_provider import get_live_provider
    search_term = q or query or ""
    provider = get_live_provider()
    return await provider.search_stations(search_term, force_refresh=forceRefresh)



