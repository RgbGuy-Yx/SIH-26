# Data Directory

This directory contains the dataset assets and data pipelines for the Indian Railways ETA Forecasting & Conflict Resolution Engine.

## Directory Structure
- `raw/` — Original ingested datasets (raw timetable CSVs, train schedules, station listings).
- `processed/` — Curated feature tables and cleaned training datasets.
- `weather/` — Historical and cached station-level weather feeds (temperature, precipitation, wind, cloud cover, fog).
- `stations/` — Station master coordinates, operational zones, and topology reference tables.

*Note: Initial setup phase. Raw and processed data will be populated during data pipeline integration.*
