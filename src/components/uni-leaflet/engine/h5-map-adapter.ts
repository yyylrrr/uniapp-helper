import type {
  IMapEngine,
  LatLngTuple,
  Point,
  TileLayerConfig,
  MarkerOptions,
  PolylineOptions,
  PolygonOptions,
  CircleOptions,
  MapOverlays,
  OverlayClickEvent,
  FitBoundsOptions,
  LatLngBoundsExpression,
  MapBounds,
  ClusterOptions,
  ClusterGroup,
  GeoJsonStyle,
  GeoJsonStyleOptions,
} from '../types';
import { extractLatLngs } from '../utils/bounds';
import { clusterMarkers } from '../utils/cluster';
import { resolveGeoJsonStyle } from '../utils/geojson';
import { generateCurvedPolyline } from '../utils/curve';

export interface H5AdapterOptions {
  container: HTMLElement;
  center?: LatLngTuple;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  tileUrl?: string;
  subdomains?: string[];
  layers?: Array<string | TileLayerConfig>;
  overlays?: MapOverlays;
  geojson?: any;
  geojsonStyle?: GeoJsonStyle;
  onMove?: (center: LatLngTuple, zoom: number) => void;
  onMoveEnd?: (center: LatLngTuple, zoom: number) => void;
  onZoom?: (zoom: number) => void;
  onZoomEnd?: (zoom: number) => void;
  onClick?: (latLng: LatLngTuple, point: Point) => void;
  onOverlayClick?: (event: OverlayClickEvent) => void;
  onClusterClick?: (cluster: ClusterGroup) => void;
  clusterOptions?: ClusterOptions;
}

import * as LModule from 'leaflet';
import 'leaflet/dist/leaflet.css';

function patchLeafletDraggableSafeguards(L: any) {
  if (!L || (L as any).__uni_patched__) return;
  (L as any).__uni_patched__ = true;

  // 1. Prototype-level defense: Prevent "Cannot read properties of undefined (reading 'baseVal')"
  // When mouse events bubble to document or window, el.classList is undefined in standard DOM,
  // causing Leaflet's internal DomUtil.addClass/getClass to attempt accessing document.className.baseVal.
  if (typeof window !== 'undefined') {
    const emptyClassList = {
      add() {},
      remove() {},
      contains() { return false; },
      toggle() { return false; },
      item() { return null; },
      length: 0,
      value: '',
    };

    if (typeof Document !== 'undefined') {
      if (!(Document.prototype as any).classList) {
        Object.defineProperty(Document.prototype, 'classList', {
          get() { return emptyClassList; },
          configurable: true,
        });
      }
      if ((Document.prototype as any).className === undefined) {
        Object.defineProperty(Document.prototype, 'className', {
          get() { return ''; },
          set(_val: any) {},
          configurable: true,
        });
      }
    }

    if (typeof Window !== 'undefined') {
      if (!(Window.prototype as any).classList) {
        Object.defineProperty(Window.prototype, 'classList', {
          get() { return emptyClassList; },
          configurable: true,
        });
      }
      if ((Window.prototype as any).className === undefined) {
        Object.defineProperty(Window.prototype, 'className', {
          get() { return ''; },
          set(_val: any) {},
          configurable: true,
        });
      }
    }
  }

  // 2. Defend against "Cannot read properties of undefined (reading 'baseVal')" in L.DomUtil
  if (L.DomUtil) {
    const origRemoveClass = L.DomUtil.removeClass;
    const origAddClass = L.DomUtil.addClass;

    L.DomUtil.getClass = function (el: any) {
      if (!el || typeof el !== 'object') return '';
      if (el.correspondingElement) {
        el = el.correspondingElement;
      }
      if (!el || !el.className) {
        return (el && typeof el.className === 'string') ? el.className : '';
      }
      return el.className.baseVal === undefined ? String(el.className || '') : (el.className.baseVal || '');
    };

    L.DomUtil.setClass = function (el: any, name: string) {
      if (!el || typeof el !== 'object') return;
      if (!el.className || el.className.baseVal === undefined) {
        if ('className' in el) {
          try { el.className = name; } catch (e) { }
        }
      } else {
        try { el.className.baseVal = name; } catch (e) { }
      }
    };

    L.DomUtil.removeClass = function (el: any, name: string) {
      if (!el || typeof el !== 'object') return;
      if (el.classList !== undefined) {
        try { el.classList.remove(name); } catch (e) { }
      } else if (el.className) {
        try { origRemoveClass.call(L.DomUtil, el, name); } catch (e) { }
      }
    };

    L.DomUtil.addClass = function (el: any, name: string) {
      if (!el || typeof el !== 'object') return;
      if (el.classList !== undefined) {
        try { el.classList.add(name); } catch (e) { }
      } else if (el.className) {
        try { origAddClass.call(L.DomUtil, el, name); } catch (e) { }
      }
    };
  }

  // 3. Defend against dragging lockup when finishDrag or _onMove throws or when dragging is orphaned
  if (L.Draggable && L.Draggable.prototype) {
    const origOnMove = L.Draggable.prototype._onMove;
    if (origOnMove) {
      L.Draggable.prototype._onMove = function (e: any) {
        if (!this._moving && e && (!e.target || !(e.target instanceof Element))) {
          const safeTarget = this._element || (typeof document !== 'undefined' ? document.body : null);
          if (safeTarget) {
            try {
              Object.defineProperty(e, 'target', { value: safeTarget, configurable: true });
            } catch (err) { }
          }
        }
        try {
          origOnMove.call(this, e);
        } catch (err) {
          console.warn('[uni-leaflet] Safe recovery from Draggable _onMove error:', err);
        }
      };
    }

    const origFinishDrag = L.Draggable.prototype.finishDrag;
    L.Draggable.prototype.finishDrag = function (noInertia: any) {
      try {
        origFinishDrag.call(this, noInertia);
      } catch (err) {
        console.warn('[uni-leaflet] Safe recovery from Draggable finishDrag error:', err);
      } finally {
        this._moving = false;
        L.Draggable._dragging = false;
      }
    };
  }
}

