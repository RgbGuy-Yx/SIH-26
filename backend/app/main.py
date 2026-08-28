"""
Real-Time Network-Aware ETA Forecasting & Conflict Resolution Engine
FastAPI Application Entry Point (Foundation Setup)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Indian Railways ETA & Conflict Resolution Engine",
    description="Backend API service for real-time ETA forecasting, simulation, and network-aware conflict resolution.",
    version="0.1.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "Indian Railways ETA Forecasting Engine",
        "status": "ready",
        "version": "0.1.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
