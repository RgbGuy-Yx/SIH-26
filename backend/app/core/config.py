"""
Core Configuration and Environment Settings.
Phase 3B: REST API, WebSocket Delivery Layer, and Live Provider Settings.
Loads configuration from .env files and environment variables.
"""

import os
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Locate and load .env file from candidate directories
_current_dir = Path(__file__).resolve().parent  # backend/app/core
_candidates = [
    _current_dir.parent.parent / ".env",        # backend/.env
    Path.cwd() / ".env",                        # current_working_dir/.env
    Path.cwd() / "backend" / ".env",            # current_working_dir/backend/.env
    _current_dir.parents[2] / ".env",           # root workspace .env
]

for _cand in _candidates:
    if _cand.exists() and _cand.is_file():
        load_dotenv(dotenv_path=_cand, override=False)
        break


class Settings(BaseModel):
    """Application settings loaded from environment variables or defaults."""

    PROJECT_NAME: str = "Indian Railways Real-Time ETA & Conflict Resolution Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = Field(default_factory=lambda: os.environ.get("ENVIRONMENT", "development"))
    LOG_LEVEL: str = Field(default_factory=lambda: os.environ.get("LOG_LEVEL", "INFO"))

    # Server Configuration
    HOST: str = Field(default_factory=lambda: os.environ.get("HOST", "127.0.0.1"))
    PORT: int = Field(default_factory=lambda: int(os.environ.get("PORT", "8000")))

    # Live Train Provider Configuration (RailRadar / Mock)
    LIVE_TRAIN_PROVIDER: str = Field(
        default_factory=lambda: os.environ.get("LIVE_TRAIN_PROVIDER", "railradar")
    )
    RAILRADAR_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.environ.get("RAILRADAR_API_KEY", None)
    )
    RAILRADAR_BASE_URL: str = Field(
        default_factory=lambda: os.environ.get("RAILRADAR_BASE_URL", os.environ.get("RAILRADAR_API_URL", "https://api.railradar.in/v1"))
    )

    # Secondary APIs & Weather
    OPEN_METEO_BASE_URL: str = Field(
        default_factory=lambda: os.environ.get("OPEN_METEO_BASE_URL", "https://archive-api.open-meteo.com/v1/archive")
    )
    GEMINI_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.environ.get("GEMINI_API_KEY", None)
    )

    # Artifact & Dataset Paths
    DATASET_PATH: str = Field(
        default_factory=lambda: os.environ.get("DATASET_PATH", "final_training_features.csv")
    )
    MODEL_PATH: str = Field(
        default_factory=lambda: os.environ.get("MODEL_PATH", "models/xgboost_eta_model.pkl")
    )
    MODEL_FEATURES_PATH: str = Field(
        default_factory=lambda: os.environ.get("MODEL_FEATURES_PATH", "models/model_features.json")
    )

    # Caching & Rate Limiting
    CACHE_TTL_SECONDS: int = Field(
        default_factory=lambda: int(os.environ.get("CACHE_TTL_SECONDS", "120"))
    )
    LIVE_STATUS_CACHE_TTL_SECONDS: int = Field(
        default_factory=lambda: int(os.environ.get("LIVE_STATUS_CACHE_TTL_SECONDS", "120"))
    )
    WEATHER_CACHE_TTL_SECONDS: int = Field(
        default_factory=lambda: int(os.environ.get("WEATHER_CACHE_TTL_SECONDS", "300"))
    )

    # WebSocket & Broadcast Timings
    WS_BROADCAST_RATE_SECONDS: float = Field(
        default_factory=lambda: float(os.environ.get("WS_BROADCAST_RATE_SECONDS", "1.0"))
    )
    WEBSOCKET_BROADCAST_INTERVAL_SECONDS: float = Field(
        default_factory=lambda: float(os.environ.get("WEBSOCKET_BROADCAST_INTERVAL_SECONDS", "1.0"))
    )

    # Simulation Defaults
    DATA_MODE: str = Field(
        default_factory=lambda: os.environ.get("DATA_MODE", "hybrid")
    )
    DEFAULT_DATA_MODE: str = Field(
        default_factory=lambda: os.environ.get("DEFAULT_DATA_MODE", "SIMULATION")
    )
    SIMULATION_DEFAULT_SPEED: float = Field(
        default_factory=lambda: float(os.environ.get("SIMULATION_DEFAULT_SPEED", "60.0"))
    )
    SIMULATION_TICK_SECONDS: float = Field(
        default_factory=lambda: float(os.environ.get("SIMULATION_TICK_SECONDS", "1.0"))
    )

    # CORS
    CORS_ORIGINS: List[str] = ["*"]


settings = Settings()