function getL(): any {
  let L: any = null;
  if (LModule && typeof (LModule as any).map === 'function') {
    L = LModule;
  } else if (
    LModule &&
    (LModule as any).default &&
    typeof (LModule as any).default.map === 'function'
  ) {
    L = (LModule as any).default;
  } else if (
    typeof window !== 'undefined' &&
    (window as any).L &&
    typeof (window as any).L.map === 'function'
  ) {
    L = (window as any).L;
  } else if (
    typeof globalThis !== 'undefined' &&
    (globalThis as any).L &&
    typeof (globalThis as any).L.map === 'function'
  ) {
    L = (globalThis as any).L;
  } else {
    L = (LModule as any)?.default || LModule;
  }

  if (L) {
    patchLeafletDraggableSafeguards(L);
  }
  return L;
}

function ensureH5GlobalStyles() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById('uni-leaflet-h5-global-styles') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'uni-leaflet-h5-global-styles';
    document.head.appendChild(style);
  }
  style.textContent = `
    .uni-avatar-marker-icon,
    .uni-cluster-marker-icon,
    .uni-emoji-marker-icon,
    .uni-custom-svg-icon,
    .uni-custom-html-icon,
    .uni-custom-img-icon,
    .uni-custom-icon,
    .uni-default-pin {
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
    .uni-avatar-marker-wrapper:hover .uni-avatar-bubble {
      transform: scale(1.12) !important;
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
      transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    .uni-cluster-bubble:hover {
      transform: scale(1.1) !important;
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
      from { stroke-dashoffset: 40px; }
      to { stroke-dashoffset: 0px; }
    }
    .uni-flowing-polyline {
      animation: uni-polyline-flowing 1.2s linear infinite !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }
    .leaflet-tooltip.uni-overlay-label {
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
    .leaflet-tooltip-top.uni-overlay-label:after {
      bottom: -5px !important;
      border-width: 5px 4px 0 4px !important;
      border-color: rgba(255, 255, 255, 0.96) transparent transparent transparent !important;
      z-index: 2 !important;
    }
  `;
  document.head.appendChild(style);
}

export class H5MapAdapter implements IMapEngine {
  private map: any = null;
  private tileLayers: any[] = [];
  private overlayGroup: any = null;
  private polygonGroup: any = null;
  private polylineGroup: any = null;
  private circleGroup: any = null;
  private geoJsonGroup: any = null;
  private markerLayerGroup: any = null;
  private rawMarkers: MarkerOptions[] = [];
  private clusterOptions: ClusterOptions = {
    enable: false,
    clusterRadius: 60,
    clusterMaxZoom: 17,
  };
  private geoJsonLayer: any = null;
  private currentGeoJsonData: any = null;
  private currentGeoJsonStyle?: GeoJsonStyle;
  private lastDragTimestamp = 0;
  private L: any = null;
  private pendingLayers?: Array<string | TileLayerConfig>;
  private pendingOverlays?: MapOverlays;
  private releaseWatchdogHandler?: () => void;

