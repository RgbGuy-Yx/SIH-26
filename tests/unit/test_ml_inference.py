"""
Unit Tests for Phase 2A: ML Inference, Feature Building, ETA, and Transit Time Calculations.
Root test runner entry point.
"""

import sys
from pathlib import Path

# Ensure backend/ is in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from tests.test_ml_inference import *  # Re-export all tests for root discovery
