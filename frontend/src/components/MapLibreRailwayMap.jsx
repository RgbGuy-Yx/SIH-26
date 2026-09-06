import React, { useEffect, useRef, useState, useMemo } from 'react';
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

// Hub landmark numbers assigned to key junction stations (matching reference image hubs 21, 32, 17, etc.)
const HUB_NUMBERS = {
  NDLS: '21',
  CNB: '32',
  PRYJ: '17',
  BSB: '44',
  TDL: '19',
  GZB: '08',
  DDU: '45',
  ALJN: '14',
  SUR: '21',
  GDG: '32',
  DWR: '17',
  LJN: '28',
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

export function MapLibreRailwayMap({
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
}) {
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
            is_hub: Boolean(HUB_NUMBERS[s.station_id]),
            hub_number: HUB_NUMBERS[s.station_id] || '',
          },
          geometry: {
            type: 'Point',
            coordinates: [s.longitude, s.latitude],
          },
        })),
      };
    } else {
      stationsGeoJSON = {
        ...stationsGeoJSON,
        features: stationsGeoJSON.features.map((f) => {
          const id = f.properties.station_id;
          const hubNum = HUB_NUMBERS[id] || null;
          return {
            ...f,
            properties: {
              ...f.properties,
              is_hub: Boolean(hubNum),
              hub_number: hubNum || '',
            },
          };
        }),
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

    // D. Landmark Hub Nodes (Numbered circular badges like 21, 32, 17 in reference image)
    const currentHubCodes = new Set();
    stationsGeoJSON.features.forEach((feat) => {
      const { station_id, name, is_hub, hub_number } = feat.properties;
      if (!is_hub || !hub_number) return;

      currentHubCodes.add(station_id);
      const coords = feat.geometry.coordinates;

      let hubMarker = hubMarkersMapRef.current.get(station_id);
      if (!hubMarker) {
        const el = document.createElement('div');
        el.className = 'hub-landmark-node cursor-pointer select-none';
        el.innerHTML = `
          <div class="w-6 h-6 rounded-full bg-[#64748B] border-2 border-white shadow-xs flex items-center justify-center text-white font-mono font-bold text-[9px] hover:scale-110 transition-transform">
            ${hub_number}
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
      if (!currentHubCodes.has(stnId)) {
        marker.remove();
        hubMarkersMapRef.current.delete(stnId);
      }
    });
  }, [mapLoaded, topology, onSelectStation, onSelectSwitch]);

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
          'circle-radius': 4.5,
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 2.2,
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

      // B. WebGL Train Body Circle (GPU rendered)
      map.addLayer({
        id: 'railway-sim-trains-circle',
        type: 'circle',
        source: 'railway-sim-trains',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'is_selected'], 1], 8,
            6
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'is_selected'], 1], '#00A3C4',
            '#1E293B'
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

      // D. WebGL Symbol Text Label (R-12003)
      map.addLayer({
        id: 'railway-sim-trains-label',
        type: 'symbol',
        source: 'railway-sim-trains',
        filter: ['==', ['get', 'is_selected'], 1],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#0F172A',
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
            'circle-radius': 3.5,
            'circle-color': '#FFFFFF',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#10B981',
          },
        });
      } else {
        map.getSource('railway-live-route-stops').setData(liveStopsGeoJSON);
      }
    }

    // B. Render or update Live Train Marker
    const markerHtml = `
      <div class="live-gps-train-marker cursor-pointer select-none flex flex-col items-center group relative">
        <span class="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-emerald-500/25 animate-ping pointer-events-none"></span>
        <span class="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-emerald-400/35 animate-pulse pointer-events-none"></span>
        
        <div class="relative w-7 h-7 rounded-full bg-slate-950 border-2 border-emerald-400 shadow-xl flex items-center justify-center transition-transform group-hover:scale-125 z-10">
          <svg class="w-4 h-4 text-emerald-400 transition-transform" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(${bearing}deg);">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>

        <div class="mt-1 px-2 py-0.5 rounded-md bg-slate-950/95 text-emerald-400 border border-emerald-500/80 shadow-lg text-[9px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-md z-20">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
          <span>LIVE #${trainNo}</span>
          ${speedKmh ? `<span class="text-slate-300 font-normal">· ${speedKmh} km/h</span>` : ''}
        </div>
      </div>
    `;

    const popupHtml = `
      <div class="p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-emerald-500/50 min-w-[210px] space-y-1.5 font-sans">
        <div class="flex items-center justify-between border-b border-slate-800 pb-1">
          <span class="font-mono text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE SATELLITE TELEMETRY
          </span>
          <span class="text-[9px] font-mono text-slate-400">#${trainNo}</span>
        </div>
        <div class="font-bold text-xs text-white truncate">${trainName}</div>
        <div class="text-[11px] text-slate-300">
          Current Station: <strong class="text-white">${stationName}</strong>
        </div>
        <div class="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono border-t border-slate-800 text-slate-300">
          <div>Speed: <strong class="text-emerald-400">${speedKmh} km/h</strong></div>
          <div>Delay: <strong class="${delayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'}">${delayMinutes > 0 ? `+${delayMinutes}m` : 'On Time'}</strong></div>
          <div>Bearing: <strong class="text-white">${bearing}°</strong></div>
          <div>GPS: <strong class="text-emerald-300">${isActualPosition ? 'Verified' : 'Estimated'}</strong></div>
        </div>
        <div class="text-[9px] text-slate-400 pt-0.5 font-mono">
          Coords: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
        </div>
      </div>
    `;

    if (!liveTrainMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'live-train-marker-wrapper';
      el.style.zIndex = '50';
      el.innerHTML = markerHtml;

      const popup = new maplibregl.Popup({
        offset: [0, -20],
        closeButton: false,
        className: 'live-telemetry-map-popup',
      }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      liveTrainMarkerRef.current = marker;
      liveTrainPopupRef.current = popup;
    } else {
      liveTrainMarkerRef.current.setLngLat([lng, lat]);
      const el = liveTrainMarkerRef.current.getElement();
      el.innerHTML = markerHtml;
      if (liveTrainPopupRef.current) {
        liveTrainPopupRef.current.setHTML(popupHtml);
      }
    }

      // C. Camera Flight to Live Train Coordinates on first arrival or train change
      const trainKey = `${trainNo}-${lat.toFixed(3)}-${lng.toFixed(3)}`;
      if (lastFlownLiveTrainRef.current !== trainKey) {
        lastFlownLiveTrainRef.current = trainKey;
        map.flyTo({
          center: [lng, lat],
          zoom: 8.5,
          essential: true,
          duration: 1400,
        });
      }
    } catch (err) {
      console.warn('Live map telemetry render warning:', err);
    }
  }, [liveTrainData, mapLoaded, showLiveFeed]);

  const handleCenterLiveTrain = () => {
    if (mapRef.current && liveTrainData && liveTrainData.lng != null && liveTrainData.lat != null) {
      mapRef.current.flyTo({
        center: [liveTrainData.lng, liveTrainData.lat],
        zoom: 8.5,
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

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#F4F5F7]">
      {/* 1. MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* 2. Floating Live GPS Tracking Status Chip (Center Top) */}
      {showLiveFeed && liveTrainData && liveTrainData.lat != null && liveTrainData.lng != null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-emerald-500/60 shadow-2xl text-xs text-white pointer-events-auto select-none transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-semibold text-[11px] text-emerald-300">
            Live GPS Active:
          </span>
          <span className="font-mono font-bold text-[11px] text-white">
            #{liveTrainData.trainNo} {liveTrainData.trainName}
          </span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">
            • {liveTrainData.stationName}
          </span>
          <button
            type="button"
            onClick={handleCenterLiveTrain}
            className="ml-1 px-2.5 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs"
            title="Fly camera to live train location"
          >
            <span className="material-symbols-outlined text-[13px]">my_location</span>
            <span>Center</span>
          </button>
          {onToggleHideLiveFeed && (
            <button
              type="button"
              onClick={onToggleHideLiveFeed}
              className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-[10px] flex items-center gap-1 transition-all border border-slate-700"
              title="Hide live feed from map"
            >
              <span className="material-symbols-outlined text-[13px]">visibility_off</span>
              <span>Hide</span>
            </button>
          )}
        </div>
      )}

      {/* When live train feed is loaded but hidden from map, provide quick restore button */}
      {!showLiveFeed && liveTrainData && liveTrainData.lat != null && onToggleHideLiveFeed && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none">
          <button
            type="button"
            onClick={onToggleHideLiveFeed}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-xl text-xs text-slate-300 hover:text-white hover:border-emerald-500/60 transition-all group"
            title="Restore Live Feed on map"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500/70 group-hover:bg-emerald-400 group-hover:animate-ping" />
            <span>Live Feed Hidden (#{liveTrainData.trainNo})</span>
            <span className="text-emerald-400 font-bold ml-1 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              <span>Show</span>
            </span>
          </button>
        </div>
      )}

      {/* 3. Floating Zoom Control Cluster (Fixed Bottom-Right, White Rounded Container with Soft Shadow) */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col bg-white border border-slate-200 rounded-lg p-1 shadow-md select-none">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
          title="Zoom in"
        >
          <span className="material-symbols-outlined text-[19px]">add</span>
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
          title="Zoom out"
        >
          <span className="material-symbols-outlined text-[19px]">remove</span>
        </button>
        <div className="w-full h-[1px] bg-slate-200 my-0.5" />
        <button
          type="button"
          onClick={viewMode === 'all' ? handleResetCorridor : handleFitAllNetwork}
          className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
          title={viewMode === 'all' ? 'Reset corridor view' : 'Fit network bounds'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {viewMode === 'all' ? 'crop_free' : 'fit_screen'}
          </span>
        </button>
      </div>
    </div>
  );
}

export default MapLibreRailwayMap;