  private isRecentlyDragged(): boolean {
    if (!this.map) return false;
    if (Date.now() - this.lastDragTimestamp < 300) return true;
    if (this.map.dragging && typeof this.map.dragging.moved === 'function') {
      return this.map.dragging.moved();
    }
    return false;
  }

  public onMove?: (center: LatLngTuple, zoom: number) => void;
  public onMoveEnd?: (center: LatLngTuple, zoom: number) => void;
  public onZoom?: (zoom: number) => void;
  public onZoomEnd?: (zoom: number) => void;
  public onClick?: (latLng: LatLngTuple, point: Point) => void;
  public onOverlayClick?: (event: OverlayClickEvent) => void;
  public onClusterClick?: (cluster: ClusterGroup) => void;

  public async init(options: H5AdapterOptions): Promise<void> {
    ensureH5GlobalStyles();
    this.onMove = options.onMove;
    this.onMoveEnd = options.onMoveEnd;
    this.onZoom = options.onZoom;
    this.onZoomEnd = options.onZoomEnd;
    this.onClick = options.onClick;
    this.onOverlayClick = options.onOverlayClick;
    this.onClusterClick = options.onClusterClick;
    if (options.clusterOptions) {
      this.clusterOptions = { ...this.clusterOptions, ...options.clusterOptions };
    }

    let L = getL();
    if (!L || typeof L.map !== 'function') {
      console.warn('[uni-leaflet] Leaflet map instance not found. Make sure leaflet is installed.');
    }
    this.L = L;

    const center = options.center || [39.9042, 116.4074];
    const zoom = options.zoom || 13;
    const minZoom = options.minZoom ?? 3;
    const maxZoom = options.maxZoom ?? 18;

    this.map = L.map(options.container, {
      center: [center[0], center[1]],
      zoom,
      minZoom,
      maxZoom,
      zoomControl: false, // We provide unified UI controls
      attributionControl: false,
    });

    if (typeof window !== 'undefined') {
      (window as any).__activeMap = this.map;
    }

    // Create a dedicated overlay pane for annotation / label layers above tilePane
    try {
      this.map.createPane('overlayTilePane');
      const overlayPane = this.map.getPane('overlayTilePane');
      if (overlayPane) {
        overlayPane.style.zIndex = '350';
        overlayPane.style.pointerEvents = 'none';
      }
    } catch (e) { }

    // Create isolated layer groups in ordered Z-depth hierarchy
    // 1. GeoJSON (boundaries / background districts)
    this.geoJsonGroup = L.layerGroup().addTo(this.map);
    // 2. Vector overlays (Polygons, Circles, Polylines)
    this.polygonGroup = L.layerGroup().addTo(this.map);
    this.circleGroup = L.layerGroup().addTo(this.map);
    this.polylineGroup = L.layerGroup().addTo(this.map);
    // 3. Markers & Clusters on top
    this.markerLayerGroup = L.layerGroup().addTo(this.map);
    // 4. General overlayGroup for backwards-compatibility
    this.overlayGroup = L.layerGroup().addTo(this.map);

    const initialLayers =
      this.pendingLayers ||
      options.layers ||
      [
        {
          url:
            options.tileUrl ||
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: options.subdomains || ['a', 'b', 'c'],
        },
      ];

    this.setLayers(initialLayers);

    if (this.pendingOverlays || options.overlays) {
      this.setOverlays(this.pendingOverlays || options.overlays || {});
    }

    if (options.geojson || options.overlays?.geojson) {
      this.setGeoJSON(
        options.geojson || options.overlays?.geojson,
        options.geojsonStyle || options.overlays?.geojsonStyle
      );
    }

    // Track user drag/move gesture to prevent click misfire on overlays after panning
    this.map.on('movestart dragstart moveend dragend', () => {
      this.lastDragTimestamp = Date.now();
    });

    // Bind Leaflet events
    this.map.on('move', () => {
      const c = this.map.getCenter();
      const z = this.map.getZoom();
      this.onMove?.([c.lat, c.lng], z);
    });

    this.map.on('moveend', () => {
      const c = this.map.getCenter();
      const z = this.map.getZoom();
      this.onMoveEnd?.([c.lat, c.lng], z);
    });

    this.map.on('zoom', () => {
      const z = this.map.getZoom();
      this.onZoom?.(z);
    });

    this.map.on('zoomend', () => {
      const z = this.map.getZoom();
      this.onZoomEnd?.(z);
      if (this.clusterOptions.enable && this.rawMarkers.length > 0) {
        this.renderMarkers();
      }
    });

    this.map.on('click', (e: any) => {
      this.onClick?.([e.latlng.lat, e.latlng.lng], {
        x: e.containerPoint.x,
        y: e.containerPoint.y,
      });
    });

    // Global watchdog against orphaned Leaflet drag state (e.g., pointer released outside container or interrupted by DOM shifts)
    if (typeof window !== 'undefined') {
      const releaseGhostDrag = () => {
        if (L && L.Draggable && L.Draggable._dragging) {
          L.Draggable._dragging = false;
        }
      };
      window.addEventListener('mouseup', releaseGhostDrag, true);
      window.addEventListener('touchend', releaseGhostDrag, true);
      this.releaseWatchdogHandler = () => {
        window.removeEventListener('mouseup', releaseGhostDrag, true);
        window.removeEventListener('touchend', releaseGhostDrag, true);
      };
    }

    // Invalidate size in next tick to avoid tile rendering glitches
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  public setCenter(center: LatLngTuple, animate = true) {
    if (!this.map) return;
    if (animate) {
      this.map.panTo([center[0], center[1]]);
    } else {
      this.map.setView([center[0], center[1]], this.map.getZoom());
    }
  }

  public setZoom(zoom: number) {
    if (!this.map) return;
    this.map.setZoom(zoom);
  }

  public zoomIn() {
    if (!this.map) return;
    this.map.zoomIn();
  }

  public zoomOut() {
    if (!this.map) return;
    this.map.zoomOut();
  }

  public panTo(center: LatLngTuple, duration?: number) {
    if (!this.map) return;
    this.map.panTo([center[0], center[1]], {
      duration: duration ? duration / 1000 : 0.5,
    });
  }

  public fitBounds(
    bounds: LatLngBoundsExpression | LatLngTuple[] | MapBounds,
    options?: FitBoundsOptions
  ) {
    if (!this.map) return;
    const latLngs = extractLatLngs(bounds);
    if (!latLngs || latLngs.length === 0) return;

    const leafletOptions: any = {
      animate: options?.animate !== false,
    };
    if (options?.padding) {
      leafletOptions.padding = options.padding;
    }
    if (options?.paddingTopLeft) {
      leafletOptions.paddingTopLeft = options.paddingTopLeft;
    }
    if (options?.paddingBottomRight) {
      leafletOptions.paddingBottomRight = options.paddingBottomRight;
    }
    if (options?.maxZoom !== undefined) {
      leafletOptions.maxZoom = options.maxZoom;
    }
    if (options?.duration !== undefined) {
      leafletOptions.duration = options.duration / 1000;
    }

    this.map.fitBounds(latLngs, leafletOptions);
  }

  public setTileUrl(url: string, subdomains?: string[]) {
    this.setLayers([{ url, subdomains }]);
  }

  public setLayers(layers: Array<string | TileLayerConfig>) {
    if (!this.map || !this.L) {
      this.pendingLayers = layers;
      return;
    }

    // Remove existing tile layers
    for (const layer of this.tileLayers) {
      try {
        this.map.removeLayer(layer);
      } catch (e) { }
    }
    this.tileLayers = [];

    // Add new layers
    let index = 0;
    for (const l of layers) {
      const cfg = typeof l === 'string' ? { url: l } : l;
      if (!cfg.url) continue;

      // Base layer in tilePane (zIndex 200), overlays in overlayTilePane (zIndex 350)
      const isBase = index === 0;
      const pane = isBase ? 'tilePane' : 'overlayTilePane';
      const zIndex = cfg.zIndex ?? (index + 1) * 10;

      const tileLayer = this.L.tileLayer(cfg.url, {
        subdomains: cfg.subdomains || ['a', 'b', 'c', 'd'],
        opacity: cfg.opacity ?? 1,
        zIndex,
        pane,
        minZoom: cfg.minZoom ?? this.map.getMinZoom?.() ?? 3,
        maxZoom: cfg.maxZoom ?? this.map.getMaxZoom?.() ?? 18,
      }).addTo(this.map);

      if (typeof tileLayer.setZIndex === 'function') {
        tileLayer.setZIndex(zIndex);
      }

      this.tileLayers.push(tileLayer);
      index++;
    }
  }

  // --- Vector Overlays (Markers, Polylines, Polygons, Circles) ---

  public setOverlays(overlays: MapOverlays) {
    if (!this.map || !this.L) {
      this.pendingOverlays = overlays;
      return;
    }

    if (overlays.polygons !== undefined) {
      this.setPolygons(overlays.polygons);
    }
    if (overlays.polylines !== undefined) {
      this.setPolylines(overlays.polylines);
    }
    if (overlays.circles !== undefined) {
      this.setCircles(overlays.circles);
    }
    if (overlays.markers !== undefined) {
      this.setMarkers(overlays.markers);
    }
    if (overlays.geojson !== undefined) {
      this.setGeoJSON(overlays.geojson, overlays.geojsonStyle);
    }
  }

  public setGeoJSON(data: any, style?: GeoJsonStyle) {
    this.currentGeoJsonData = data;
    this.currentGeoJsonStyle = style;

    if (!this.map || !this.L) return;

    if (!this.geoJsonGroup) {
      this.geoJsonGroup = this.L.layerGroup().addTo(this.map);
    }
    this.geoJsonGroup.clearLayers();
    this.geoJsonLayer = null;

    if (!data) return;

    try {
      this.geoJsonLayer = this.L.geoJSON(data, {
        style: (feature: any) => {
          const s = resolveGeoJsonStyle(this.currentGeoJsonStyle, feature, '#3b82f6');
          return {
            color: s.color,
            weight: s.weight,
            opacity: s.opacity,
            fillColor: s.fillColor,
            fillOpacity: s.fillOpacity,
            dashArray: s.dashArray ? s.dashArray.join(',') : undefined,
          };
        },
        onEachFeature: (feature: any, layer: any) => {
          layer.on('click', (e: any) => {
            // Drag protection: do not trigger click if user was dragging/panning the map
            if (this.isRecentlyDragged()) return;
            if (e && e.originalEvent) {
              this.L.DomEvent.stopPropagation(e);
            }
            this.onOverlayClick?.({
              type: 'geojson',
              data: feature,
            });
          });
        },
      }).addTo(this.geoJsonGroup);
    } catch (err) {
      console.error('[uni-leaflet] Error creating GeoJSON layer in H5:', err);
    }
  }

  public setClusterOptions(options: ClusterOptions) {
    this.clusterOptions = { ...this.clusterOptions, ...options };
    if (this.rawMarkers.length > 0) {
      this.renderMarkers();
    }
  }

  public setMarkers(markers: MarkerOptions[]) {
    this.rawMarkers = markers || [];
    if (!this.map || !this.L || !this.markerLayerGroup) return;
    this.renderMarkers();
  }

  private renderMarkers() {
    if (!this.markerLayerGroup || !this.L) return;
    this.markerLayerGroup.clearLayers();

    if (!this.clusterOptions.enable) {
      for (const m of this.rawMarkers) {
        this.createSingleMarker(m);
      }
      return;
    }

    const currentZoom = this.getZoom();
    const clusterResults = clusterMarkers(
      this.rawMarkers,
      currentZoom,
      this.clusterOptions
    );

    for (const item of clusterResults) {
      if (!item.isCluster) {
        this.createSingleMarker(item.marker);
      } else {
        this.createClusterMarker(item.cluster);
      }
    }
  }

  private createSingleMarker(m: MarkerOptions) {
    let icon = undefined;
    const size = m.icon?.size || [32, 32];
    const anchor = m.icon?.anchor || [size[0] / 2, size[1]];
    const tooltipAnchor: [number, number] = [
      size[0] / 2 - anchor[0],
      -anchor[1],
    ];

    if (m.icon?.type === 'avatar') {
      const avatarSize = m.icon.size || size || [32, 32];
      const avatarW = avatarSize[0];
      const avatarH = avatarSize[1];
      const borderColor = m.icon.borderColor || '#3b82f6';
      const borderWidth = m.icon.borderWidth ?? (avatarW <= 36 ? 2.5 : 3);
      const pulseColor = m.icon.pulseColor || borderColor;
      const badgeText = m.icon.badgeText;
      const isCustomBg = !!m.icon.badgeColor;
      const badgeBg = isCustomBg
        ? `background:${m.icon.badgeColor} !important; color:#ffffff !important; border:1.5px solid #ffffff !important;`
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

      const html = `
        <div class="uni-avatar-marker-wrapper" style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;cursor:pointer;user-select:none;width:${avatarW}px;height:${avatarH + arrowH}px;">
          ${hasPulse ? `<div class="uni-avatar-pulse" style="position:absolute;top:0;left:0;width:${avatarW}px !important;height:${avatarH}px !important;border-radius:50%;box-sizing:border-box;border:${borderWidth}px solid ${pulseColor};pointer-events:none;z-index:0;"></div>` : ''}
          <div class="uni-avatar-bubble" style="position:relative;width:${avatarW}px !important;height:${avatarH}px !important;flex-shrink:0;border-radius:50%;background-color:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:visible;border:${borderWidth}px solid ${borderColor};">
            <img class="uni-avatar-img" src="${imgUrl}" style="width:100% !important;height:100% !important;border-radius:50%;object-fit:cover;display:block;pointer-events:none;" />
            <div class="uni-avatar-arrow" style="position:absolute;bottom:-${arrowH}px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:${arrowW}px solid transparent;border-right:${arrowW}px solid transparent;border-top:${arrowH}px solid ${borderColor} !important;border-top-color:${borderColor} !important;z-index:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.2));"></div>
          </div>
          ${badgeText ? `<div class="uni-avatar-badge" style="position:absolute;top:${badgeOffsetTop}px;right:${badgeOffsetRight}px;font-size:${badgeFontSize}px;font-weight:700;line-height:1;height:${badgeHeight}px;min-width:${badgeHeight}px;padding:${badgePadding};border-radius:${badgeHeight / 2}px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.25);box-sizing:border-box;white-space:nowrap;z-index:10;pointer-events:none;${badgeBg}">${badgeText}</div>` : ''}
        </div>
      `;

      icon = this.L.divIcon({
        html,
        className: 'uni-avatar-marker-icon',
        iconSize: [avatarW, avatarH + arrowH],
        iconAnchor: m.icon.anchor || [avatarW / 2, avatarH + arrowH],
        tooltipAnchor: [0, -(avatarH + arrowH + 2)],
      });
    } else if (m.icon?.svg) {
      let svgStr = m.icon.svg.trim();
      if (!svgStr.includes('xmlns=')) {
        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const html = `<div style="width:${size[0]}px;height:${size[1]}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${svgStr}</div>`;
      icon = this.L.divIcon({
        html,
        className: 'uni-custom-svg-icon',
        iconSize: size,
        iconAnchor: anchor,
        tooltipAnchor,
      });
    } else if (m.icon?.html) {
      icon = this.L.divIcon({
        html: m.icon.html,
        className: 'uni-custom-html-icon',
        iconSize: size,
        iconAnchor: anchor,
        tooltipAnchor,
      });
    } else if (m.icon?.url) {
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
      const html = `<img src="${finalUrl}" style="width:${size[0]}px;height:${size[1]}px;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />`;
      icon = this.L.divIcon({
        className: 'uni-custom-img-icon',
        html,
        iconSize: size,
        iconAnchor: anchor,
        tooltipAnchor,
      });
    } else if (m.icon?.text) {
      const fontSize = Math.round(size[0] * 0.72);
      const html = `<div style="display:flex;align-items:center;justify-content:center;width:${size[0]}px;height:${size[1]}px;font-size:${fontSize}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${m.icon.text}</div>`;
      icon = this.L.divIcon({
        html,
        className: 'uni-custom-icon',
        iconSize: size,
        iconAnchor: anchor,
        tooltipAnchor,
      });
    } else {
      // Sleek default SVG Pin
      const pinColor = m.icon?.color || '#ef4444';
      const html = `
        <svg viewBox="0 0 24 32" width="${size[0]}" height="${size[1]}" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="${pinColor}"/>
          <circle cx="12" cy="11" r="4.5" fill="#ffffff"/>
        </svg>`;
      icon = this.L.divIcon({
        html,
        className: 'uni-default-pin',
        iconSize: size,
        iconAnchor: anchor,
        tooltipAnchor,
      });
    }

    const leafletMarker = this.L.marker([m.latLng[0], m.latLng[1]], {
      icon,
      title: m.title,
    }).addTo(this.markerLayerGroup);

    // Label tooltip
    if (m.label) {
      const labelText = typeof m.label === 'string' ? m.label : m.label.text;
      const customOffset =
        typeof m.label === 'object' && m.label.offset
          ? m.label.offset
          : undefined;

      let offset: [number, number] = [0, 0];
      if (customOffset) {
        const ox = customOffset[0] || 0;
        const oy = customOffset[1] || 0;
        if (Math.abs(oy) <= 10) {
          offset = [ox, oy];
        } else {
          offset = [ox, 0];
        }
      }

      leafletMarker.bindTooltip(labelText, {
        permanent: true,
        direction: 'top',
        offset,
        className: 'uni-overlay-label',
      });
    }

    leafletMarker.on('click', () => {
      this.onOverlayClick?.({ type: 'marker', data: m });
    });
  }

  private createClusterMarker(cluster: ClusterGroup) {
    const rep = cluster.representativeMarker;
    let iconContent = '';

    if (rep?.icon?.url) {
      let finalUrl = rep.icon.url;
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
      iconContent = `<img src="${finalUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
    } else if (rep?.icon?.text) {
      iconContent = `<span style="font-size:20px;line-height:1;">${rep.icon.text}</span>`;
    } else if (rep?.icon?.svg) {
      let svgStr = rep.icon.svg.trim();
      if (!svgStr.includes('xmlns=')) {
        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      iconContent = svgStr;
    } else {
      iconContent = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#3b82f6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>`;
    }

    const html = `
      <div class="uni-cluster-bubble">
        <div class="uni-cluster-icon">${iconContent}</div>
        <div class="uni-cluster-badge">+${cluster.count}</div>
      </div>
    `;

    const icon = this.L.divIcon({
      html,
      className: 'uni-cluster-marker-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const clusterMarker = this.L.marker([cluster.center[0], cluster.center[1]], {
      icon,
      zIndexOffset: 1000,
    }).addTo(this.markerLayerGroup);

    clusterMarker.on('click', (e: any) => {
      if (e && e.originalEvent) {
        e.originalEvent.stopPropagation?.();
      }
      const bounds = cluster.bounds;
      const isSameCoord =
        Math.abs(bounds[0][0] - bounds[1][0]) < 1e-6 &&
        Math.abs(bounds[0][1] - bounds[1][1]) < 1e-6;

      if (isSameCoord) {
        this.setZoom(Math.min(this.getZoom() + 2, 19));
        this.setCenter(cluster.center, true);
      } else {
        this.fitBounds(bounds, { padding: [60, 60], animate: true });
      }

      this.onClusterClick?.(cluster);
    });
  }

  public setPolylines(polylines: PolylineOptions[]) {
    if (!this.map || !this.L) return;

    if (!this.polylineGroup) {
      this.polylineGroup = this.L.layerGroup().addTo(this.map);
    }
    this.polylineGroup.clearLayers();

    if (!polylines || !Array.isArray(polylines)) return;

    for (const p of polylines) {
      if (!p.latLngs || p.latLngs.length < 2) continue;

      const finalLatLngs = p.curved
        ? generateCurvedPolyline(p.latLngs, p.curvature ?? 0.25)
        : p.latLngs;

      const isFlowing = !!p.flowing;
      const dashStr = p.dashArray
        ? p.dashArray.join(',')
        : isFlowing
          ? '12,12'
          : undefined;

      const leafletLine = this.L.polyline(finalLatLngs, {
        color: p.color || '#3b82f6',
        weight: p.width || 4,
        opacity: p.opacity ?? 1,
        dashArray: dashStr,
        className: isFlowing ? 'uni-flowing-polyline' : '',
      }).addTo(this.polylineGroup);

      if (isFlowing) {
        const pathEl = leafletLine.getElement?.() || (leafletLine as any)._path;
        if (pathEl) {
          const speed = p.flowSpeed || 1;
          const duration = Math.max(0.2, 1.2 / Math.abs(speed));
          pathEl.style.animationDuration = `${duration}s`;
          if (speed < 0) {
            pathEl.style.animationDirection = 'reverse';
          }
        }
      }

      if (p.label) {
        const labelText = typeof p.label === 'string' ? p.label : p.label.text;
        leafletLine.bindTooltip(labelText, {
          permanent: true,
          direction: 'center',
          className: 'uni-overlay-label',
        });
      }

      leafletLine.on('click', (e: any) => {
        if (this.isRecentlyDragged()) return;
        if (e && e.originalEvent) {
          this.L.DomEvent.stopPropagation(e);
        }
        this.onOverlayClick?.({ type: 'polyline', data: p });
      });
    }
  }

  public setPolygons(polygons: PolygonOptions[]) {
    if (!this.map || !this.L) return;

    if (!this.polygonGroup) {
      this.polygonGroup = this.L.layerGroup().addTo(this.map);
    }
    this.polygonGroup.clearLayers();

    if (!polygons || !Array.isArray(polygons)) return;

    for (const poly of polygons) {
      if (!poly.latLngs || poly.latLngs.length < 3) continue;

      const leafletPolygon = this.L.polygon(poly.latLngs, {
        color: poly.color || '#ef4444',
        weight: poly.width || 2,
        fillColor: poly.fillColor || poly.color || '#ef4444',
        fillOpacity: poly.fillOpacity ?? 0.25,
      }).addTo(this.polygonGroup);

      if (poly.label) {
        const labelText =
          typeof poly.label === 'string' ? poly.label : poly.label.text;
        leafletPolygon.bindTooltip(labelText, {
          permanent: true,
          direction: 'center',
          className: 'uni-overlay-label',
        });
      }

      leafletPolygon.on('click', (e: any) => {
        if (this.isRecentlyDragged()) return;
        if (e && e.originalEvent) {
          this.L.DomEvent.stopPropagation(e);
        }
        this.onOverlayClick?.({ type: 'polygon', data: poly });
      });
    }
  }

  public setCircles(circles: CircleOptions[]) {
    if (!this.map || !this.L) return;

    if (!this.circleGroup) {
      this.circleGroup = this.L.layerGroup().addTo(this.map);
    }
    this.circleGroup.clearLayers();

    if (!circles || !Array.isArray(circles)) return;

    for (const c of circles) {
      const leafletCircle = this.L.circle([c.latLng[0], c.latLng[1]], {
        radius: c.radius,
        color: c.color || '#10b981',
        weight: c.width || 2,
        fillColor: c.fillColor || c.color || '#10b981',
        fillOpacity: c.fillOpacity ?? 0.2,
      }).addTo(this.circleGroup);

      if (c.label) {
        const labelText = typeof c.label === 'string' ? c.label : c.label.text;
        leafletCircle.bindTooltip(labelText, {
          permanent: true,
          direction: 'center',
          className: 'uni-overlay-label',
        });
      }

      leafletCircle.on('click', (e: any) => {
        if (this.isRecentlyDragged()) return;
        if (e && e.originalEvent) {
          this.L.DomEvent.stopPropagation(e);
        }
        this.onOverlayClick?.({ type: 'circle', data: c });
      });
    }
  }

  public clearOverlays() {
    if (this.polygonGroup) {
      this.polygonGroup.clearLayers();
    }
    if (this.polylineGroup) {
      this.polylineGroup.clearLayers();
    }
    if (this.circleGroup) {
      this.circleGroup.clearLayers();
    }
    if (this.overlayGroup) {
      this.overlayGroup.clearLayers();
    }
    if (this.markerLayerGroup) {
      this.markerLayerGroup.clearLayers();
    }
    if (this.geoJsonGroup) {
      this.geoJsonGroup.clearLayers();
    }
    this.rawMarkers = [];
    this.geoJsonLayer = null;
    this.currentGeoJsonData = null;
  }

  public getCenter(): LatLngTuple {
    if (!this.map) return [0, 0];
    const c = this.map.getCenter();
    return [c.lat, c.lng];
  }

  public getZoom(): number {
    return this.map ? this.map.getZoom() : 0;
  }

  public getLeafletInstance(): any {
    return this.map;
  }

  public getNativeInstance(): any {
    return this.map;
  }

  public resize() {
    this.map?.invalidateSize();
  }

  public destroy() {
    if (this.map) {
      if (typeof window !== 'undefined' && (window as any).__activeMap === this.map) {
        delete (window as any).__activeMap;
      }
      this.map.remove();
      this.map = null;
      this.tileLayers = [];
      this.overlayGroup = null;
      this.polygonGroup = null;
      this.polylineGroup = null;
      this.circleGroup = null;
      this.geoJsonGroup = null;
      if (this.markerLayerGroup) {
        this.markerLayerGroup.clearLayers();
        this.markerLayerGroup = null;
      }
      this.rawMarkers = [];
      this.geoJsonLayer = null;
      this.currentGeoJsonData = null;
    }
    if (this.releaseWatchdogHandler) {
      this.releaseWatchdogHandler();
      this.releaseWatchdogHandler = undefined;
    }
  }
}
