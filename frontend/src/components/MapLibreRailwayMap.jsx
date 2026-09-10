import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// 1. Clean Minimal Light Vector Basemap Style (matching Konux reference aesthetic)
const CARTO_POSITRON_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Fallback style if external tiles fail or offline
const FALLBACK_LIGHT_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#F4F5F7',
      },
    },
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
      paint: {
        'raster-opacity': 0.15,
        'raster-saturation': -0.9,
      },
    },
  ],
};

// Fallback stations to ensure national mesh is always visible
const FALLBACK_NATIONAL_STATIONS = [
  { station_id: 'NDLS', name: 'New Delhi', longitude: 77.2197, latitude: 28.6139 },
  { station_id: 'GZB', name: 'Ghaziabad', longitude: 77.4538, latitude: 28.6692 },
  { station_id: 'ALJN', name: 'Aligarh Junction', longitude: 78.0880, latitude: 27.8974 },
  { station_id: 'TDL', name: 'Tundla Junction', longitude: 78.2415, latitude: 27.2081 },
  { station_id: 'CNB', name: 'Kanpur Central', longitude: 80.3537, latitude: 26.4539 },
  { station_id: 'LJN', name: 'Lucknow Junction', longitude: 80.9234, latitude: 26.8322 },
  { station_id: 'PRYJ', name: 'Prayagraj Junction', longitude: 81.8340, latitude: 25.4358 },
  { station_id: 'BSB', name: 'Varanasi Junction', longitude: 82.9739, latitude: 25.3284 },
  { station_id: 'DDU', name: 'Pt. Deen Dayal Upadhyaya', longitude: 83.1189, latitude: 25.2818 },
];

/**
 * Orthogonal Point-to-Polyline Projector (Railway Track Snapping Engine)
 * Snaps raw GPS telemetry [lng, lat] to the closest railway track segment
 * and computes the exact directional track tangent heading.
 */
function snapPointToTrack(targetLng, targetLat, polylines) {
  if (!polylines || polylines.length === 0) {
    return { lng: targetLng, lat: targetLat, bearing: null, snapped: false, offsetKm: 0 };
  }

  let minDistanceSq = Infinity;
  let bestProj = [targetLng, targetLat];
  let bestBearing = 0;
  let found = false;

  polylines.forEach((coords) => {
    if (!coords || coords.length < 2) return;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      if (!p1 || !p2 || p1.length < 2 || p2.length < 2) continue;

      const x1 = Number(p1[0]);
      const y1 = Number(p1[1]);
      const x2 = Number(p2[0]);
      const y2 = Number(p2[1]);

      const dx = x2 - x1;
      const dy = y2 - y1;
      const segLenSq = dx * dx + dy * dy;

      if (segLenSq === 0) continue;

      // Projection scalar t along line segment [p1, p2]
      let t = ((targetLng - x1) * dx + (targetLat - y1) * dy) / segLenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = x1 + t * dx;
      const projY = y1 + t * dy;

      const distSq = (targetLng - projX) * (targetLng - projX) + (targetLat - projY) * (targetLat - projY);
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        bestProj = [projX, projY];
        found = true;

        // Spherical tangent bearing in degrees clockwise from North
        const avgLatRad = ((y1 + y2) / 2) * (Math.PI / 180);
        const rad = Math.atan2(dx * Math.cos(avgLatRad), dy);
        bestBearing = (rad * (180 / Math.PI) + 360) % 360;
      }
    }
  });

  // Snapping corridor threshold: ~0.25 degrees (~25 km corridor radius)
  if (found && minDistanceSq < 0.06) {
    return {
      lng: bestProj[0],
      lat: bestProj[1],
      bearing: Math.round(bestBearing),
      snapped: true,
      offsetKm: Number((Math.sqrt(minDistanceSq) * 111.32).toFixed(2)),
    };
  }

  return { lng: targetLng, lat: targetLat, bearing: null, snapped: false, offsetKm: 0 };
}

