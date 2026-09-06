import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Fallback style if offline or external tiles fail
const FALLBACK_DARK_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
      paint: {
        'raster-opacity': 0.35,
        'raster-brightness-max': 0.4,
        'raster-contrast': 0.2,
      },
    },
  ],
};

export function MapLibreRailwayMap({
  topology,
  trains = [],
  selectedTrainNo = null,
  onSelectTrain,
  selectedStation = null,
  onSelectStation,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersMapRef = useRef(new Map()); // train_no -> maplibregl.Marker
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState('corridor'); // 'corridor' | 'all'
  const hasAutoFittedRef = useRef(false);

  // 1. Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let mapInstance;
    try {
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: CARTO_DARK_STYLE,
        center: [80.8, 25.5], // Centered on trunk national corridor
        zoom: 6.2,
        minZoom: 3.5,
        maxZoom: 17,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });
    } catch (e) {
      console.warn('Falling back to raster dark tiles for MapLibre:', e);
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: FALLBACK_DARK_STYLE,
        center: [80.8, 25.5],
        zoom: 6.2,
        minZoom: 3.5,
        maxZoom: 17,
        attributionControl: false,
      });
    }

    // Add navigation controls (zoom in/out)
    mapInstance.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      'bottom-right'
    );

    mapInstance.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = mapInstance;

    return () => {
      // Clean up markers
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Add Railway Tracks and Stations GeoJSON Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !topology || !topology.geojson) return;

    const { tracks, stations } = topology.geojson;

    // --- TRACKS LAYER ---
    if (!map.getSource('railway-tracks')) {
      map.addSource('railway-tracks', {
        type: 'geojson',
        data: tracks,
      });

      // Track glow (ambient outer halo)
      map.addLayer({
        id: 'railway-tracks-glow',
        type: 'line',
        source: 'railway-tracks',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 5,
          'line-blur': 4,
          'line-opacity': 0.7,
        },
      });

      // Track core line
      map.addLayer({
        id: 'railway-tracks-line',
        type: 'line',
        source: 'railway-tracks',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#60a5fa',
          'line-width': 2.2,
          'line-opacity': 0.95,
        },
      });

      // Track centerline dash
      map.addLayer({
        id: 'railway-tracks-inner-dash',
        type: 'line',
        source: 'railway-tracks',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 0.8,
          'line-dasharray': [3, 4],
          'line-opacity': 0.6,
        },
      });
    } else {
      map.getSource('railway-tracks').setData(tracks);
    }

    // --- STATIONS LAYER ---
    if (!map.getSource('railway-stations')) {
      map.addSource('railway-stations', {
        type: 'geojson',
        data: stations,
      });

      // Outer circle
      map.addLayer({
        id: 'railway-stations-halo',
        type: 'circle',
        source: 'railway-stations',
        paint: {
          'circle-radius': 6.5,
          'circle-color': '#030e20',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#3b82f6',
        },
      });

      // Inner dot
      map.addLayer({
        id: 'railway-stations-dot',
        type: 'circle',
        source: 'railway-stations',
        paint: {
          'circle-radius': 2.5,
          'circle-color': '#93c5fd',
        },
      });

      // Station Labels
      map.addLayer({
        id: 'railway-stations-label',
        type: 'symbol',
        source: 'railway-stations',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.75],
          'text-max-width': 8,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#d8e3fc',
          'text-halo-color': '#030e20',
          'text-halo-width': 1.5,
        },
      });

      // Station Mouse Handlers (Pointer cursor only, no popups)
      map.on('mouseenter', 'railway-stations-halo', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'railway-stations-halo', () => {
        map.getCanvas().style.cursor = '';
      });

      // Station Click Handlers (Select station in telemetry/corridor view)
      map.on('click', 'railway-stations-halo', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const { station_id, name } = feature.properties;
        if (onSelectStation) {
          onSelectStation(`${name} (${station_id})`);
        }
      });
    } else {
      map.getSource('railway-stations').setData(stations);
    }

    // Auto-fit bounds on first successful load
    if (!hasAutoFittedRef.current && topology.stations && topology.stations.length > 0) {
      let minLon = 180,
        maxLon = -180,
        minLat = 90,
        maxLat = -90;
      let validCount = 0;
      topology.stations.forEach((s) => {
        const lon = s.longitude;
        const lat = s.latitude;
        if (lon && lat && !isNaN(lon) && !isNaN(lat)) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          validCount++;
        }
      });
      if (validCount > 0 && minLon < maxLon && minLat < maxLat) {
        map.fitBounds(
          [
            [minLon - 0.5, minLat - 0.5],
            [maxLon + 0.5, maxLat + 0.5],
          ],
          { padding: 40, duration: 1000 }
        );
        hasAutoFittedRef.current = true;
      }
    }
  }, [mapLoaded, topology, selectedTrainNo, onSelectStation]);

  // 3. Dynamic Train Markers (Continuous Updates from Simulation Delta)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !trains) return;

    const currentTrainNos = new Set();

    trains.forEach((train) => {
      const trainNo = train.train_no;
      const lat = train.latitude || (train.position && train.position.latitude);
      const lon = train.longitude || (train.position && train.position.longitude);

      if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
        return;
      }

      currentTrainNos.add(trainNo);
      const isSelected = selectedTrainNo === trainNo;
      const isDelayed = (train.final_predicted_delay || 0) > 15 || (train.current_accumulated_delay || 0) > 15;
      const isTier1 = train.priority_tier === 1;
      const isTier2 = train.priority_tier === 2;

      // Unified Color scheme for 2D Vector Train Model
      const primaryColor = isDelayed ? '#ef4444' : isTier1 ? '#3b82f6' : isTier2 ? '#f43f5e' : '#64748b';
      const secondaryColor = isDelayed ? '#450a0a' : isTier1 ? '#1e3a8a' : isTier2 ? '#4c0519' : '#1e293b';
      const strokeColor = isSelected ? '#38bdf8' : '#cbd5e1';
      const ringClass = isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#030e20]' : '';

      const markerHtml = `
        <div class="train-model-container cursor-pointer transition-all duration-300 hover:scale-125 flex flex-col items-center select-none">
          <!-- 2D Vector Train Locomotive Model -->
          <div class="relative flex items-center justify-center p-1 rounded-full bg-[#030e20]/95 border border-slate-700/80 shadow-xl ${ringClass}">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Locomotive Chassis -->
              <rect x="6" y="4" width="16" height="20" rx="6" fill="${secondaryColor}" stroke="${strokeColor}" stroke-width="1.2" />
              <!-- Aerodynamic Cab Nose -->
              <path d="M8 8C8 5.79086 9.79086 4 12 4H16C18.2091 4 20 5.79086 20 8V11H8V8Z" fill="${primaryColor}" />
              <!-- Windshield Glass -->
              <rect x="9.5" y="7" width="9" height="3" rx="0.75" fill="#020617" />
              <!-- Center Livery Stripe -->
              <rect x="13" y="11" width="2" height="8" rx="0.5" fill="#ffffff" fill-opacity="0.85" />
              <!-- Headlights -->
              <circle cx="10" cy="19" r="1.3" fill="${isDelayed ? '#fca5a5' : '#fef08a'}" />
              <circle cx="18" cy="19" r="1.3" fill="${isDelayed ? '#fca5a5' : '#fef08a'}" />
              <!-- Front Cowcatcher Bumper -->
              <line x1="8" y1="21.5" x2="20" y2="21.5" stroke="${primaryColor}" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>

          <!-- Minimal Monospace Train ID Pill -->
          <div class="mt-0.5 px-1.5 py-0.5 rounded bg-[#030e20]/90 border border-slate-800 shadow-md pointer-events-none">
            <span class="font-mono text-[9px] font-bold text-slate-200 tracking-tight leading-none">${trainNo}</span>
          </div>
        </div>
      `;

      let marker = markersMapRef.current.get(trainNo);

      if (!marker) {
        // Create new DOM marker element
        const el = document.createElement('div');
        el.className = 'train-marker-wrapper';
        el.style.zIndex = isSelected ? '40' : '20';
        el.innerHTML = markerHtml;

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (onSelectTrain) {
            onSelectTrain(trainNo);
          }
        });

        marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lon, lat])
          .addTo(map);

        markersMapRef.current.set(trainNo, marker);
      } else {
        // Update existing marker position smoothly
        marker.setLngLat([lon, lat]);

        // Update DOM element content and selection state
        const el = marker.getElement();
        el.style.zIndex = isSelected ? '40' : '20';
        el.innerHTML = markerHtml;
      }
    });

    // Remove markers for trains no longer present
    markersMapRef.current.forEach((marker, trainNo) => {
      if (!currentTrainNos.has(trainNo)) {
        marker.remove();
        markersMapRef.current.delete(trainNo);
      }
    });
  }, [trains, selectedTrainNo, mapLoaded, onSelectTrain]);

  // Reset to NDLS-BSB trunk corridor view
  const handleResetCorridor = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [80.8, 25.5],
        zoom: 6.2,
        pitch: 0,
        bearing: 0,
        essential: true,
      });
      setViewMode('corridor');
    }
  };

  // Fit all stations across the entire national railway network
  const handleFitAllNetwork = () => {
    if (!mapRef.current) return;
    if (topology?.stations && topology.stations.length > 0) {
      let minLon = 180,
        maxLon = -180,
        minLat = 90,
        maxLat = -90;
      let validCount = 0;
      topology.stations.forEach((s) => {
        const lon = s.longitude;
        const lat = s.latitude;
        if (lon && lat && !isNaN(lon) && !isNaN(lat)) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          validCount++;
        }
      });
      if (validCount > 0 && minLon < maxLon && minLat < maxLat) {
        mapRef.current.fitBounds(
          [
            [minLon - 0.8, minLat - 0.8],
            [maxLon + 0.8, maxLat + 0.8],
          ],
          { padding: 50, essential: true, duration: 1200 }
        );
        setViewMode('all');
        return;
      }
    }
    // Fallback national bounds (Delhi - Bihar - Bengal - Central - Maharashtra)
    mapRef.current.fitBounds(
      [
        [72.5, 16.5],
        [89.5, 29.8],
      ],
      { padding: 50, essential: true, duration: 1200 }
    );
    setViewMode('all');
  };

  // Focus selected train helper
  const handleFocusSelectedTrain = () => {
    if (!selectedTrainNo || !mapRef.current) return;
    const target = trains.find((t) => t.train_no === selectedTrainNo);
    if (target) {
      const lat = target.latitude || (target.position && target.position.latitude);
      const lon = target.longitude || (target.position && target.position.longitude);
      if (lat && lon) {
        mapRef.current.flyTo({
          center: [lon, lat],
          zoom: 9.5,
          essential: true,
        });
      }
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[580px]" />

      {/* Top Viewport Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-slate-950/95 via-slate-950/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            {viewMode === 'all'
              ? 'National NetworkX Topology (184 Stations • 188 Sections)'
              : 'Live Section Topology: NDLS – BSB Trunk Corridor'}
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-300 pointer-events-auto">
          {/* Toggle Full Network / Corridor View */}
          <button
            type="button"
            onClick={viewMode === 'all' ? handleResetCorridor : handleFitAllNetwork}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 shadow-sm ${
              viewMode === 'all'
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
            title="View entire national railway network"
          >
            <span className="material-symbols-outlined text-[15px]">
              {viewMode === 'all' ? 'alt_route' : 'public'}
            </span>
            <span>{viewMode === 'all' ? 'Trunk Corridor' : 'Full Network'}</span>
          </button>

          {/* Focus Selected Train */}
          <button
            type="button"
            onClick={handleFocusSelectedTrain}
            className="px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-200 text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
            title="Pan camera to selected train"
          >
            <span className="material-symbols-outlined text-[14px]">center_focus_strong</span>
            <span>Focus Train</span>
          </button>
        </div>
      </div>

      {/* Bottom Map Legend Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-4 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent flex flex-wrap items-center justify-between text-xs text-slate-300 border-t border-slate-800/40 pointer-events-auto">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 rounded bg-blue-500"></span>
            <span>Trunk Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-300"></span>
            <span>Train Model</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-300"></span>
            <span>Delayed (&gt;15m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-blue-400 bg-slate-900"></span>
            <span>Station Node ({topology?.stations?.length || 184})</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-mono text-[11px]">
            Active Fleet: <strong className="text-blue-400">{trains.length}</strong>
          </span>
          {selectedStation && (
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
              Selected: <span className="text-slate-200">{selectedStation}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapLibreRailwayMap;
