import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const [topology, setTopology] = useState({ stations: [], sections: [], geojson: null });
  const [trains, setTrains] = useState([]);
  const [activeConflicts, setActiveConflicts] = useState([]);
  const [selectedTrainNo, setSelectedTrainNo] = useState(null);
  const [selectedTrainDetails, setSelectedTrainDetails] = useState(null);
  const [simulationTime, setSimulationTime] = useState('2026-08-28T06:00:00');
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(60.0);
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoadingTopology, setIsLoadingTopology] = useState(true);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const trainStateMapRef = useRef(new Map());

  // 1. Fetch Topology and initial bootstrap
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      try {
        const topData = await api.getTopology();
        if (isMounted) {
          setTopology(topData);
          setIsLoadingTopology(false);
        }
      } catch (err) {
        console.error('Failed to load topology:', err);
        if (isMounted) setIsLoadingTopology(false);
      }

      try {
        const simState = await api.getSimulationState();
        if (isMounted && simState) {
          setSimulationTime(simState.simulation_time);
          setIsRunning(simState.is_running);
          setIsPaused(simState.is_paused);
          setSpeedMultiplier(simState.time_multiplier);
          setActiveConflicts(simState.active_conflicts || []);
          if (simState.trains && simState.trains.length > 0) {
            simState.trains.forEach((t) => trainStateMapRef.current.set(t.train_no, t));
            setTrains([...simState.trains]);
            if (!selectedTrainNo) {
              setSelectedTrainNo(simState.trains[0].train_no);
            }
          }
        }
      } catch (err) {
        console.error('Failed to bootstrap initial simulation state:', err);
      }
    }

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch full train details whenever selectedTrainNo changes
  useEffect(() => {
    if (!selectedTrainNo) {
      setSelectedTrainDetails(null);
      return;
    }

    let isMounted = true;
    async function loadTrain() {
      try {
        const details = await api.getTrainById(selectedTrainNo);
        if (isMounted) {
          setSelectedTrainDetails(details);
        }
      } catch (err) {
        console.warn(`Could not fetch details for train ${selectedTrainNo}:`, err);
      }
    }
    loadTrain();

    return () => {
      isMounted = false;
    };
  }, [selectedTrainNo]);

  // 3. WebSocket Connection & Real-Time Telemetry Stream
  useEffect(() => {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = typeof window !== 'undefined' ? `${protocol}//${window.location.host}/ws` : 'ws://127.0.0.1:8000/ws';
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
    let isMounted = true;

    function connectWs() {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) {
            setWsConnected(true);
            console.log('🔗 WebSocket connected to simulation stream:', wsUrl);
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'full_snapshot') {
              const data = message.data;
              setSimulationTime(data.simulation_time);
              setIsRunning(data.is_running);
              setIsPaused(data.is_paused);
              setSpeedMultiplier(data.time_multiplier);
              setActiveConflicts(data.active_conflicts || []);
              if (data.trains) {
                data.trains.forEach((t) => trainStateMapRef.current.set(t.train_no, t));
                setTrains([...data.trains]);
              }
            } else if (message.type === 'telemetry_delta') {
              const data = message.data;
              setSimulationTime(data.simulation_time);
              setIsRunning(data.is_running);
              setIsPaused(data.is_paused);
              setSpeedMultiplier(data.time_multiplier);
              setActiveConflicts(data.active_conflicts || []);

              if (data.trains && data.trains.length > 0) {
                data.trains.forEach((delta) => {
                  const existing = trainStateMapRef.current.get(delta.train_no) || {};
                  trainStateMapRef.current.set(delta.train_no, {
                    ...existing,
                    ...delta,
                  });
                });
                setTrains(Array.from(trainStateMapRef.current.values()));
              }
            }
          } catch (e) {
            // handle pong or plain text
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setWsConnected(false);
            console.log('WebSocket disconnected. Reconnecting in 3s...');
            reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = (err) => {
          if (!isMounted) return;
          // Suppress noise during hot reloads or server restarts
          console.debug('WebSocket stream notice:', err);
        };
      } catch (err) {
        if (isMounted) {
          console.debug('Failed to create WebSocket:', err);
          reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
        }
      }
    }

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        const socket = wsRef.current;
        // Suppress browser "closed before connection established" warning during React StrictMode remounts
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try { socket.close(); } catch (_) {}
          };
        } else if (socket.readyState === WebSocket.OPEN) {
          try { socket.close(); } catch (_) {}
        }
      }
    };
  }, []);

  // 3B. High-Reliability Polling Fallback if WebSocket is disconnected or reconnecting
  useEffect(() => {
    if (wsConnected) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const simState = await api.getSimulationState();
        if (isMounted && simState && Array.isArray(simState.trains)) {
          setSimulationTime(simState.simulation_time);
          setIsRunning(simState.is_running);
          setIsPaused(simState.is_paused);
          setSpeedMultiplier(simState.time_multiplier);
          setActiveConflicts(simState.active_conflicts || []);
          simState.trains.forEach((t) => trainStateMapRef.current.set(t.train_no, t));
          setTrains(Array.from(trainStateMapRef.current.values()));
        }
      } catch (err) {
        // Quiet fallback
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [wsConnected]);

  // 4. Control Handlers
  const pauseSimulation = useCallback(async () => {
    try {
      const res = await api.pauseSimulation();
      setIsPaused(true);
      return res;
    } catch (e) {
      console.error('Failed to pause simulation:', e);
    }
  }, []);

  const resumeSimulation = useCallback(async () => {
    try {
      const res = await api.resumeSimulation();
      setIsPaused(false);
      setIsRunning(true);
      return res;
    } catch (e) {
      console.error('Failed to resume simulation:', e);
    }
  }, []);

  const resetSimulation = useCallback(async (initTime = null) => {
    try {
      const res = await api.resetSimulation(initTime);
      trainStateMapRef.current.clear();
      setIsPaused(false);
      setIsRunning(true);
      // Reload simulation state
      const simState = await api.getSimulationState();
      if (simState) {
        setSimulationTime(simState.simulation_time);
        if (simState.trains) {
          simState.trains.forEach((t) => trainStateMapRef.current.set(t.train_no, t));
          setTrains([...simState.trains]);
        }
      }
      return res;
    } catch (e) {
      console.error('Failed to reset simulation:', e);
    }
  }, []);

  const setSpeed = useCallback(async (speed) => {
    try {
      const res = await api.setSimulationSpeed(speed);
      setSpeedMultiplier(res.time_multiplier || speed);
      return res;
    } catch (e) {
      console.error('Failed to set simulation speed:', e);
    }
  }, []);

  const selectedTrain = trains.find((t) => t.train_no === selectedTrainNo) || selectedTrainDetails || (trains.length > 0 ? trains[0] : null);

  const value = {
    topology,
    isLoadingTopology,
    trains,
    activeConflicts,
    selectedTrainNo: selectedTrain?.train_no || selectedTrainNo,
    selectedTrain,
    selectedTrainDetails,
    setSelectedTrainNo,
    simulationTime,
    isRunning,
    isPaused,
    speedMultiplier,
    wsConnected,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    setSpeed,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}

export default SimulationContext;
