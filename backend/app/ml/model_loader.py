"""
Model Loader and Schema Validator for XGBoost Delay Predictor.
Ensures single-instance loading and schema integrity.
Phase 2A: XGBoost Model Loader.
"""

import json
import logging
import os
from pathlib import Path
from typing import List, Optional
import joblib

logger = logging.getLogger(__name__)

# Expected canonical feature order from training specification
EXPECTED_FEATURES: List[str] = [
    "hour_of_day",
    "current_accumulated_delay",
    "priority_tier",
    "is_foggy",
    "avg_temperature",
    "total_precipitation",
    "avg_wind_speed",
    "avg_cloud_cover"
]


class ModelManager:
    """
    Singleton manager for loading, caching, and serving the XGBoost ETA model
    and its validated feature schema.
    """
    _instance: Optional["ModelManager"] = None
    _model = None
    _features: Optional[List[str]] = None
    _model_path: Optional[str] = None
    _features_path: Optional[str] = None

    def __new__(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _find_file(self, candidate_names: List[str]) -> Optional[str]:
        """Search for a file in standard project directory locations."""
        current_dir = Path(__file__).resolve().parent  # backend/app/ml
        search_roots = [
            current_dir.parent.parent.parent,          # Project root
            current_dir.parent.parent,                 # backend/
            current_dir,                               # backend/app/ml/
            Path.cwd(),                                # Current working dir
        ]

        for root in search_roots:
            for name in candidate_names:
                candidate = (root / name).resolve()
                if candidate.exists() and candidate.is_file():
                    return str(candidate)
        return None

    def _initialize(self) -> None:
        """Locate and load model and feature schema once."""
        # 1. Resolve Feature Schema Path
        env_feat_path = os.getenv("MODEL_FEATURES_PATH")
        if env_feat_path and os.path.exists(env_feat_path):
            self._features_path = env_feat_path
        else:
            self._features_path = self._find_file([
                "models/model_features.json",
                "model_features.json",
                os.path.join("models", "model_features.json")
            ])

        if not self._features_path:
            raise FileNotFoundError(
                "Could not locate 'model_features.json' in project models/ directory or search paths."
            )

        # 2. Resolve Model File Path
        env_model_path = os.getenv("MODEL_PATH")
        if env_model_path and os.path.exists(env_model_path):
            self._model_path = env_model_path
        else:
            self._model_path = self._find_file([
                "models/xgboost_eta_model.pkl",
                "xgboost_eta_model.pkl",
                os.path.join("models", "xgboost_eta_model.pkl")
            ])

        if not self._model_path:
            raise FileNotFoundError(
                "Could not locate 'xgboost_eta_model.pkl' in project models/ directory or search paths."
            )

        # 3. Load & Validate Features Schema
        with open(self._features_path, "r", encoding="utf-8") as f:
            loaded_features = json.load(f)

        if not isinstance(loaded_features, list):
            raise ValueError(f"Invalid format in {self._features_path}: expected JSON list.")

        if loaded_features != EXPECTED_FEATURES:
            raise ValueError(
                f"Feature schema mismatch in {self._features_path}!\n"
                f"Loaded:   {loaded_features}\n"
                f"Expected: {EXPECTED_FEATURES}"
            )

        self._features = loaded_features
        logger.info(f"Loaded and validated {len(self._features)} features from: {self._features_path}")

        # 4. Load XGBoost Model via Joblib
        logger.info(f"Loading XGBoost model from: {self._model_path}")
        self._model = joblib.load(self._model_path)

        if not hasattr(self._model, "predict"):
            raise TypeError(f"Loaded object from {self._model_path} does not implement 'predict' method.")

        logger.info("XGBoost delay-prediction model successfully loaded into memory.")

    @property
    def model(self):
        """Get the cached XGBoost model instance."""
        if self._model is None:
            self._initialize()
        return self._model

    @property
    def features(self) -> List[str]:
        """Get the validated feature names in strict order."""
        if self._features is None:
            self._initialize()
        return list(self._features)

    @property
    def model_path(self) -> str:
        return self._model_path or ""

    @property
    def features_path(self) -> str:
        return self._features_path or ""


def get_model():
    """Helper function to access the loaded singleton model."""
    return ModelManager().model


def get_feature_names() -> List[str]:
    """Helper function to retrieve canonical feature names."""
    return ModelManager().features