export const MapLibreRailwayMap = forwardRef(function MapLibreRailwayMap(
  {
    topology,
    trains = [],
    selectedTrainNo = null,
    onSelectTrain,
    selectedStation = null,
    onSelectStation,
    selectedSwitchId = null,
    onSelectSwitch,
    liveTrainData = null,
    showLiveFeed = true,
    showVirtualSim = true,
    onToggleHideLiveFeed = null,
  },
  ref
) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersMapRef = useRef(new Map());
  const hubMarkersMapRef = useRef(new Map());
  const pathLabelMarkerRef = useRef(null);
  const tooltipMarkerRef = useRef(null);
  const pointerAnchorMarkerRef = useRef(null);
  const liveTrainMarkerRef = useRef(null);
  const liveTrainPopupRef = useRef(null);
  const lastFlownLiveTrainRef = useRef(null);
  const onSelectTrainRef = useRef(onSelectTrain);
  useEffect(() => {
    onSelectTrainRef.current = onSelectTrain;
  }, [onSelectTrain]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState('corridor'); // 'corridor' | 'all'
  const hasAutoFittedRef = useRef(false);

  // 1. Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let mapInstance;
    try {
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: CARTO_POSITRON_STYLE,
        center: [80.5, 26.2], // Centered on trunk corridor (Delhi-Kanpur-Varanasi)
        zoom: 6.5,
        minZoom: 3.5,
        maxZoom: 17,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });
    } catch {
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: FALLBACK_LIGHT_STYLE,
        center: [80.5, 26.2],
        zoom: 6.5,
        minZoom: 3.5,
        maxZoom: 17,
        attributionControl: false,
      });
    }

    mapInstance.on('load', () => {
      setMapLoaded(true);
      setTimeout(() => {
        mapInstance.resize();
      }, 100);
    });

    mapRef.current = mapInstance;

    return () => {
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
      hubMarkersMapRef.current.forEach((marker) => marker.remove());
      hubMarkersMapRef.current.clear();
      if (pathLabelMarkerRef.current) pathLabelMarkerRef.current.remove();
      if (tooltipMarkerRef.current) tooltipMarkerRef.current.remove();
      if (pointerAnchorMarkerRef.current) pointerAnchorMarkerRef.current.remove();
      if (liveTrainMarkerRef.current) liveTrainMarkerRef.current.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle window and container resize with ResizeObserver
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [mapLoaded]);

  // 2. Render NetworkX Pathways (Dotted Background Mesh) & Station Nodes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // A. Tracks GeoJSON (from topology or fallback)
    let tracksGeoJSON = topology?.geojson?.tracks;
    let stationsGeoJSON = topology?.geojson?.stations;

    if (!tracksGeoJSON || !tracksGeoJSON.features || tracksGeoJSON.features.length === 0) {
      const coords = FALLBACK_NATIONAL_STATIONS.map((s) => [s.longitude, s.latitude]);
      tracksGeoJSON = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { section_id: 'NDLS-BSB-TRUNK' },
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          },
        ],
      };
    }

    if (!stationsGeoJSON || !stationsGeoJSON.features || stationsGeoJSON.features.length === 0) {
      stationsGeoJSON = {
        type: 'FeatureCollection',
        features: FALLBACK_NATIONAL_STATIONS.map((s) => ({
          type: 'Feature',
          properties: {
            station_id: s.station_id,
            name: s.name,
          },
          geometry: {
            type: 'Point',
            coordinates: [s.longitude, s.latitude],
          },
        })),
      };
    }

    // B. Background Network Pathways (Thin, Dotted/Dashed lines like reference image)
    if (!map.getSource('railway-tracks-mesh')) {
      map.addSource('railway-tracks-mesh', {
        type: 'geojson',
        data: tracksGeoJSON,
      });

      map.addLayer({
        id: 'railway-tracks-mesh-line',
        type: 'line',
        source: 'railway-tracks-mesh',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#94A3B8', // Clean slate-gray
          'line-width': 1.4,
          'line-dasharray': [2, 3], // Dotted / dashed pattern from reference image
          'line-opacity': 0.75,
        },
      });
    } else {
      map.getSource('railway-tracks-mesh').setData(tracksGeoJSON);
    }

    // C. Background Context Station Nodes (Muted circular dots with white ring)
    if (!map.getSource('railway-stations-mesh')) {
      map.addSource('railway-stations-mesh', {
        type: 'geojson',
        data: stationsGeoJSON,
      });

      map.addLayer({
        id: 'railway-context-nodes',
        type: 'circle',
        source: 'railway-stations-mesh',
        paint: {
          'circle-radius': 3.5,
          'circle-color': '#94A3B8',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.85,
        },
      });

      map.on('mouseenter', 'railway-context-nodes', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'railway-context-nodes', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', 'railway-context-nodes', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const { station_id, name } = feature.properties;
        const coords = feature.geometry.coordinates;

        const switchId = `${station_id}--SW----110`;
        if (onSelectStation) onSelectStation(`${name} (${station_id})`);
        if (onSelectSwitch) onSelectSwitch(switchId);

        showTooltipAndAnchor(name, station_id, switchId, coords);
      });
    } else {
      map.getSource('railway-stations-mesh').setData(stationsGeoJSON);
    }

    // D. Start & End Station Grey Nodes (Rendered exclusively on origin & destination of trains)
    const currentTerminalCodes = new Set();
    const terminalsToRender = new Map();

    const registerTerminal = (stnId, role, fallbackCoords = null) => {
      if (!stnId) return;
      const code = String(stnId).toUpperCase().trim();
      let matchStation = topology?.stations?.find((s) => s.station_id === code);
      if (!matchStation) matchStation = FALLBACK_NATIONAL_STATIONS.find((s) => s.station_id === code);
      const coords = matchStation ? [matchStation.longitude, matchStation.latitude] : fallbackCoords;
      if (!coords || isNaN(coords[0]) || isNaN(coords[1])) return;

      const existing = terminalsToRender.get(code);
      if (!existing) {
        terminalsToRender.set(code, {
          station_id: code,
          name: matchStation?.name || code,
          coords,
          role,
        });
      } else if (existing.role !== role) {
        existing.role = 'Terminal';
      }
    };

    if (Array.isArray(trains) && trains.length > 0) {
      trains.forEach((t) => {
        const originCode = t.origin_station || (t.route_stations && t.route_stations[0]);
        const destCode = t.destination_station || (t.route_stations && t.route_stations[t.route_stations.length - 1]);
        const firstCoord = t.route_coordinates && t.route_coordinates[0];
        const lastCoord = t.route_coordinates && t.route_coordinates[t.route_coordinates.length - 1];
        if (originCode) registerTerminal(originCode, 'Start Station', firstCoord);
        if (destCode) registerTerminal(destCode, 'End Station', lastCoord);
      });
    }

    if (liveTrainData) {
      if (liveTrainData.originCode) registerTerminal(liveTrainData.originCode, 'Start Station');
      if (liveTrainData.destCode) registerTerminal(liveTrainData.destCode, 'End Station');
      if (liveTrainData.routeStops && liveTrainData.routeStops.length >= 2) {
        const firstStn = liveTrainData.routeStops[0]?.stationCode || liveTrainData.routeStops[0]?.code;
        const lastStn = liveTrainData.routeStops[liveTrainData.routeStops.length - 1]?.stationCode || liveTrainData.routeStops[liveTrainData.routeStops.length - 1]?.code;
        if (firstStn) registerTerminal(firstStn, 'Start Station', liveTrainData.routeCoords?.[0]);
        if (lastStn) registerTerminal(lastStn, 'End Station', liveTrainData.routeCoords?.[liveTrainData.routeCoords.length - 1]);
      }
    }

    if (terminalsToRender.size === 0) {
      registerTerminal('NDLS', 'Start Station', [77.2197, 28.6139]);
      registerTerminal('LJN', 'End Station', [80.9234, 26.8322]);
      registerTerminal('BSB', 'End Station', [82.9739, 25.3284]);
    }

    terminalsToRender.forEach((term, stnId) => {
      currentTerminalCodes.add(stnId);
      const { station_id, name, coords, role } = term;

      let hubMarker = hubMarkersMapRef.current.get(station_id);
      if (!hubMarker) {
        const el = document.createElement('div');
        el.className = 'terminal-station-node cursor-pointer select-none group flex items-center justify-center';
        el.innerHTML = `
          <div class="w-5 h-5 rounded-full bg-[#64748B] hover:bg-[#475569] border-2 border-white shadow-xs flex items-center justify-center hover:scale-125 transition-transform" title="${name} (${station_id}) • ${role}">
            <span class="w-1.5 h-1.5 rounded-full bg-white/90"></span>
          </div>
        `;

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const switchId = `${station_id}--SW----110`;
          if (onSelectStation) onSelectStation(`${name} (${station_id})`);
          if (onSelectSwitch) onSelectSwitch(switchId);
          showTooltipAndAnchor(name, station_id, switchId, coords);
        });

        hubMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .addTo(map);

        hubMarkersMapRef.current.set(station_id, hubMarker);
      } else {
        hubMarker.setLngLat(coords);
      }
    });

    hubMarkersMapRef.current.forEach((marker, stnId) => {
      if (!currentTerminalCodes.has(stnId)) {
        marker.remove();
        hubMarkersMapRef.current.delete(stnId);
      }
    });
  }, [mapLoaded, topology, trains, liveTrainData, onSelectStation, onSelectSwitch]);

  // 3. Render Active Selected Route Pathway (Vibrant Cyan Line & Clean Ring Nodes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    let activeRouteCoords = [];
    const activeTrain = trains.find((t) => t.train_no === selectedTrainNo);

    if (activeTrain && activeTrain.route_coordinates && activeTrain.route_coordinates.length >= 2) {
      activeRouteCoords = activeTrain.route_coordinates;
    } else if (topology?.geojson?.train_routes?.features) {
      const matchFeature = topology.geojson.train_routes.features.find(
        (f) => f.properties.train_no === selectedTrainNo
      );
      if (matchFeature && matchFeature.geometry?.coordinates?.length >= 2) {
        activeRouteCoords = matchFeature.geometry.coordinates;
      }
    }

    if (activeRouteCoords.length < 2) {
      if (topology?.stations && topology.stations.length >= 2) {
        activeRouteCoords = topology.stations.slice(0, 10).map((s) => [s.longitude, s.latitude]);
      } else {
        activeRouteCoords = FALLBACK_NATIONAL_STATIONS.map((s) => [s.longitude, s.latitude]);
      }
    }

    const hasSelection = Boolean(showVirtualSim && (selectedTrainNo || selectedSwitchId));

    // Selected Route Pathway Line
    const activeLineGeoJSON = {
      type: 'FeatureCollection',
      features:
        hasSelection && activeRouteCoords.length >= 2
          ? [
            {
              type: 'Feature',
              properties: { train_no: selectedTrainNo },
              geometry: {
                type: 'LineString',
                coordinates: activeRouteCoords,
              },
            },
          ]
          : [],
    };

    // Selected Route Node Dots
    const activeNodesGeoJSON = {
      type: 'FeatureCollection',
      features:
        hasSelection && activeRouteCoords.length > 0
          ? activeRouteCoords.map((coord, idx) => ({
            type: 'Feature',
            properties: { index: idx },
            geometry: {
              type: 'Point',
              coordinates: coord,
            },
          }))
          : [],
    };

    // A. Selected Path Solid Cyan Line Layer
    if (!map.getSource('railway-selected-path')) {
      map.addSource('railway-selected-path', {
        type: 'geojson',
        data: activeLineGeoJSON,
      });

      map.addLayer({
        id: 'railway-selected-path-line',
        type: 'line',
        source: 'railway-selected-path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#00A3C4', // Cyan accent line matching reference image
          'line-width': 3.5,
          'line-opacity': 1.0,
        },
      });
    } else {
      map.getSource('railway-selected-path').setData(activeLineGeoJSON);
    }

    // B. Selected Path Nodes (White circle with cyan ring)
    if (!map.getSource('railway-selected-nodes')) {
      map.addSource('railway-selected-nodes', {
        type: 'geojson',
        data: activeNodesGeoJSON,
      });

      map.addLayer({
        id: 'railway-selected-nodes-dots',
        type: 'circle',
        source: 'railway-selected-nodes',
        paint: {
          'circle-radius': 5.5,
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#00A3C4',
        },
      });
    } else {
      map.getSource('railway-selected-nodes').setData(activeNodesGeoJSON);
    }

    // C. Mid-route Floating Route Chip (e.g. R-12003 / R-7620)
    if (hasSelection && activeRouteCoords.length >= 2) {
      const midIdx = Math.floor(activeRouteCoords.length / 2);
      const midCoord = activeRouteCoords[midIdx] || activeRouteCoords[0];
      const routeId = selectedTrainNo ? `R-${selectedTrainNo}` : 'R-12003';

      if (!pathLabelMarkerRef.current) {
        const labelEl = document.createElement('div');
        labelEl.className = 'path-label-chip pointer-events-none select-none';
        labelEl.innerHTML = `
          <div class="px-2 py-0.5 rounded bg-white border border-[#00A3C4] shadow-xs text-[#00A3C4] font-mono text-[10px] font-bold tracking-tight">
            ${routeId}
          </div>
        `;

        pathLabelMarkerRef.current = new maplibregl.Marker({
          element: labelEl,
          anchor: 'center',
          offset: [0, -14],
        })
          .setLngLat(midCoord)
          .addTo(map);
      } else {
        pathLabelMarkerRef.current.setLngLat(midCoord);
        const labelEl = pathLabelMarkerRef.current.getElement();
        labelEl.innerHTML = `
          <div class="px-2 py-0.5 rounded bg-white border border-[#00A3C4] shadow-xs text-[#00A3C4] font-mono text-[10px] font-bold tracking-tight">
            ${routeId}
          </div>
        `;
      }
    } else if (pathLabelMarkerRef.current) {
      pathLabelMarkerRef.current.remove();
      pathLabelMarkerRef.current = null;
    }

    // Auto-fit initial bounds
    if (activeRouteCoords.length >= 2 && !hasAutoFittedRef.current) {
      let minLon = 180,
        maxLon = -180,
        minLat = 90,
        maxLat = -90;
      activeRouteCoords.forEach(([lon, lat]) => {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
      if (minLon < maxLon && minLat < maxLat) {
        map.fitBounds(
          [
            [minLon - 0.4, minLat - 0.4],
            [maxLon + 0.4, maxLat + 0.4],
          ],
          { padding: 70, duration: 1000 }
        );
        hasAutoFittedRef.current = true;
      }
    }
  }, [mapLoaded, topology, selectedTrainNo, selectedSwitchId, trains, showVirtualSim]);

  // 4. Show Tooltip Card & Pointer Indicator anchored at selected node
  const showTooltipAndAnchor = (stationName, stationCode, switchId, coords) => {
    const map = mapRef.current;
    if (!map || !coords) return;

    if (tooltipMarkerRef.current) tooltipMarkerRef.current.remove();
    if (pointerAnchorMarkerRef.current) pointerAnchorMarkerRef.current.remove();

    // Pointer Indicator at the exact coordinate
    const pointerEl = document.createElement('div');
    pointerEl.className = 'pointer-anchor select-none';
    pointerEl.innerHTML = `
      <div class="relative flex items-center justify-center">
        <span class="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white shadow-xs flex items-center justify-center">
          <span class="w-1 h-1 rounded-full bg-white"></span>
        </span>
        <svg class="absolute -top-3.5 -right-3.5 w-4 h-4 text-slate-900 drop-shadow-xs pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 2l12 11.5-5.5 1.5 3.5 7-2.5 1-3.5-7-4 4V2z"/>
        </svg>
      </div>
    `;

    const pointerMarker = new maplibregl.Marker({
      element: pointerEl,
      anchor: 'center',
    })
      .setLngLat(coords)
      .addTo(map);

    pointerAnchorMarkerRef.current = pointerMarker;

    // Dark Near-Black Tooltip Card with Real Station Details
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'hover-tooltip-card cursor-pointer select-none';
    tooltipEl.innerHTML = `
      <div class="bg-[#111827] text-white rounded-xl p-3 shadow-2xl border border-slate-700 min-w-[190px] text-xs space-y-1.5 transition-all">
        <div class="font-mono text-xs font-bold text-cyan-300 pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>${stationCode}</span>
          <span class="text-[10px] text-slate-400 font-sans font-normal">STATION NODE</span>
        </div>
        <div class="font-bold text-xs text-white truncate">${stationName}</div>
        <div class="text-[10px] font-mono text-slate-400">
          GPS: ${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E
        </div>
      </div>
    `;

    const tooltipMarker = new maplibregl.Marker({
      element: tooltipEl,
      anchor: 'bottom-left',
      offset: [16, -14],
    })
      .setLngLat(coords)
      .addTo(map);

    tooltipMarkerRef.current = tooltipMarker;

    tooltipEl.addEventListener('click', () => {
      tooltipMarker.remove();
      tooltipMarkerRef.current = null;
      if (pointerAnchorMarkerRef.current) {
        pointerAnchorMarkerRef.current.remove();
        pointerAnchorMarkerRef.current = null;
      }
    });
  };

  // 5. Update marker when selectedSwitchId changes externally
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedSwitchId) return;

    const stnCode = selectedSwitchId.split('--')[0].replace(/-/g, '');
    const station =
      (topology?.stations && topology.stations.find((s) => s.station_id === stnCode)) ||
      FALLBACK_NATIONAL_STATIONS.find((s) => s.station_id === stnCode);

    if (station && station.longitude && station.latitude) {
      showTooltipAndAnchor(
        station.name,
        station.station_id,
        selectedSwitchId,
        [station.longitude, station.latitude]
      );
    }
  }, [selectedSwitchId, mapLoaded, topology]);

  // 6. Native WebGL Train Tracking Layers (GPU-Accelerated Symbol & Circle Layers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clean up any legacy DOM markers
    if (markersMapRef.current.size > 0) {
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
    }

    const simTrainFeatures =
      showVirtualSim && Array.isArray(trains)
        ? trains
          .filter((train) => {
            const lat = train.latitude || (train.position && train.position.latitude);
            const lon = train.longitude || (train.position && train.position.longitude);
            return lat != null && lon != null && !isNaN(lat) && !isNaN(lon);
          })
          .map((train) => {
            const lat = train.latitude || (train.position && train.position.latitude);
            const lon = train.longitude || (train.position && train.position.longitude);
            const isSelected = selectedTrainNo === train.train_no;
            return {
              type: 'Feature',
              properties: {
                train_no: train.train_no,
                train_name: train.train_name || `Train #${train.train_no}`,
                is_selected: isSelected ? 1 : 0,
                label: `R-${train.train_no}`,
                speed: train.speed_kmh ?? train.speed ?? (train.telemetry && train.telemetry.speed) ?? 0,
                status: train.train_status || 'RUNNING',
              },
              geometry: {
                type: 'Point',
                coordinates: [Number(lon), Number(lat)],
              },
            };
          })
        : [];

    const simTrainsGeoJSON = {
      type: 'FeatureCollection',
      features: simTrainFeatures,
    };

    if (!map.getSource('railway-sim-trains')) {
      map.addSource('railway-sim-trains', {
        type: 'geojson',
        data: simTrainsGeoJSON,
      });

      // A. WebGL Aura / Halo for selected train
      map.addLayer({
        id: 'railway-sim-trains-halo',
        type: 'circle',
        source: 'railway-sim-trains',
        filter: ['==', ['get', 'is_selected'], 1],
        paint: {
          'circle-radius': 15,
          'circle-color': '#00A3C4',
          'circle-opacity': 0.28,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#00A3C4',
          'circle-stroke-opacity': 0.7,
        },
      });

      // B. WebGL Train Body Circle (GPU rendered with dynamic status colors)
      map.addLayer({
        id: 'railway-sim-trains-circle',
        type: 'circle',
        source: 'railway-sim-trains',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'is_selected'], 1], 9,
            ['==', ['get', 'status'], 'RUNNING'], 7,
            ['==', ['get', 'status'], 'DELAYED'], 7,
            6
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'is_selected'], 1], '#00A3C4',
            ['==', ['get', 'status'], 'RUNNING'], '#10B981',
            ['==', ['get', 'status'], 'DELAYED'], '#F59E0B',
            '#6366F1'
          ],
          'circle-stroke-width': 2.2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // C. WebGL Inner Pin Dot
      map.addLayer({
        id: 'railway-sim-trains-core',
        type: 'circle',
        source: 'railway-sim-trains',
        paint: {
          'circle-radius': 2.5,
          'circle-color': '#FFFFFF',
        },
      });

      // D. WebGL Symbol Text Label (R-12003) - Visible for all trains across the national map
      map.addLayer({
        id: 'railway-sim-trains-label',
        type: 'symbol',
        source: 'railway-sim-trains',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': [
            'case',
            ['==', ['get', 'is_selected'], 1], 11,
            9
          ],
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': [
            'case',
            ['==', ['get', 'is_selected'], 1], '#0891B2',
            '#1E293B'
          ],
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2.5,
        },
      });

      // Interactive Click & Hover handlers on the WebGL circle layer
      map.on('click', 'railway-sim-trains-circle', (e) => {
        if (e.features && e.features[0]) {
          const tNo = Number(e.features[0].properties.train_no);
          if (onSelectTrainRef.current) {
            onSelectTrainRef.current(tNo);
          }
        }
      });

      map.on('mouseenter', 'railway-sim-trains-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'railway-sim-trains-circle', () => {
        map.getCanvas().style.cursor = '';
      });
    } else {
      map.getSource('railway-sim-trains').setData(simTrainsGeoJSON);
    }
  }, [trains, selectedTrainNo, mapLoaded, showVirtualSim]);

  // 7. Live Verified Satellite GPS Train Tracking Marker & Pathway Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    try {
      if (
        !showLiveFeed ||
        !liveTrainData ||
        liveTrainData.lat == null ||
        liveTrainData.lng == null ||
        isNaN(liveTrainData.lat) ||
        isNaN(liveTrainData.lng)
      ) {
        if (liveTrainMarkerRef.current) {
          liveTrainMarkerRef.current.remove();
          liveTrainMarkerRef.current = null;
        }
        if (map.getSource('railway-live-route')) {
          map.getSource('railway-live-route').setData({ type: 'FeatureCollection', features: [] });
        }
        if (map.getSource('railway-live-route-stops')) {
          map.getSource('railway-live-route-stops').setData({ type: 'FeatureCollection', features: [] });
        }
        return;
      }

      const {
        trainNo,
        trainName = 'Live Train',
        lat,
        lng,
        speedKmh = 0,
        bearing = 0,
        delayMinutes = 0,
        stationName = 'En Route',
        isActualPosition = true,
        routeCoords = [],
        routeGeoJSON = null,
        routeStops = [],
      } = liveTrainData;

      // A. Render or update Live Route Line from RailRadar Route API
      const effectiveCoords =
        routeGeoJSON?.geometry?.coordinates && Array.isArray(routeGeoJSON.geometry.coordinates)
          ? routeGeoJSON.geometry.coordinates
          : routeCoords;

      if (effectiveCoords && effectiveCoords.length >= 2) {
        const liveRouteGeoJSON = routeGeoJSON
          ? (routeGeoJSON.type === 'FeatureCollection' ? routeGeoJSON : { type: 'FeatureCollection', features: [routeGeoJSON] })
          : {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { trainNo },
                geometry: {
                  type: 'LineString',
                  coordinates: effectiveCoords,
                },
              },
            ],
          };

        let stopFeatures = [];
        if (Array.isArray(routeStops) && routeStops.length > 0) {
          stopFeatures = routeStops
            .filter((s) => s.lng != null && s.lat != null)
            .map((s, idx) => ({
              type: 'Feature',
              properties: { index: idx, name: s.name, code: s.code },
              geometry: {
                type: 'Point',
                coordinates: [Number(s.lng), Number(s.lat)],
              },
            }));
        } else if (effectiveCoords && effectiveCoords.length > 0) {
          const step = Math.max(1, Math.floor(effectiveCoords.length / 50));
          stopFeatures = effectiveCoords
            .filter((_, idx) => idx % step === 0 || idx === effectiveCoords.length - 1)
            .map((coord, idx) => ({
              type: 'Feature',
              properties: { index: idx },
              geometry: {
                type: 'Point',
                coordinates: coord,
              },
            }));
        }

        const liveStopsGeoJSON = {
          type: 'FeatureCollection',
          features: stopFeatures,
        };

        if (!map.getSource('railway-live-route')) {
          map.addSource('railway-live-route', {
            type: 'geojson',
            data: liveRouteGeoJSON,
          });

          map.addLayer({
            id: 'railway-live-route-casing',
            type: 'line',
            source: 'railway-live-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#064e3b',
              'line-width': 6,
              'line-opacity': 0.35,
            },
          });

          map.addLayer({
            id: 'railway-live-route-line',
            type: 'line',
            source: 'railway-live-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#10B981', // Emerald green live route line
              'line-width': 3.5,
              'line-opacity': 0.95,
            },
          });
        } else {
          map.getSource('railway-live-route').setData(liveRouteGeoJSON);
        }

        if (!map.getSource('railway-live-route-stops')) {
          map.addSource('railway-live-route-stops', {
            type: 'geojson',
            data: liveStopsGeoJSON,
          });

          map.addLayer({
            id: 'railway-live-route-stops-dots',
            type: 'circle',
            source: 'railway-live-route-stops',
            paint: {
              'circle-radius': 5,
              'circle-color': '#FFFFFF',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#10B981',
            },
          });
        } else {
          map.getSource('railway-live-route-stops').setData(liveStopsGeoJSON);
        }
      }

      // 1. Gather all candidate track polylines for high-precision snapping
      const candidatePolylines = [];
      if (effectiveCoords && effectiveCoords.length >= 2) {
        candidatePolylines.push(effectiveCoords);
      }
      if (topology?.geojson?.tracks?.features) {
        topology.geojson.tracks.features.forEach((f) => {
          if (f.geometry?.type === 'LineString' && Array.isArray(f.geometry.coordinates)) {
            candidatePolylines.push(f.geometry.coordinates);
          }
        });
      }
      if (candidatePolylines.length === 0) {
        candidatePolylines.push(FALLBACK_NATIONAL_STATIONS.map((s) => [s.longitude, s.latitude]));
      }

      // 2. High-precision track snapping & orientation calculation
      const snapResult = snapPointToTrack(lng, lat, candidatePolylines);
      const renderLng = snapResult.snapped ? snapResult.lng : lng;
      const renderLat = snapResult.snapped ? snapResult.lat : lat;
      const effectiveBearing = (bearing && bearing > 0) ? bearing : (snapResult.bearing || 0);
      const isSnapped = snapResult.snapped;

      // B. Render or update Live Train Marker
      const markerHtml = `
      <div class="live-gps-train-marker cursor-pointer select-none flex flex-col items-center group relative pointer-events-auto" title="Train #${trainNo}: Click for Live Telemetry">
        <!-- Concentric pulsating radar sweep perfectly centered on locomotive node -->
        <div class="relative flex items-center justify-center w-12 h-12">
          <span class="absolute w-18 h-18 rounded-full bg-emerald-500/20 animate-ping pointer-events-none"></span>
          <span class="absolute w-14 h-14 rounded-full bg-emerald-400/30 animate-pulse pointer-events-none"></span>
          
          <!-- Outer glowing locomotive puck with track heading directional arrow -->
          <div class="relative w-11 h-11 rounded-full bg-slate-950 border-[2.5px] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.85)] ring-2 ring-emerald-500/40 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 z-10">
            <svg class="w-6 h-6 text-emerald-400 transition-transform duration-300 ease-out drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(${effectiveBearing}deg);">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>

        <!-- Minimal clean status badge below locomotive node -->
        <div class="mt-2 px-3 py-1 rounded-full bg-slate-950/95 text-white border border-emerald-500/80 shadow-xl text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md z-20 whitespace-nowrap transition-transform duration-200 group-hover:scale-105">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span class="text-white tracking-wide">#${trainNo}</span>
          ${speedKmh ? `<span class="text-emerald-400 font-semibold">· ${speedKmh} km/h</span>` : ''}
          ${isSnapped ? `<span class="text-emerald-300 text-[10px]" title="Track-Locked GPS Precision">⚓</span>` : ''}
        </div>
      </div>
    `;

      const popupHtml = `
      <div class="p-3.5 bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-emerald-500/50 min-w-[240px] max-w-[280px] space-y-2 font-sans select-none">
        <div class="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
          <span class="font-mono text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live GPS Telemetry
          </span>
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-500/30">#${trainNo}</span>
        </div>
        
        <div>
          <div class="font-bold text-xs text-white leading-tight truncate">${trainName}</div>
          <div class="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
            <span class="text-slate-400">At/Near:</span>
            <strong class="text-white truncate">${stationName}</strong>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1.5 text-[11px] font-mono border-t border-slate-800/80 text-slate-300">
          <div class="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            <div class="text-[9px] text-slate-400 uppercase">Velocity</div>
            <strong class="text-emerald-400 text-xs">${speedKmh} km/h</strong>
          </div>
          <div class="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            <div class="text-[9px] text-slate-400 uppercase">Status</div>
            <strong class="${delayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'} text-xs">${delayMinutes > 0 ? `+${delayMinutes}m Late` : 'On Time'}</strong>
          </div>
          <div class="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            <div class="text-[9px] text-slate-400 uppercase">Heading</div>
            <strong class="text-white text-xs">${effectiveBearing}°</strong>
          </div>
          <div class="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            <div class="text-[9px] text-slate-400 uppercase">Track Lock</div>
            <strong class="text-emerald-300 text-xs">${isSnapped ? 'High Accuracy' : (isActualPosition ? 'Verified' : 'Estimated')}</strong>
          </div>
        </div>

        <div class="flex items-center justify-between text-[9px] text-slate-400 pt-1 font-mono border-t border-slate-800/60">
          <span>${renderLat.toFixed(4)}°N, ${renderLng.toFixed(4)}°E</span>
          <span class="text-emerald-400 font-semibold flex items-center gap-0.5">
            <span class="material-symbols-outlined text-[11px]">gps_fixed</span>
            Live Synced
          </span>
        </div>
      </div>
    `;

      if (!liveTrainMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'live-train-marker-wrapper';
        el.style.zIndex = '50';
        el.innerHTML = markerHtml;

        const popup = new maplibregl.Popup({
          offset: [0, -30],
          closeButton: false,
          className: 'live-telemetry-map-popup',
          maxWidth: '300px',
        }).setHTML(popupHtml);

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([renderLng, renderLat])
          .setPopup(popup)
          .addTo(map);

        liveTrainMarkerRef.current = marker;
        liveTrainPopupRef.current = popup;
      } else {
        liveTrainMarkerRef.current.setLngLat([renderLng, renderLat]);
        const el = liveTrainMarkerRef.current.getElement();
        el.innerHTML = markerHtml;
        if (liveTrainPopupRef.current) {
          liveTrainPopupRef.current.setHTML(popupHtml);
        }
      }

      // C. Camera Flight to Live Train Coordinates on first arrival or train change
      const trainKey = `${trainNo}-${renderLat.toFixed(3)}-${renderLng.toFixed(3)}`;
      if (lastFlownLiveTrainRef.current !== trainKey) {
        lastFlownLiveTrainRef.current = trainKey;
        map.flyTo({
          center: [renderLng, renderLat],
          zoom: 9,
          essential: true,
          duration: 1400,
        });
      }
    } catch (err) {
      console.warn('Live map telemetry render warning:', err);
    }
  }, [liveTrainData, mapLoaded, showLiveFeed, topology]);

  const handleCenterLiveTrain = () => {
    if (mapRef.current && liveTrainData && liveTrainData.lng != null && liveTrainData.lat != null) {
      const candidatePolylines = [];
      if (liveTrainData.routeCoords && liveTrainData.routeCoords.length >= 2) {
        candidatePolylines.push(liveTrainData.routeCoords);
      }
      if (topology?.geojson?.tracks?.features) {
        topology.geojson.tracks.features.forEach((f) => {
          if (f.geometry?.type === 'LineString' && Array.isArray(f.geometry.coordinates)) {
            candidatePolylines.push(f.geometry.coordinates);
          }
        });
      }
      const snapResult = snapPointToTrack(liveTrainData.lng, liveTrainData.lat, candidatePolylines);
      const targetLng = snapResult.snapped ? snapResult.lng : liveTrainData.lng;
      const targetLat = snapResult.snapped ? snapResult.lat : liveTrainData.lat;

      mapRef.current.flyTo({
        center: [targetLng, targetLat],
        zoom: 9,
        pitch: 0,
        bearing: 0,
        essential: true,
        duration: 1200,
      });
    }
  };

  // Zoom / View Handlers
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleResetCorridor = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [80.5, 26.2],
        zoom: 6.5,
        pitch: 0,
        bearing: 0,
        essential: true,
      });
      setViewMode('corridor');
    }
  };

  const handleFitAllNetwork = () => {
    if (!mapRef.current) return;
    const stations =
      topology?.stations && topology.stations.length > 0
        ? topology.stations
        : FALLBACK_NATIONAL_STATIONS;
    let minLon = 180,
      maxLon = -180,
      minLat = 90,
      maxLat = -90;
    let validCount = 0;
    stations.forEach((s) => {
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
          [minLon - 0.7, minLat - 0.7],
          [maxLon + 0.7, maxLat + 0.7],
        ],
        { padding: 50, essential: true, duration: 1000 }
      );
      setViewMode('all');
    }
  };

  // Expose imperative camera controls to parent component
  useImperativeHandle(ref, () => ({
    centerLiveTrain: handleCenterLiveTrain,
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    resetCorridor: handleResetCorridor,
    fitAllNetwork: handleFitAllNetwork,
  }));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#ECEEF2]">
      {/* 1. MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* 2. Floating Zoom Control Cluster (Fixed Bottom-Right, Minimal Grey Container) */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col bg-slate-100/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-1 shadow-2xs select-none">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-lg hover:bg-slate-200/80 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          title="Zoom in"
        >
          <span className="material-symbols-outlined text-[19px]">add</span>
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-lg hover:bg-slate-200/80 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          title="Zoom out"
        >
          <span className="material-symbols-outlined text-[19px]">remove</span>
        </button>
        <div className="w-full h-[1px] bg-slate-200/80 my-0.5" />
        <button
          type="button"
          onClick={viewMode === 'all' ? handleResetCorridor : handleFitAllNetwork}
          className="w-8 h-8 rounded-lg hover:bg-slate-200/80 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          title={viewMode === 'all' ? 'Reset corridor view' : 'Fit network bounds'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {viewMode === 'all' ? 'crop_free' : 'fit_screen'}
          </span>
        </button>
      </div>
    </div>
  );
});

export default MapLibreRailwayMap;
