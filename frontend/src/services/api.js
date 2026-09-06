import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
