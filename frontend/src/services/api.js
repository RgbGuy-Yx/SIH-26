import axios from 'axios';
import { searchStaticStations } from '../data/indianStations';

const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-Memory 1-Hour TTL Cache for Static Train Schedules
const SCHEDULE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour TTL
const trainScheduleCache = new Map();

export const api = {
  // Railway Network Topology & GeoJSON
  getTopology: async () => {
    const res = await client.get('/api/simulation/topology');
    return res.data;
  },

  // Trains
  getTrains: async () => {
    const res = await client.get('/api/trains');
    return res.data;
  },

  getTrainById: async (trainNo) => {
    const res = await client.get(`/api/trains/${trainNo}`);
    return res.data;
  },

  getTrainEta: async (trainNo) => {
    const res = await client.get(`/api/trains/${trainNo}/eta`);
    return res.data;
  },

  getTrainConflicts: async (trainNo) => {
    const res = await client.get(`/api/trains/${trainNo}/conflicts`);
    return res.data;
  },

  getTrainLiveStatus: async (trainNo) => {
    const res = await client.get(`/api/trains/${trainNo}/live-status`);
    return res.data;
  },

  getTrainRoute: async (trainNo) => {
    const res = await client.get(`/api/trains/${trainNo}/route`);
    return res.data;
  },

  // RailRadar V1 Dynamic Passenger Search & Telemetry
  getTrainsBetween: async (fromStation, toStation, date = null) => {
    const params = date ? { date } : {};
    const res = await client.get(
      `/v1/trains/between/${encodeURIComponent(fromStation)}/${encodeURIComponent(toStation)}`,
      { params }
    );
    return res.data;
  },

  /**
   * Cached Train Static Schedule (Stations, Halts, Distance, Timetables)
   * Caches in-memory with a 1-hour TTL to prevent redundant 200KB+ JSON downloads on live refreshes.
   */
  getTrainSchedule: async (trainNo, forceRefresh = false) => {
    const key = String(trainNo).trim();
    const now = Date.now();

    if (!forceRefresh && trainScheduleCache.has(key)) {
      const cached = trainScheduleCache.get(key);
      if (now - cached.timestamp < SCHEDULE_CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const res = await client.get(`/v1/trains/${key}`);
    trainScheduleCache.set(key, {
      data: res.data,
      timestamp: now,
    });
    return res.data;
  },

  clearTrainScheduleCache: (trainNo = null) => {
    if (trainNo) {
      trainScheduleCache.delete(String(trainNo).trim());
    } else {
      trainScheduleCache.clear();
    }
  },

  getTrainLive: async (trainNo, journeyDate = null) => {
    const params = journeyDate ? { date: journeyDate } : {};
    const res = await client.get(`/v1/trains/${trainNo}/live`, { params });
    return res.data;
  },

  // Instant In-Memory Station Search (Zero Network Latency / No Remote Lookup API)
  searchStations: async (query, _forceRefresh = false) => {
    const results = searchStaticStations(query, 20);
    return {
      success: true,
      data: results,
      source: 'static_dataset',
      timestamp: new Date().toISOString(),
    };
  },


  // Simulation Controls
  getSimulationState: async () => {
    const res = await client.get('/api/simulation/state');
    return res.data;
  },

  pauseSimulation: async () => {
    const res = await client.post('/api/simulation/pause');
    return res.data;
  },

  resumeSimulation: async () => {
    const res = await client.post('/api/simulation/resume');
    return res.data;
  },

  resetSimulation: async (initialTime = null) => {
    const res = await client.post('/api/simulation/reset', initialTime ? { initial_time: initialTime } : {});
    return res.data;
  },

  setSimulationSpeed: async (speed) => {
    const res = await client.post('/api/simulation/speed', { speed: parseFloat(speed) });
    return res.data;
  },

  stepSimulation: async (deltaSeconds = null) => {
    const res = await client.post('/api/simulation/step', deltaSeconds ? { delta_seconds: deltaSeconds } : {});
    return res.data;
  },
};

export default api;
