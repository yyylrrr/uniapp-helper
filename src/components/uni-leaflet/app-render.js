import * as LModule from 'leaflet';

function resolveLeaflet(raw) {
  if (raw && typeof raw.map === 'function') return raw;
  if (raw && raw.default && typeof raw.default.map === 'function') return raw.default;
  if (typeof window !== 'undefined' && window.L && typeof window.L.map === 'function') {
    return window.L;
  }
  if (typeof globalThis !== 'undefined' && globalThis.L && typeof globalThis.L.map === 'function') {
    return globalThis.L;
  }
  return (raw && raw.default) ? raw.default : raw;
}

const L = resolveLeaflet(LModule);

// Inject essential Leaflet layout CSS into Webview document
function ensureLeafletStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('uni-leaflet-core-styles')) return;

  const style = document.createElement('style');
  style.id = 'uni-leaflet-core-styles';
  style.innerHTML = `
    .leaflet-pane,
    .leaflet-tile,
    .leaflet-marker-icon,
    .leaflet-marker-shadow,
    .leaflet-tile-container,
    .leaflet-pane > svg,
    .leaflet-pane > canvas,
    .leaflet-zoom-box,
    .leaflet-image-layer,
    .leaflet-layer {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
    }
    .leaflet-container {
      overflow: hidden !important;
      width: 100% !important;
      height: 100% !important;
      position: relative !important;
      touch-action: none !important;
      -webkit-tap-highlight-color: transparent !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      background: #f2efe9 !important;
      cursor: grab;
    }
    .leaflet-tile,
    .leaflet-marker-icon,
    .leaflet-marker-shadow {
      user-select: none !important;
      -webkit-user-select: none !important;
      -webkit-user-drag: none !important;
    }
    .leaflet-tile {
      filter: inherit !important;
      visibility: hidden;
      max-width: none !important;
      max-height: none !important;
      width: 256px !important;
      height: 256px !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      box-sizing: content-box !important;
      pointer-events: none !important;
    }
    .leaflet-tile-loaded {
      visibility: inherit !important;
    }
    .leaflet-tile-container {
      pointer-events: none !important;
    }
    .leaflet-zoom-animated {
      transform-origin: 0 0 !important;
      -webkit-transform-origin: 0 0 !important;
    }
    .leaflet-pane { z-index: 400; }
    .leaflet-tile-pane { z-index: 200; pointer-events: none !important; }
    .leaflet-overlay-pane { z-index: 400; pointer-events: none !important; }
    .leaflet-shadow-pane { z-index: 500; pointer-events: none !important; }
    .leaflet-marker-pane { z-index: 600; pointer-events: none !important; }
    .leaflet-tooltip-pane { z-index: 650; pointer-events: none !important; }
    .leaflet-popup-pane { z-index: 700; }
    .leaflet-map-pane canvas { z-index: 100; }
    .leaflet-map-pane svg { z-index: 200; pointer-events: none !important; }

    /* Interactive Elements & Clicks */
    .leaflet-interactive,
    .leaflet-pane > svg path.leaflet-interactive,
    .leaflet-pane > svg polygon.leaflet-interactive,
    .leaflet-pane > svg polyline.leaflet-interactive,
    .leaflet-pane > svg circle.leaflet-interactive,
    .leaflet-marker-pane .leaflet-marker-icon {
      pointer-events: auto !important;
      cursor: pointer !important;
    }

    .leaflet-tooltip {
      position: absolute !important;
      padding: 4px 8px !important;
      background-color: #fff !important;
      border: 1px solid #fff !important;
      border-radius: 4px !important;
      color: #222 !important;
      white-space: nowrap !important;
      user-select: none !important;
      pointer-events: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
    }
    .leaflet-tooltip-top {
      margin-top: -6px !important;
    }

    .uni-overlay-label {
      position: absolute !important;
      background-color: rgba(255, 255, 255, 0.96) !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 3px 8px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
      white-space: nowrap !important;
      pointer-events: none !important;
    }

    .leaflet-tooltip-top.uni-overlay-label:before,
    .leaflet-tooltip-top.uni-overlay-label:after {
      content: "" !important;
      position: absolute !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: 0 !important;
      height: 0 !important;
      border-style: solid !important;
      pointer-events: none !important;
    }

    /* Outer border triangle */
    .leaflet-tooltip-top.uni-overlay-label:before {
      bottom: -6px !important;
      border-width: 6px 5px 0 5px !important;
      border-color: #cbd5e1 transparent transparent transparent !important;
      z-index: 1 !important;
    }

    /* Inner fill triangle */
    .leaflet-tooltip-top.uni-overlay-label:after {
      bottom: -5px !important;
      border-width: 5px 4px 0 4px !important;
      border-color: rgba(255, 255, 255, 0.96) transparent transparent transparent !important;
      z-index: 2 !important;
    }
    .uni-emoji-marker-icon,
    .uni-custom-svg-icon,
    .uni-custom-html-icon,
    .uni-custom-img-icon,
    .uni-custom-icon,
    .uni-default-pin,
    .uni-cluster-marker-icon {
      background: transparent !important;
      border: none !important;
    }
    .uni-cluster-bubble {
      position: relative !important;
      width: 44px !important;
      height: 44px !important;
      border-radius: 50% !important;
      background: #ffffff !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22), 0 0 0 3px #3b82f6 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      user-select: none !important;
      box-sizing: border-box !important;
    }
    .uni-cluster-bubble .uni-cluster-icon {
      width: 26px !important;
      height: 26px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      overflow: hidden !important;
    }
    .uni-cluster-bubble .uni-cluster-badge {
      position: absolute !important;
      top: -6px !important;
      right: -8px !important;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
      color: #ffffff !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      height: 18px !important;
      min-width: 18px !important;
      padding: 0 5px !important;
      border-radius: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 2px solid #ffffff !important;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.45) !important;
      box-sizing: border-box !important;
      white-space: nowrap !important;
      pointer-events: none !important;
    }
    @keyframes uni-polyline-flowing {
      from {
        stroke-dashoffset: 40px;
      }
      to {
        stroke-dashoffset: 0px;
      }
    }
    .uni-flowing-polyline {
      animation: uni-polyline-flowing 1.2s linear infinite !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }
    .uni-avatar-marker-icon {
      background: transparent !important;
      border: none !important;
    }
    .uni-avatar-marker-wrapper {
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: flex-start !important;
      cursor: pointer !important;
      user-select: none !important;
    }
    .uni-avatar-bubble {
      position: relative !important;
      border-radius: 50% !important;
      background-color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-sizing: border-box !important;
      overflow: visible !important;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    .uni-avatar-img {
      width: 100% !important;
      height: 100% !important;
      border-radius: 50% !important;
      object-fit: cover !important;
      display: block !important;
      pointer-events: none !important;
    }
    .uni-avatar-arrow {
      position: absolute !important;
      bottom: -6px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: 0 !important;
      height: 0 !important;
      border-left: 5px solid transparent !important;
      border-right: 5px solid transparent !important;
      border-top-width: 6px !important;
      border-top-style: solid !important;
      z-index: 1 !important;
      filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2)) !important;
    }
    .uni-avatar-badge {
      position: absolute !important;
      top: -2px !important;
      right: -2px !important;
      background: #ffffff !important;
      color: #1e293b !important;
      font-size: 8px !important;
      font-weight: 700 !important;
      line-height: 1 !important;
      height: 12px !important;
      min-width: 12px !important;
      padding: 0 2px !important;
      border-radius: 6px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 1px solid rgba(0, 0, 0, 0.08) !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
      box-sizing: border-box !important;
      white-space: nowrap !important;
      z-index: 10 !important;
      pointer-events: none !important;
    }
    @keyframes uni-avatar-pulse {
      0% {
        transform: scale(1);
        opacity: 0.85;
      }
      70% {
        transform: scale(1.6);
        opacity: 0;
      }
      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }
    .uni-avatar-pulse {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      border-radius: 50% !important;
      box-sizing: border-box !important;
      border-style: solid !important;
      border-width: 3px !important;
      animation: uni-avatar-pulse 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite !important;
      pointer-events: none !important;
      z-index: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function generateCurvedPolyline(latLngs, curvature, segments) {
  if (!latLngs || latLngs.length < 2) return latLngs || [];
  const curv = curvature !== undefined ? curvature : 0.25;
  if (Math.abs(curv) < 1e-4) return latLngs;

  function arc(p1, p2) {
    const lat1 = p1[0], lng1 = p1[1];
    const lat2 = p2[0], lng2 = p2[1];
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const dist = Math.hypot(dLat, dLng);
    if (dist < 1e-7) return [p1, p2];
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;
    const normLat = -dLng / dist;
    const normLng = dLat / dist;
    const ctrlLat = midLat + normLat * dist * curv;
    const ctrlLng = midLng + normLng * dist * curv;
    const pts = [];
    const steps = Math.max(12, segments || 36);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const invT = 1 - t;
      const lat = invT * invT * lat1 + 2 * invT * t * ctrlLat + t * t * lat2;
      const lng = invT * invT * lng1 + 2 * invT * t * ctrlLng + t * t * lng2;
      pts.push([lat, lng]);
    }
    return pts;
  }

  if (latLngs.length === 2) return arc(latLngs[0], latLngs[1]);

  const result = [];
  for (let i = 0; i < latLngs.length - 1; i++) {
    const a = arc(latLngs[i], latLngs[i + 1]);
    if (i > 0) a.shift();
    result.push.apply(result, a);
  }
  return result;
}

function extractGeoJsonLatLngs(geojson) {
  if (!geojson) return [];
  const result = [];
  function parseCoordinates(coords) {
    if (!coords || !Array.isArray(coords)) return;
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      result.push([coords[1], coords[0]]);
      return;
    }
    for (var i = 0; i < coords.length; i++) {
      parseCoordinates(coords[i]);
    }
  }
  function parseGeometry(geom) {
    if (!geom || !geom.type) return;
    if (geom.type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
      for (var i = 0; i < geom.geometries.length; i++) {
        parseGeometry(geom.geometries[i]);
      }
      return;
    }
    if (geom.coordinates) parseCoordinates(geom.coordinates);
  }
  function parseFeature(f) {
    if (!f) return;
    if (f.geometry) parseGeometry(f.geometry);
  }
  if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    for (var i = 0; i < geojson.features.length; i++) parseFeature(geojson.features[i]);
  } else if (geojson.type === 'Feature') {
    parseFeature(geojson);
  } else if (geojson.type) {
    parseGeometry(geojson);
  } else if (Array.isArray(geojson)) {
    for (var i = 0; i < geojson.length; i++) {
      result.push.apply(result, extractGeoJsonLatLngs(geojson[i]));
    }
  }
  return result;
}

function getGeoJsonFingerprint(data) {
  if (!data) return 'null';
  try {
    return JSON.stringify(data);
  } catch (e) {
    var str = (data.type || '') + '_' + (data.features ? data.features.length : '');
    if (Array.isArray(data.features)) {
      for (var i = 0; i < data.features.length; i++) {
        var f = data.features[i];
        if (f) {
          str += '_' + (f.id || '') + '_' + (f.properties ? f.properties.name || f.properties.adcode || '' : '');
          if (f.geometry && f.geometry.coordinates) {
            str += '_' + JSON.stringify(f.geometry.coordinates);
          }
        }
      }
    }
    return str;
  }
}

function extractLatLngs(bounds) {
  if (!bounds) return [];
  if (bounds.type && (bounds.features || bounds.geometry || bounds.coordinates || bounds.geometries)) {
    return extractGeoJsonLatLngs(bounds);
  }
  if (Array.isArray(bounds) && bounds.length === 2 && typeof bounds[0] === 'number' && typeof bounds[1] === 'number') {
    return [[bounds[0], bounds[1]]];
  }
  if (Array.isArray(bounds)) {
    const list = [];
    for (const item of bounds) {
      if (!item) continue;
      if (Array.isArray(item) && item.length >= 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
        list.push([item[0], item[1]]);
      } else if (typeof item.lat === 'number' && typeof item.lng === 'number') {
        list.push([item.lat, item.lng]);
      } else if (Array.isArray(item.latLng) && item.latLng.length >= 2) {
        list.push([item.latLng[0], item.latLng[1]]);
      } else if (Array.isArray(item.latLngs)) {
        const pts = item.curved ? generateCurvedPolyline(item.latLngs, item.curvature) : item.latLngs;
        for (var i = 0; i < pts.length; i++) {
          var pt = pts[i];
          if (Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
            list.push([pt[0], pt[1]]);
          } else if (pt && typeof pt.lat === 'number' && typeof pt.lng === 'number') {
            list.push([pt.lat, pt.lng]);
          }
        }
      } else if (item.type && (item.features || item.geometry || item.coordinates)) {
        list.push.apply(list, extractGeoJsonLatLngs(item));
      }
    }
    return list;
  }
  if (bounds.markers || bounds.polylines || bounds.polygons || bounds.circles || bounds.geojson) {
    var list = [];
    if (Array.isArray(bounds.markers)) list = list.concat(extractLatLngs(bounds.markers));
    if (Array.isArray(bounds.polylines)) list = list.concat(extractLatLngs(bounds.polylines));
    if (Array.isArray(bounds.polygons)) list = list.concat(extractLatLngs(bounds.polygons));
    if (Array.isArray(bounds.circles)) list = list.concat(extractLatLngs(bounds.circles));
    if (bounds.geojson) list = list.concat(extractGeoJsonLatLngs(bounds.geojson));
    return list;
  }
  if (typeof bounds.getSouthWest === 'function' && typeof bounds.getNorthEast === 'function') {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return [[sw.lat, sw.lng], [ne.lat, ne.lng]];
  }
  if (typeof bounds.minLat === 'number' && typeof bounds.maxLat === 'number') {
    return [[bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng]];
  }
  if (bounds.southWest && bounds.northEast) {
    const sw = bounds.southWest;
    const ne = bounds.northEast;
    return [
      [Array.isArray(sw) ? sw[0] : sw.lat, Array.isArray(sw) ? sw[1] : sw.lng],
      [Array.isArray(ne) ? ne[0] : ne.lat, Array.isArray(ne) ? ne[1] : ne.lng],
    ];
  }
  return [];
}

function latLngToWorldPixel(lat, lng, zoom, tileSize) {
  tileSize = tileSize || 256;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const scale = tileSize * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const y =
    (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) *
    scale;
  return { x: x, y: y };
}

function clusterMarkers(markers, zoom, options) {
  if (!markers || markers.length === 0) return [];
  const radius = options && options.clusterRadius ? options.clusterRadius : 60;
  const maxZoom =
    options && options.clusterMaxZoom !== undefined
      ? options.clusterMaxZoom
      : 17;
  const tileSize = (options && options.tileSize) || 256;

  if (zoom >= maxZoom) {
    return markers.map(function (m) {
      return { isCluster: false, marker: m };
    });
  }

  const pixelMarkers = [];
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    if (!marker || !marker.latLng) continue;
    const lat = marker.latLng[0];
    const lng = marker.latLng[1];
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      isNaN(lat) ||
      isNaN(lng)
    )
      continue;
    const pt = latLngToWorldPixel(lat, lng, zoom, tileSize);
    pixelMarkers.push({ marker: marker, x: pt.x, y: pt.y, assigned: false });
  }
  if (pixelMarkers.length === 0) return [];

  const grid = {};
  const cellSize = radius;
  for (let i = 0; i < pixelMarkers.length; i++) {
    const pm = pixelMarkers[i];
    const gx = Math.floor(pm.x / cellSize);
    const gy = Math.floor(pm.y / cellSize);
    const key = gx + '_' + gy;
    if (!grid[key]) grid[key] = [];
    grid[key].push(pm);
  }

  const results = [];
  const radiusSq = radius * radius;

  for (let i = 0; i < pixelMarkers.length; i++) {
    const pm = pixelMarkers[i];
    if (pm.assigned) continue;
    pm.assigned = true;
    const clusterItems = [pm];

    const gx = Math.floor(pm.x / cellSize);
    const gy = Math.floor(pm.y / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborKey = gx + dx + '_' + (gy + dy);
        const neighborCell = grid[neighborKey];
        if (!neighborCell) continue;
        for (let k = 0; k < neighborCell.length; k++) {
          const neighbor = neighborCell[k];
          if (neighbor.assigned) continue;
          const distSq =
            (neighbor.x - pm.x) * (neighbor.x - pm.x) +
            (neighbor.y - pm.y) * (neighbor.y - pm.y);
          if (distSq <= radiusSq) {
            neighbor.assigned = true;
            clusterItems.push(neighbor);
          }
        }
      }
    }

    if (clusterItems.length === 1) {
      results.push({ isCluster: false, marker: clusterItems[0].marker });
    } else {
      let sumLat = 0,
        sumLng = 0;
      let minLat = Infinity,
        maxLat = -Infinity,
        minLng = Infinity,
        maxLng = -Infinity;
      const rawMarkers = [];
      for (let j = 0; j < clusterItems.length; j++) {
        const item = clusterItems[j];
        const lat = item.marker.latLng[0];
        const lng = item.marker.latLng[1];
        sumLat += lat;
        sumLng += lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        rawMarkers.push(item.marker);
      }
      const count = clusterItems.length;
      const centerLat = sumLat / count;
      const centerLng = sumLng / count;
      let rep = null;
      for (let j = 0; j < rawMarkers.length; j++) {
        const rm = rawMarkers[j];
        if (rm.icon && (rm.icon.url || rm.icon.svg || rm.icon.text)) {
          rep = rm;
          break;
        }
      }
      if (!rep) rep = rawMarkers[0];

      results.push({
        isCluster: true,
        cluster: {
          id:
            'cluster_' +
            zoom +
            '_' +
            centerLat.toFixed(5) +
            '_' +
            centerLng.toFixed(5) +
            '_' +
            count,
          count: count,
          center: [centerLat, centerLng],
          bounds: [
            [minLat, minLng],
            [maxLat, maxLng],
          ],
          markers: rawMarkers,
          representativeMarker: rep,
        },
      });
    }
  }
  return results;
}

export default {
  data() {
    return {
      map: null,
      tileLayers: [],
      overlayGroup: null,
      markerLayerGroup: null,
      rawMarkers: [],
      clusterOptions: { enable: false, clusterRadius: 60, clusterMaxZoom: 17 },
      isReady: false,
      cachedProps: null,
      isUserInteracting: false,
      lastReportedCenter: null,
      lastReportedZoom: null,
      moveThrottleTimer: null,
      currentLayersKey: '',
      currentOverlaysKey: '',
      currentGeoJsonKey: '',
      geoJsonLayer: null,
      lastFitBoundsTimestamp: 0,
    };
  },
  mounted() {
    ensureLeafletStyles();
    this.initLeaflet();
  },
  beforeDestroy() {
    if (this.moveThrottleTimer) {
      clearTimeout(this.moveThrottleTimer);
      this.moveThrottleTimer = null;
    }
    if (this.markerLayerGroup) {
      this.markerLayerGroup.clearLayers();
      this.markerLayerGroup = null;
    }
    if (this.map) {
      if (this.geoJsonLayer) {
        try {
          this.map.removeLayer(this.geoJsonLayer);
        } catch (e) {}
        this.geoJsonLayer = null;
      }
      this.map.remove();
      this.map = null;
    }
  },
  methods: {
    initLeaflet() {
      if (this.map) return;
      ensureLeafletStyles();

      const id = (this.prop && this.prop.appMapId) || (this.cachedProps && this.cachedProps.appMapId);
      const container = (id && document.getElementById(id)) || (this.$el && this.$el.querySelector ? this.$el.querySelector('.uni-leaflet-h5-container') : this.$el);
      if (!container) {
        setTimeout(() => this.initLeaflet(), 60);
        return;
      }

      const p = this.cachedProps || this.prop || {};
      const center = p.center || [39.9042, 116.4074];
      const zoom = p.zoom || 13;
      const minZoom = p.minZoom ?? 3;
      const maxZoom = p.maxZoom ?? 18;

      try {
        this.map = L.map(container, {
          center: [center[0], center[1]],
          zoom,
          minZoom,
          maxZoom,
          zoomControl: false,
          attributionControl: false,
          tap: false, // Avoid synthetic tap conflicts with pinch-to-zoom on mobile Webview
          touchZoom: true, // Smooth native multi-touch pinch-to-zoom
          bounceAtZoomLimits: false,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        });

        try {
          this.map.createPane('overlayTilePane');
          const overlayPane = this.map.getPane('overlayTilePane');
          if (overlayPane) {
            overlayPane.style.zIndex = '350';
            overlayPane.style.pointerEvents = 'none';
          }
        } catch (e) {}

        this.overlayGroup = L.layerGroup().addTo(this.map);
        this.markerLayerGroup = L.layerGroup().addTo(this.map);

        // Track user drag/pinch gestures to prevent ping-pong feedback loop
        this.map.on('movestart zoomstart dragstart', () => {
          this.isUserInteracting = true;
        });

        this.map.on('move', () => {
          const c = this.map.getCenter();
          const z = this.map.getZoom();
          this.lastReportedCenter = [c.lat, c.lng];
          this.lastReportedZoom = z;

          if (!this.moveThrottleTimer) {
            this.moveThrottleTimer = setTimeout(() => {
              this.moveThrottleTimer = null;
              if (this.map) {
                const cur = this.map.getCenter();
                const curZ = this.map.getZoom();
                this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapMove', { center: [cur.lat, cur.lng], zoom: curZ });
              }
            }, 100);
          }
        });

        this.map.on('moveend zoomend dragend', () => {
          if (this.moveThrottleTimer) {
            clearTimeout(this.moveThrottleTimer);
            this.moveThrottleTimer = null;
          }
          const c = this.map.getCenter();
          const z = this.map.getZoom();
          this.lastReportedCenter = [c.lat, c.lng];
          this.lastReportedZoom = z;

          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapMoveEnd', { center: [c.lat, c.lng], zoom: z });

          setTimeout(() => {
            this.isUserInteracting = false;
          }, 150);
        });

        this.map.on('zoom', () => {
          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapZoom', this.map.getZoom());
        });

        this.map.on('zoomend', () => {
          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapZoomEnd', this.map.getZoom());
          if (this.clusterOptions && this.clusterOptions.enable && this.rawMarkers && this.rawMarkers.length > 0) {
            this.renderMarkers(this.rawMarkers);
          }
        });

        this.map.on('click', (e) => {
          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapClick', {
            latLng: [e.latlng.lat, e.latlng.lng],
            point: { x: e.containerPoint.x, y: e.containerPoint.y }
          });
        });

        this.isReady = true;
        this.applyProps(p);

        // Invalidate size on multiple next frames to sync with Webview layout
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            if (this.map) this.map.invalidateSize(true);
          });
        }
        setTimeout(() => {
          if (this.map) this.map.invalidateSize(true);
        }, 120);
        setTimeout(() => {
          if (this.map) this.map.invalidateSize(true);
        }, 300);

        this.$ownerInstance && this.$ownerInstance.callMethod('onRender_Ready');
      } catch (err) {
        console.error('Leaflet init in renderjs error:', err);
      }
    },
    updateMapProps(newVal) {
      if (!newVal) return;
      this.cachedProps = newVal;
      if (!this.map || !this.isReady) {
        this.initLeaflet();
        return;
      }
      this.applyProps(newVal);
    },
    applyProps(p) {
      if (!this.map || !p) return;

      if (p.clusterOptions) {
        this.clusterOptions = Object.assign({}, this.clusterOptions, p.clusterOptions);
      } else {
        if (p.enableCluster !== undefined) this.clusterOptions.enable = !!p.enableCluster;
        if (p.clusterRadius !== undefined) this.clusterOptions.clusterRadius = p.clusterRadius;
        if (p.clusterMaxZoom !== undefined) this.clusterOptions.clusterMaxZoom = p.clusterMaxZoom;
      }

      // Handle fitBounds action if dispatched
      if (p.fitBoundsAction && p.fitBoundsAction.timestamp && p.fitBoundsAction.timestamp !== this.lastFitBoundsTimestamp) {
        this.lastFitBoundsTimestamp = p.fitBoundsAction.timestamp;
        this.fitBounds(p.fitBoundsAction.bounds, p.fitBoundsAction.options);
      }

      // Anti-feedback loop: Don't setView if the user is actively dragging/zooming or if this is an echo
      if (p.center && p.zoom !== undefined) {
        const curCenter = this.map.getCenter();
        const curZoom = this.map.getZoom();

        const isEcho =
          this.lastReportedCenter &&
          Math.abs(this.lastReportedCenter[0] - p.center[0]) < 1e-4 &&
          Math.abs(this.lastReportedCenter[1] - p.center[1]) < 1e-4 &&
          this.lastReportedZoom !== null &&
          Math.abs(this.lastReportedZoom - p.zoom) < 0.1;

        if (!this.isUserInteracting && !isEcho) {
          const centerDiff =
            Math.abs(curCenter.lat - p.center[0]) > 1e-4 ||
            Math.abs(curCenter.lng - p.center[1]) > 1e-4;
          const zoomDiff = Math.abs(curZoom - p.zoom) > 0.05;

          if (centerDiff || zoomDiff) {
            this.map.setView([p.center[0], p.center[1]], p.zoom, { animate: false });
          }
        }
      }

      // Only rebuild tile layers when tile URLs / configs actually change
      const layersToApply = (p.layers && p.layers.length > 0)
        ? p.layers
        : (p.tileUrl ? [{ url: p.tileUrl, subdomains: p.subdomains }] : []);
      const layersKey = JSON.stringify(layersToApply);
      if (this.currentLayersKey !== layersKey) {
        this.currentLayersKey = layersKey;
        this.setTileLayers(layersToApply);
      }

      // Only rebuild vector overlays when overlay data actually changes
      const overlaysToApply = {
        markers: p.markers,
        polylines: p.polylines,
        polygons: p.polygons,
        circles: p.circles,
        clusterOptions: this.clusterOptions,
        ...(p.overlays || {}),
      };
      const overlaysKey = JSON.stringify(overlaysToApply);
      if (this.currentOverlaysKey !== overlaysKey) {
        this.currentOverlaysKey = overlaysKey;
        this.renderOverlays(overlaysToApply);
      }

      // GeoJSON rendering
      const geoJsonData = p.geojson || (p.overlays && p.overlays.geojson);
      const geoJsonStyle = p.geojsonStyle || (p.overlays && p.overlays.geojsonStyle);
      const styleKey = typeof geoJsonStyle === 'object' ? JSON.stringify(geoJsonStyle) : String(geoJsonStyle || '');
      const revKey = p.geojsonRevision !== undefined ? String(p.geojsonRevision) : '';
      const dataKey = getGeoJsonFingerprint(geoJsonData);
      const geoJsonKey = revKey + '___' + dataKey + '___' + styleKey;

      if (this.currentGeoJsonKey !== geoJsonKey) {
        this.currentGeoJsonKey = geoJsonKey;
        this.renderGeoJSON(geoJsonData, geoJsonStyle);
      }
    },
    setTileLayers(layers) {
      for (const l of this.tileLayers) {
        try {
          this.map.removeLayer(l);
        } catch (e) {}
      }
      this.tileLayers = [];

      for (let i = 0; i < layers.length; i++) {
        const cfg = typeof layers[i] === 'string' ? { url: layers[i] } : layers[i];
        const subdomains = cfg.subdomains || ['a', 'b', 'c'];
        const isOverlay = (cfg.zIndex && cfg.zIndex >= 10) || (i > 0);
        const tile = L.tileLayer(cfg.url, {
          subdomains,
          opacity: cfg.opacity !== undefined ? cfg.opacity : 1,
          zIndex: cfg.zIndex || (i + 1),
          pane: isOverlay ? 'overlayTilePane' : 'tilePane',
          tileSize: 256,
        });
        tile.addTo(this.map);
        this.tileLayers.push(tile);
      }
    },
    renderOverlays(overlays) {
      if (!this.overlayGroup) return;
      this.overlayGroup.clearLayers();

      // Polygons
      if (overlays.polygons) {
        for (const poly of overlays.polygons) {
          if (!poly.latLngs || poly.latLngs.length < 3) continue;
          const lPoly = L.polygon(poly.latLngs, {
            color: poly.color || '#ef4444',
            weight: poly.width || 2,
            fillColor: poly.fillColor || '#ef4444',
            fillOpacity: poly.fillOpacity ?? 0.25,
            interactive: true,
          }).addTo(this.overlayGroup);
          if (poly.label) {
            const labelText = typeof poly.label === 'string' ? poly.label : poly.label.text;
            lPoly.bindTooltip(labelText, { permanent: true, direction: 'center', className: 'uni-overlay-label' });
          }
          lPoly.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', { type: 'polygon', data: poly });
          });
        }
      }

      // Circles
      if (overlays.circles) {
        for (const c of overlays.circles) {
          const lCircle = L.circle([c.latLng[0], c.latLng[1]], {
            radius: c.radius,
            color: c.color || '#10b981',
            weight: c.width || 2,
            fillColor: c.fillColor || c.color || '#10b981',
            fillOpacity: c.fillOpacity ?? 0.2,
            interactive: true,
          }).addTo(this.overlayGroup);
          if (c.label) {
            const labelText = typeof c.label === 'string' ? c.label : c.label.text;
            lCircle.bindTooltip(labelText, { permanent: true, direction: 'center', className: 'uni-overlay-label' });
          }
          lCircle.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', { type: 'circle', data: c });
          });
        }
      }

      // Polylines
      if (overlays.polylines) {
        for (const line of overlays.polylines) {
          if (!line.latLngs || line.latLngs.length < 2) continue;
          const finalLatLngs = line.curved ? generateCurvedPolyline(line.latLngs, line.curvature) : line.latLngs;
          const isFlowing = !!line.flowing;
          const dashStr = line.dashArray ? line.dashArray.join(',') : (isFlowing ? '12,12' : undefined);
          const lLine = L.polyline(finalLatLngs, {
            color: line.color || '#3b82f6',
            weight: line.width || 4,
            opacity: line.opacity ?? 1,
            dashArray: dashStr,
            className: isFlowing ? 'uni-flowing-polyline' : '',
            interactive: true,
          }).addTo(this.overlayGroup);

          if (isFlowing) {
            const pathEl = lLine.getElement ? lLine.getElement() : lLine._path;
            if (pathEl) {
              const speed = line.flowSpeed || 1;
              const duration = Math.max(0.2, 1.2 / Math.abs(speed));
              pathEl.style.animationDuration = duration + 's';
              if (speed < 0) {
                pathEl.style.animationDirection = 'reverse';
              }
            }
          }

          if (line.label) {
            const labelText = typeof line.label === 'string' ? line.label : line.label.text;
            lLine.bindTooltip(labelText, { permanent: true, direction: 'center', className: 'uni-overlay-label' });
          }
          lLine.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', { type: 'polyline', data: line });
          });
        }
      }

      // Markers
      this.renderMarkers(overlays.markers || []);
    },
    renderGeoJSON(data, style) {
      if (this.geoJsonLayer && this.map) {
        try {
          this.map.removeLayer(this.geoJsonLayer);
        } catch (e) {}
        this.geoJsonLayer = null;
      }
      if (!data || !this.map) return;

      const defaultStyle = {
        color: '#3b82f6',
        weight: 2,
        opacity: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.25,
      };

      const resolveStyle = (feature) => {
        let s = {};
        if (typeof style === 'function') {
          s = style(feature) || {};
        } else if (style && typeof style === 'object') {
          s = style;
        }
        return {
          color: s.color || defaultStyle.color,
          weight: s.weight !== undefined ? s.weight : defaultStyle.weight,
          opacity: s.opacity !== undefined ? s.opacity : defaultStyle.opacity,
          fillColor: s.fillColor || s.color || defaultStyle.fillColor,
          fillOpacity: s.fillOpacity !== undefined ? s.fillOpacity : defaultStyle.fillOpacity,
          dashArray: s.dashArray ? (Array.isArray(s.dashArray) ? s.dashArray.join(',') : s.dashArray) : undefined,
        };
      };

      try {
        this.geoJsonLayer = L.geoJSON(data, {
          style: (feature) => resolveStyle(feature),
          onEachFeature: (feature, layer) => {
            layer.on('click', (e) => {
              if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
              this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', {
                type: 'geojson',
                data: feature
              });
            });
          }
        }).addTo(this.map);
      } catch (err) {
        console.error('Render GeoJSON in renderjs error:', err);
      }
    },
    renderMarkers(markers) {
      this.rawMarkers = markers || [];
      if (!this.markerLayerGroup) return;
      this.markerLayerGroup.clearLayers();

      const enableCluster = this.clusterOptions && this.clusterOptions.enable;
      if (!enableCluster) {
        for (let i = 0; i < this.rawMarkers.length; i++) {
          this.createSingleMarker(this.rawMarkers[i]);
        }
        return;
      }

      const curZoom = this.map ? this.map.getZoom() : 13;
      const results = clusterMarkers(this.rawMarkers, curZoom, this.clusterOptions);

      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        if (!item.isCluster) {
          this.createSingleMarker(item.marker);
        } else {
          this.createClusterMarker(item.cluster);
        }
      }
    },
    createSingleMarker(m) {
      let icon;
      const size = m.icon && m.icon.size ? m.icon.size : [32, 32];
      const anchor = m.icon && m.icon.anchor ? m.icon.anchor : [size[0] / 2, size[1]];
      const tooltipAnchor = [size[0] / 2 - anchor[0], -anchor[1]];

      if (m.icon && m.icon.type === 'avatar') {
        const avatarSize = m.icon.size || size || [32, 32];
        const avatarW = avatarSize[0];
        const avatarH = avatarSize[1];
        const borderColor = m.icon.borderColor || '#3b82f6';
        const borderWidth = m.icon.borderWidth !== undefined ? m.icon.borderWidth : (avatarW <= 36 ? 2.5 : 3);
        const pulseColor = m.icon.pulseColor || borderColor;
        const badgeText = m.icon.badgeText;
        const isCustomBg = !!m.icon.badgeColor;
        const badgeBg = isCustomBg
          ? 'background:' + m.icon.badgeColor + ' !important; color:#ffffff !important; border:1.5px solid #ffffff !important;'
          : 'background:#ffffff !important; color:#1e293b !important; border:1px solid rgba(0,0,0,0.08) !important;';
        const hasPulse = !!m.icon.pulse;

        const arrowW = avatarW <= 36 ? 4 : 5;
        const arrowH = avatarW <= 36 ? 5 : 6;
        const badgeHeight = avatarW <= 36 ? 12 : Math.max(14, Math.round(avatarW * 0.32));
        const badgeFontSize = avatarW <= 36 ? 8 : Math.max(9, Math.round(badgeHeight * 0.65));
        const badgeOffsetTop = avatarW <= 36 ? -2 : -3;
        const badgeOffsetRight = avatarW <= 36 ? -2 : -4;
        const badgePadding = avatarW <= 36 ? '0 2px' : '0 3px';

        let imgUrl = m.icon.url || '';
        if (
          imgUrl &&
          typeof imgUrl === 'string' &&
          !imgUrl.startsWith('data:') &&
          !imgUrl.startsWith('http://') &&
          !imgUrl.startsWith('https://')
        ) {
          if (imgUrl.startsWith('/')) {
            imgUrl = imgUrl.slice(1);
          }
        }

        const pulseHtml = hasPulse
          ? '<div class="uni-avatar-pulse" style="position:absolute;top:0;left:0;width:' + avatarW + 'px !important;height:' + avatarH + 'px !important;border-radius:50%;box-sizing:border-box;border:' + borderWidth + 'px solid ' + pulseColor + ';pointer-events:none;z-index:0;"></div>'
          : '';
        const badgeHtml = badgeText
          ? '<div class="uni-avatar-badge" style="position:absolute;top:' + badgeOffsetTop + 'px;right:' + badgeOffsetRight + 'px;font-size:' + badgeFontSize + 'px;font-weight:700;line-height:1;height:' + badgeHeight + 'px;min-width:' + badgeHeight + 'px;padding:' + badgePadding + ';border-radius:' + (badgeHeight / 2) + 'px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.25);box-sizing:border-box;white-space:nowrap;z-index:10;pointer-events:none;' + badgeBg + '">' + badgeText + '</div>'
          : '';

        const html =
          '<div class="uni-avatar-marker-wrapper" style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;cursor:pointer;user-select:none;width:' + avatarW + 'px;height:' + (avatarH + arrowH) + 'px;">' +
          pulseHtml +
          '<div class="uni-avatar-bubble" style="position:relative;width:' + avatarW + 'px !important;height:' + avatarH + 'px !important;flex-shrink:0;border-radius:50%;background-color:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:visible;border:' + borderWidth + 'px solid ' + borderColor + ';">' +
          '<img class="uni-avatar-img" src="' + imgUrl + '" style="width:100% !important;height:100% !important;border-radius:50%;object-fit:cover;display:block;pointer-events:none;" />' +
          '<div class="uni-avatar-arrow" style="position:absolute;bottom:-' + arrowH + 'px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:' + arrowW + 'px solid transparent;border-right:' + arrowW + 'px solid transparent;border-top:' + arrowH + 'px solid ' + borderColor + ' !important;border-top-color:' + borderColor + ' !important;z-index:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.2));"></div>' +
          '</div>' +
          badgeHtml +
          '</div>';

        icon = L.divIcon({
          html: html,
          className: 'uni-avatar-marker-icon',
          iconSize: [avatarW, avatarH + arrowH],
          iconAnchor: m.icon.anchor || [avatarW / 2, avatarH + arrowH],
          tooltipAnchor: [0, -(avatarH + arrowH + 2)],
        });
      } else if (m.icon && m.icon.svg) {
        let svgStr = m.icon.svg.trim();
        if (svgStr.indexOf('xmlns=') === -1) {
          svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        icon = L.divIcon({
          className: 'uni-custom-svg-icon',
          html:
            '<div style="width:' +
            size[0] +
            'px;height:' +
            size[1] +
            'px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' +
            svgStr +
            '</div>',
          iconSize: size,
          iconAnchor: anchor,
          tooltipAnchor: tooltipAnchor,
        });
      } else if (m.icon && m.icon.html) {
        icon = L.divIcon({
          className: 'uni-custom-html-icon',
          html: m.icon.html,
          iconSize: size,
          iconAnchor: anchor,
          tooltipAnchor: tooltipAnchor,
        });
      } else if (m.icon && m.icon.url) {
        let finalUrl = m.icon.url;
        if (
          finalUrl &&
          typeof finalUrl === 'string' &&
          !finalUrl.startsWith('data:') &&
          !finalUrl.startsWith('http://') &&
          !finalUrl.startsWith('https://')
        ) {
          if (finalUrl.startsWith('/')) {
            finalUrl = finalUrl.slice(1);
          }
        }
        const html =
          '<img src="' +
          finalUrl +
          '" style="width:' +
          size[0] +
          'px;height:' +
          size[1] +
          'px;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />';
        icon = L.divIcon({
          className: 'uni-custom-img-icon',
          html: html,
          iconSize: size,
          iconAnchor: anchor,
          tooltipAnchor: tooltipAnchor,
        });
      } else if (m.icon && m.icon.text) {
        const fontSize = Math.round(size[0] * 0.72);
        icon = L.divIcon({
          className: 'uni-emoji-marker-icon',
          html:
            '<div style="font-size:' +
            fontSize +
            'px;line-height:1;text-align:center;pointer-events:auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' +
            m.icon.text +
            '</div>',
          iconSize: size,
          iconAnchor: anchor,
          tooltipAnchor: tooltipAnchor,
        });
      } else {
        const pinColor = m.icon && m.icon.color ? m.icon.color : '#ef4444';
        const html =
          '<svg viewBox="0 0 24 32" width="' +
          size[0] +
          '" height="' +
          size[1] +
          '" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">' +
          '<path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="' +
          pinColor +
          '"/>' +
          '<circle cx="12" cy="11" r="4.5" fill="#ffffff"/>' +
          '</svg>';
        icon = L.divIcon({
          html: html,
          className: 'uni-default-pin',
          iconSize: size,
          iconAnchor: anchor,
          tooltipAnchor: tooltipAnchor,
        });
      }

      const lMarker = L.marker([m.latLng[0], m.latLng[1]], {
        icon: icon,
        interactive: true,
      }).addTo(this.markerLayerGroup);

      if (m.label) {
        const labelText = typeof m.label === 'string' ? m.label : m.label.text;
        const customOffset =
          typeof m.label === 'object' && m.label.offset
            ? m.label.offset
            : undefined;
        let offset = [0, 0];
        if (customOffset) {
          const ox = customOffset[0] || 0;
          const oy = customOffset[1] || 0;
          if (Math.abs(oy) <= 10) {
            offset = [ox, oy];
          } else {
            offset = [ox, 0];
          }
        }
        lMarker.bindTooltip(labelText, {
          permanent: true,
          direction: 'top',
          offset: offset,
          className: 'uni-overlay-label',
        });
      }

      lMarker.on('click', (e) => {
        if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
        this.$ownerInstance &&
          this.$ownerInstance.callMethod('onRender_OverlayClick', {
            type: 'marker',
            data: m,
          });
      });
    },
    createClusterMarker(cluster) {
      const rep = cluster.representativeMarker;
      let iconContent = '';

      if (rep && rep.icon && rep.icon.url) {
        let finalUrl = rep.icon.url;
        if (
          finalUrl &&
          typeof finalUrl === 'string' &&
          !finalUrl.startsWith('data:') &&
          !finalUrl.startsWith('http://') &&
          !finalUrl.startsWith('https://')
        ) {
          if (finalUrl.startsWith('/')) finalUrl = finalUrl.slice(1);
        }
        iconContent =
          '<img src="' +
          finalUrl +
          '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />';
      } else if (rep && rep.icon && rep.icon.text) {
        iconContent =
          '<span style="font-size:20px;line-height:1;">' +
          rep.icon.text +
          '</span>';
      } else if (rep && rep.icon && rep.icon.svg) {
        let svgStr = rep.icon.svg.trim();
        if (svgStr.indexOf('xmlns=') === -1) {
          svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        iconContent = svgStr;
      } else {
        iconContent =
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="#3b82f6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>';
      }

      const html =
        '<div class="uni-cluster-bubble">' +
        '<div class="uni-cluster-icon">' +
        iconContent +
        '</div>' +
        '<div class="uni-cluster-badge">+' +
        cluster.count +
        '</div>' +
        '</div>';

      const icon = L.divIcon({
        html: html,
        className: 'uni-cluster-marker-icon',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const lCluster = L.marker([cluster.center[0], cluster.center[1]], {
        icon: icon,
        interactive: true,
        zIndexOffset: 1000,
      }).addTo(this.markerLayerGroup);

      lCluster.on('click', (e) => {
        if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
        const bounds = cluster.bounds;
        const isSameCoord =
          Math.abs(bounds[0][0] - bounds[1][0]) < 1e-6 &&
          Math.abs(bounds[0][1] - bounds[1][1]) < 1e-6;

        if (isSameCoord) {
          this.map.setZoom(Math.min(this.map.getZoom() + 2, 19));
          this.map.panTo([cluster.center[0], cluster.center[1]]);
        } else {
          this.fitBounds(bounds, { padding: [60, 60], animate: true });
        }

        this.$ownerInstance &&
          this.$ownerInstance.callMethod('onRender_ClusterClick', cluster);
      });
    },
    fitBounds(bounds, options) {
      if (!this.map || !bounds) return;
      try {
        const latLngs = extractLatLngs(bounds);
        if (!latLngs || latLngs.length === 0) return;
        const leafletOptions = {};
        if (options && options.padding) leafletOptions.padding = options.padding;
        if (options && options.paddingTopLeft) leafletOptions.paddingTopLeft = options.paddingTopLeft;
        if (options && options.paddingBottomRight) leafletOptions.paddingBottomRight = options.paddingBottomRight;
        if (options && options.maxZoom !== undefined) leafletOptions.maxZoom = options.maxZoom;
        if (options && options.animate !== undefined) leafletOptions.animate = options.animate;
        if (options && options.duration !== undefined) leafletOptions.duration = options.duration / 1000;
        this.map.fitBounds(latLngs, leafletOptions);
      } catch (e) {
        console.error('[uni-leaflet app-render] fitBounds error:', e);
      }
    },
  }
};
