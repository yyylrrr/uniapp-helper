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
} from '../types';

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
  onMove?: (center: LatLngTuple, zoom: number) => void;
  onMoveEnd?: (center: LatLngTuple, zoom: number) => void;
  onZoom?: (zoom: number) => void;
  onZoomEnd?: (zoom: number) => void;
  onClick?: (latLng: LatLngTuple, point: Point) => void;
  onOverlayClick?: (event: OverlayClickEvent) => void;
}

import * as LModule from 'leaflet';
import 'leaflet/dist/leaflet.css';

function getL(): any {
  if (LModule && typeof (LModule as any).map === 'function') {
    return LModule;
  }
  if (
    LModule &&
    (LModule as any).default &&
    typeof (LModule as any).default.map === 'function'
  ) {
    return (LModule as any).default;
  }
  if (
    typeof window !== 'undefined' &&
    (window as any).L &&
    typeof (window as any).L.map === 'function'
  ) {
    return (window as any).L;
  }
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as any).L &&
    typeof (globalThis as any).L.map === 'function'
  ) {
    return (globalThis as any).L;
  }
  return (LModule as any)?.default || LModule;
}

export class H5MapAdapter implements IMapEngine {
  private map: any = null;
  private tileLayers: any[] = [];
  private overlayGroup: any = null;
  private L: any = null;
  private pendingLayers?: Array<string | TileLayerConfig>;
  private pendingOverlays?: MapOverlays;

  public onMove?: (center: LatLngTuple, zoom: number) => void;
  public onMoveEnd?: (center: LatLngTuple, zoom: number) => void;
  public onZoom?: (zoom: number) => void;
  public onZoomEnd?: (zoom: number) => void;
  public onClick?: (latLng: LatLngTuple, point: Point) => void;
  public onOverlayClick?: (event: OverlayClickEvent) => void;

  public async init(options: H5AdapterOptions): Promise<void> {
    this.onMove = options.onMove;
    this.onMoveEnd = options.onMoveEnd;
    this.onZoom = options.onZoom;
    this.onZoomEnd = options.onZoomEnd;
    this.onClick = options.onClick;
    this.onOverlayClick = options.onOverlayClick;

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

    // Create a dedicated overlay pane for annotation / label layers above tilePane
    try {
      this.map.createPane('overlayTilePane');
      const overlayPane = this.map.getPane('overlayTilePane');
      if (overlayPane) {
        overlayPane.style.zIndex = '350';
        overlayPane.style.pointerEvents = 'none';
      }
    } catch (e) {}

    // Create overlay layer group for markers, lines, polygons
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
    });

    this.map.on('click', (e: any) => {
      this.onClick?.([e.latlng.lat, e.latlng.lng], {
        x: e.containerPoint.x,
        y: e.containerPoint.y,
      });
    });

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
      } catch (e) {}
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
    if (!this.map || !this.L || !this.overlayGroup) {
      this.pendingOverlays = overlays;
      return;
    }

    this.clearOverlays();

    if (overlays.polygons) {
      this.setPolygons(overlays.polygons);
    }
    if (overlays.polylines) {
      this.setPolylines(overlays.polylines);
    }
    if (overlays.circles) {
      this.setCircles(overlays.circles);
    }
    if (overlays.markers) {
      this.setMarkers(overlays.markers);
    }
  }

  public setMarkers(markers: MarkerOptions[]) {
    if (!this.map || !this.L || !this.overlayGroup) return;

    for (const m of markers) {
      let icon = undefined;
      const size = m.icon?.size || [32, 32];
      const anchor = m.icon?.anchor || [size[0] / 2, size[1]];
      const tooltipAnchor: [number, number] = [
        size[0] / 2 - anchor[0],
        -anchor[1],
      ];

      if (m.icon?.svg) {
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
        if (finalUrl && typeof finalUrl === 'string' && !finalUrl.startsWith('data:') && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
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
      }).addTo(this.overlayGroup);

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
  }

  public setPolylines(polylines: PolylineOptions[]) {
    if (!this.map || !this.L || !this.overlayGroup) return;

    for (const p of polylines) {
      const leafletLine = this.L.polyline(p.latLngs, {
        color: p.color || '#3b82f6',
        weight: p.width || 4,
        opacity: p.opacity ?? 1,
        dashArray: p.dashArray?.join(','),
      }).addTo(this.overlayGroup);

      if (p.label) {
        const labelText = typeof p.label === 'string' ? p.label : p.label.text;
        leafletLine.bindTooltip(labelText, {
          permanent: true,
          direction: 'center',
          className: 'uni-overlay-label',
        });
      }

      leafletLine.on('click', () => {
        this.onOverlayClick?.({ type: 'polyline', data: p });
      });
    }
  }

  public setPolygons(polygons: PolygonOptions[]) {
    if (!this.map || !this.L || !this.overlayGroup) return;

    for (const poly of polygons) {
      const leafletPolygon = this.L.polygon(poly.latLngs, {
        color: poly.color || '#ef4444',
        weight: poly.width || 2,
        fillColor: poly.fillColor || poly.color || '#ef4444',
        fillOpacity: poly.fillOpacity ?? 0.25,
      }).addTo(this.overlayGroup);

      if (poly.label) {
        const labelText =
          typeof poly.label === 'string' ? poly.label : poly.label.text;
        leafletPolygon.bindTooltip(labelText, {
          permanent: true,
          direction: 'center',
          className: 'uni-overlay-label',
        });
      }

      leafletPolygon.on('click', () => {
        this.onOverlayClick?.({ type: 'polygon', data: poly });
      });
    }
  }

  public setCircles(circles: CircleOptions[]) {
    if (!this.map || !this.L || !this.overlayGroup) return;

    for (const c of circles) {
      const leafletCircle = this.L.circle([c.latLng[0], c.latLng[1]], {
        radius: c.radius,
        color: c.color || '#10b981',
        weight: c.width || 2,
        fillColor: c.fillColor || c.color || '#10b981',
        fillOpacity: c.fillOpacity ?? 0.2,
      }).addTo(this.overlayGroup);

      if (c.label) {
        const labelText = typeof c.label === 'string' ? c.label : c.label.text;
        leafletCircle.bindTooltip(labelText, {
          permanent: true,
          direction: 'center',
          className: 'uni-overlay-label',
        });
      }

      leafletCircle.on('click', () => {
        this.onOverlayClick?.({ type: 'circle', data: c });
      });
    }
  }

  public clearOverlays() {
    if (this.overlayGroup) {
      this.overlayGroup.clearLayers();
    }
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
      this.map.remove();
      this.map = null;
      this.tileLayers = [];
      this.overlayGroup = null;
    }
  }
}
