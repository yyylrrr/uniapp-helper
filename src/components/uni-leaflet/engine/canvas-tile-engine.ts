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
  MarkerLabelOptions,
  FitBoundsOptions,
  LatLngBoundsExpression,
  MapBounds,
  ClusterOptions,
  ClusterGroup,
  GeoJsonStyle,
  GeoJsonStyleOptions,
} from '../types';
import { clamp, latLngToWorldPixel, worldPixelToLatLng } from '../utils/crs';
import { getVisibleTiles } from '../utils/tile';
import { getBoundsCenterAndZoom } from '../utils/bounds';
import { clusterMarkers } from '../utils/cluster';
import {
  normalizeGeoJsonFeatures,
  resolveGeoJsonStyle,
  isPointInPolygon2D,
} from '../utils/geojson';
import { TileManager } from './tile-manager';
import { generateCurvedPolyline } from '../utils/curve';

export interface CanvasEngineOptions {
  canvas: any;
  ctx: any;
  width: number;
  height: number;
  dpr?: number;
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
  tileSize?: number;
  showControls?: boolean;
  onMove?: (center: LatLngTuple, zoom: number) => void;
  onMoveEnd?: (center: LatLngTuple, zoom: number) => void;
  onZoom?: (zoom: number) => void;
  onZoomEnd?: (zoom: number) => void;
  onClick?: (latLng: LatLngTuple, point: Point) => void;
  onOverlayClick?: (event: OverlayClickEvent) => void;
  onClusterClick?: (cluster: ClusterGroup) => void;
  clusterOptions?: ClusterOptions;
}

export class CanvasTileEngine implements IMapEngine {
  private canvas: any;
  private ctx: any;
  private width: number;
  private height: number;
  private dpr: number;

  private center: LatLngTuple;
  private zoom: number;
  private minZoom: number;
  private maxZoom: number;
  private tileSize: number;

  private tileUrl: string;
  private subdomains: string[];
  private layers: TileLayerConfig[] = [];
  private overlays: MapOverlays = {};
  private geojson: any = null;
  private geojsonStyle?: GeoJsonStyle;
  private showControls: boolean;

  private clusterOptions: ClusterOptions = {
    enable: false,
    clusterRadius: 60,
    clusterMaxZoom: 17,
  };
  private currentClusters: ClusterGroup[] = [];

  private tileManager: TileManager;
  private isRendering = false;
  private animFrameId: any = null;

  // Flow animation state
  private flowAnimationOffset = 0;
  private flowAnimFrameId: any = null;
  private isFlowAnimating = false;

  // Touch tracking
  private isTouching = false;
  private touchCount = 0;
  private startTouches: Point[] = [];
  private startCenter: LatLngTuple = [0, 0];
  private startZoom = 0;
  private startPinchDist = 0;
  private pinchMidPoint: Point = { x: 0, y: 0 };
  private touchStartTime = 0;
  private hasMoved = false;

  private iconCache: Map<string, { image: any; status: 'loading' | 'loaded' | 'error' }> = new Map();

  // Double tap detection
  private lastTapTime = 0;
  private lastTapPos: Point = { x: 0, y: 0 };
  private wheelEndTimeout: any = null;

  // Callbacks
  public onMove?: (center: LatLngTuple, zoom: number) => void;
  public onMoveEnd?: (center: LatLngTuple, zoom: number) => void;
  public onZoom?: (zoom: number) => void;
  public onZoomEnd?: (zoom: number) => void;
  public onClick?: (latLng: LatLngTuple, point: Point) => void;
  public onOverlayClick?: (event: OverlayClickEvent) => void;
  public onClusterClick?: (cluster: ClusterGroup) => void;

  constructor(options: CanvasEngineOptions) {
    this.canvas = options.canvas;
    this.ctx = options.ctx;
    this.width = options.width || 300;
    this.height = options.height || 300;
    this.dpr = options.dpr || 1;

    this.center = options.center || [39.9042, 116.4074];
    this.zoom = options.zoom || 13;
    this.minZoom = options.minZoom !== undefined ? options.minZoom : 3;
    this.maxZoom = options.maxZoom !== undefined ? options.maxZoom : 18;
    this.tileSize = options.tileSize || 256;
    this.showControls =
      options.showControls !== undefined ? options.showControls : true;

    if (options.clusterOptions) {
      this.clusterOptions = { ...this.clusterOptions, ...options.clusterOptions };
    }

    this.tileUrl =
      options.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    this.subdomains = options.subdomains || ['a', 'b', 'c'];
    this.layers = this.normalizeLayers(options.layers);
    this.overlays = options.overlays || {};
    this.geojson = options.geojson || options.overlays?.geojson || null;
    this.geojsonStyle = options.geojsonStyle || options.overlays?.geojsonStyle;

    this.onMove = options.onMove;
    this.onMoveEnd = options.onMoveEnd;
    this.onZoom = options.onZoom;
    this.onZoomEnd = options.onZoomEnd;
    this.onClick = options.onClick;
    this.onOverlayClick = options.onOverlayClick;
    this.onClusterClick = options.onClusterClick;

    this.tileManager = new TileManager();
    this.tileManager.setCanvasNode(this.canvas);
    this.tileManager.setOnTileLoaded(() => {
      this.requestRender();
    });

    this.initCanvasDpr();
    this.requestRender();
    this.checkFlowAnimationState();
  }

  private normalizeLayers(
    layers?: Array<string | TileLayerConfig>
  ): TileLayerConfig[] {
    if (!layers || layers.length === 0) {
      return [
        {
          url: this.tileUrl,
          subdomains: this.subdomains,
        },
      ];
    }
    return layers.map((l) =>
      typeof l === 'string'
        ? { url: l, subdomains: this.subdomains }
        : {
            ...l,
            subdomains: l.subdomains || this.subdomains,
          }
    );
  }

  private initCanvasDpr() {
    if (this.canvas && this.dpr > 1) {
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      if (this.ctx && this.ctx.scale) {
        this.ctx.scale(this.dpr, this.dpr);
      }
    }
  }

  public resize(width?: number, height?: number) {
    if (width) this.width = width;
    if (height) this.height = height;
    this.initCanvasDpr();
    this.requestRender();
  }

  public setCenter(center: LatLngTuple, animate = true) {
    if (animate) {
      this.panTo(center);
    } else {
      this.center = [...center];
      this.requestRender();
      this.onMove?.(this.center, this.zoom);
      this.onMoveEnd?.(this.center, this.zoom);
    }
  }

  public setZoom(zoom: number) {
    const targetZoom = clamp(zoom, this.minZoom, this.maxZoom);
    if (Math.abs(this.zoom - targetZoom) < 1e-4) return;
    this.zoom = targetZoom;
    this.requestRender();
    this.onZoom?.(this.zoom);
    this.onZoomEnd?.(this.zoom);
    this.onMove?.(this.center, this.zoom);
  }

  public zoomIn() {
    this.setZoom(Math.floor(this.zoom + 1));
  }

  public zoomOut() {
    this.setZoom(Math.ceil(this.zoom - 1));
  }

  public panTo(targetCenter: LatLngTuple, duration = 300) {
    const startCenter = [...this.center] as LatLngTuple;
    const startTime = Date.now();

    if (this.animFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animFrameId);
      } else {
        clearTimeout(this.animFrameId);
      }
      this.animFrameId = null;
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const lat = startCenter[0] + (targetCenter[0] - startCenter[0]) * ease;
      const lng = startCenter[1] + (targetCenter[1] - startCenter[1]) * ease;

      this.center = [lat, lng];
      this.requestRender();
      this.onMove?.(this.center, this.zoom);

      if (progress < 1) {
        if (typeof requestAnimationFrame !== 'undefined') {
          this.animFrameId = requestAnimationFrame(animate);
        } else {
          this.animFrameId = setTimeout(animate, 16);
        }
      } else {
        this.animFrameId = null;
        this.onMoveEnd?.(this.center, this.zoom);
      }
    };

    animate();
  }

  public fitBounds(
    bounds: LatLngBoundsExpression | LatLngTuple[] | MapBounds,
    options?: FitBoundsOptions
  ) {
    const result = getBoundsCenterAndZoom(bounds, this.width, this.height, {
      padding: options?.padding,
      minZoom: this.minZoom,
      maxZoom: options?.maxZoom ?? this.maxZoom,
      tileSize: this.tileSize,
    });

    if (!result) return;

    const { center: targetCenter, zoom: targetZoom } = result;
    const animate = options?.animate !== false;
    const duration = options?.duration ?? 300;

    if (this.animFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animFrameId);
      } else {
        clearTimeout(this.animFrameId);
      }
      this.animFrameId = null;
    }

    if (!animate || duration <= 0) {
      this.center = [...targetCenter];
      this.zoom = targetZoom;
      this.requestRender();
      this.onMove?.(this.center, this.zoom);
      this.onZoom?.(this.zoom);
      this.onMoveEnd?.(this.center, this.zoom);
      this.onZoomEnd?.(this.zoom);
      return;
    }

    const startCenter = [...this.center] as LatLngTuple;
    const startZoom = this.zoom;
    const startTime = Date.now();

    const doAnimate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const lat = startCenter[0] + (targetCenter[0] - startCenter[0]) * ease;
      const lng = startCenter[1] + (targetCenter[1] - startCenter[1]) * ease;
      const currentZoom = startZoom + (targetZoom - startZoom) * ease;

      this.center = [lat, lng];
      this.zoom = currentZoom;
      this.requestRender();
      this.onMove?.(this.center, this.zoom);
      this.onZoom?.(this.zoom);

      if (progress < 1) {
        if (typeof requestAnimationFrame !== 'undefined') {
          this.animFrameId = requestAnimationFrame(doAnimate);
        } else {
          this.animFrameId = setTimeout(doAnimate, 16);
        }
      } else {
        this.animFrameId = null;
        this.center = [...targetCenter];
        this.zoom = targetZoom;
        this.requestRender();
        this.onMoveEnd?.(this.center, this.zoom);
        this.onZoomEnd?.(this.zoom);
      }
    };

    doAnimate();
  }

  public setTileUrl(url: string, subdomains?: string[]) {
    this.tileUrl = url;
    if (subdomains) this.subdomains = subdomains;
    this.setLayers([{ url, subdomains: subdomains || this.subdomains }]);
  }

  public setLayers(layers: Array<string | TileLayerConfig>) {
    this.layers = this.normalizeLayers(layers);
    this.requestRender();
  }

  public setShowControls(show: boolean) {
    this.showControls = show;
    this.requestRender();
  }

  // --- Vector Overlays Management ---

  public setOverlays(overlays: MapOverlays) {
    this.overlays = { ...overlays };
    if (overlays.geojson !== undefined) {
      this.geojson = overlays.geojson;
    }
    if (overlays.geojsonStyle !== undefined) {
      this.geojsonStyle = overlays.geojsonStyle;
    }
    this.requestRender();
    this.checkFlowAnimationState();
  }

  public setGeoJSON(data: any, style?: GeoJsonStyle) {
    this.geojson = data;
    if (style !== undefined) {
      this.geojsonStyle = style;
    }
    this.requestRender();
  }

  public setMarkers(markers: MarkerOptions[]) {
    this.overlays.markers = markers;
    this.requestRender();
    this.checkFlowAnimationState();
  }

  public setPolylines(polylines: PolylineOptions[]) {
    this.overlays.polylines = polylines;
    this.requestRender();
    this.checkFlowAnimationState();
  }

  public setPolygons(polygons: PolygonOptions[]) {
    this.overlays.polygons = polygons;
    this.requestRender();
  }

  public setCircles(circles: CircleOptions[]) {
    this.overlays.circles = circles;
    this.requestRender();
  }

  public clearOverlays() {
    this.overlays = {};
    this.currentClusters = [];
    this.geojson = null;
    this.stopFlowAnimation();
    this.requestRender();
  }

  public setClusterOptions(options: ClusterOptions) {
    this.clusterOptions = { ...this.clusterOptions, ...options };
    this.requestRender();
  }

  public getCenter(): LatLngTuple {
    return [...this.center];
  }

  public getZoom(): number {
    return this.zoom;
  }

  public requestRender() {
    if (this.isRendering) return;
    this.isRendering = true;

    const doRender = () => {
      this.isRendering = false;
      this.render();
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(doRender);
    } else {
      setTimeout(doRender, 16);
    }
  }

  /**
   * Main rendering routine: Tiles -> Polygons -> Circles -> Polylines -> Markers -> Labels
   */
  public render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f2efe9';
    ctx.fillRect(0, 0, w, h);

    // 2. Render Tile Layers
    for (const layer of this.layers) {
      if (!layer.url) continue;

      const subdomains = layer.subdomains || this.subdomains || ['a', 'b', 'c'];
      const opacity = layer.opacity !== undefined ? layer.opacity : 1;

      ctx.save();
      if (opacity < 1) {
        ctx.globalAlpha = opacity;
      }

      const { tiles } = getVisibleTiles(
        this.center[0],
        this.center[1],
        this.zoom,
        w,
        h,
        layer.url,
        subdomains,
        this.tileSize
      );

      for (const tile of tiles) {
        const record = this.tileManager.requestTile(tile.key, tile.url);

        if (record && record.status === 'loaded' && record.image) {
          try {
            ctx.drawImage(
              record.image,
              tile.screenX,
              tile.screenY,
              tile.screenSize,
              tile.screenSize
            );
          } catch (e) {}
        } else {
          const fallback = this.tileManager.getParentFallback(
            tile.z,
            tile.x,
            tile.y,
            layer.url,
            subdomains,
            Math.max(0, tile.z - 3),
            this.tileSize
          );

          if (fallback) {
            try {
              ctx.drawImage(
                fallback.image,
                fallback.srcX,
                fallback.srcY,
                fallback.srcSize,
                fallback.srcSize,
                tile.screenX,
                tile.screenY,
                tile.screenSize,
                tile.screenSize
              );
            } catch (e) {}
          }
        }
      }

      ctx.restore();
    }

    // 3. Render Vector Overlays
    this.renderOverlays(ctx);

    // 4. Flush drawing buffer for App-Plus / older canvas context (uni.createCanvasContext)
    if (typeof ctx.draw === 'function') {
      ctx.draw(false);
    }
  }

  /**
   * Render vector overlays (Polygons, Circles, Polylines, Markers, Labels, GeoJSON)
   */
  private renderOverlays(ctx: any) {
    // 0. Render GeoJSON Vector Layer
    if (this.geojson) {
      this.drawGeoJSON(ctx, this.geojson, this.geojsonStyle);
    }

    // A. Render Polygons
    if (this.overlays.polygons && Array.isArray(this.overlays.polygons)) {
      for (const poly of this.overlays.polygons) {
        if (!poly.latLngs || poly.latLngs.length < 3) continue;

        try {
          ctx.save();
          ctx.beginPath();
          const points = poly.latLngs.map((pt) =>
            this.latLngToScreenPoint(pt[0], pt[1])
          );

          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.closePath();

          ctx.fillStyle = poly.fillColor || 'rgba(239, 68, 68, 0.25)';
          ctx.globalAlpha = poly.fillOpacity ?? 0.25;
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.strokeStyle = poly.color || '#ef4444';
          ctx.lineWidth = poly.width || 2;
          ctx.stroke();
          ctx.restore();

          // Polygon Label at centroid
          if (poly.label) {
            const avgX =
              points.reduce((sum, p) => sum + p.x, 0) / points.length;
            const avgY =
              points.reduce((sum, p) => sum + p.y, 0) / points.length;
            const labelText =
              typeof poly.label === 'string' ? poly.label : poly.label.text;
            const labelStyle =
              typeof poly.label === 'object' ? poly.label : undefined;
            this.drawLabelBadge(ctx, labelText, avgX, avgY, labelStyle);
          }
        } catch (err) {
          console.error('Error drawing polygon:', err);
        }
      }
    }

    // B. Render Circles
    if (this.overlays.circles && Array.isArray(this.overlays.circles)) {
      for (const c of this.overlays.circles) {
        try {
          const centerPt = this.latLngToScreenPoint(c.latLng[0], c.latLng[1]);
          const radiusPx = this.metersToPixels(c.radius, c.latLng[0]);

          ctx.save();
          ctx.beginPath();
          ctx.arc(centerPt.x, centerPt.y, radiusPx, 0, Math.PI * 2);

          ctx.fillStyle = c.fillColor || c.color || '#10b981';
          ctx.globalAlpha = c.fillOpacity ?? 0.2;
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.strokeStyle = c.color || '#10b981';
          ctx.lineWidth = c.width || 2;
          ctx.stroke();
          ctx.restore();

          if (c.label) {
            const labelText =
              typeof c.label === 'string' ? c.label : c.label.text;
            const labelStyle =
              typeof c.label === 'object' ? c.label : undefined;
            this.drawLabelBadge(
              ctx,
              labelText,
              centerPt.x,
              centerPt.y,
              labelStyle
            );
          }
        } catch (err) {
          console.error('Error drawing circle:', err);
        }
      }
    }

    // C. Render Polylines
    if (this.overlays.polylines && Array.isArray(this.overlays.polylines)) {
      for (const line of this.overlays.polylines) {
        if (!line.latLngs || line.latLngs.length < 2) continue;

        try {
          ctx.save();
          ctx.beginPath();
          const effectiveLatLngs = line.curved
            ? generateCurvedPolyline(line.latLngs, line.curvature ?? 0.2)
            : line.latLngs;

          const points = effectiveLatLngs.map((pt) =>
            this.latLngToScreenPoint(pt[0], pt[1])
          );

          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }

          ctx.strokeStyle = line.color || '#3b82f6';
          ctx.lineWidth = line.width || 4;
          ctx.globalAlpha = line.opacity ?? 1;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (line.flowing) {
            const dash =
              line.dashArray && line.dashArray.length > 0
                ? line.dashArray
                : [10, 10];
            if (ctx.setLineDash) {
              try {
                ctx.setLineDash(dash);
              } catch (e) {}
            }
            const speed = line.flowSpeed ?? 1;
            const offset = (this.flowAnimationOffset * speed) % 40;
            if ('lineDashOffset' in ctx) {
              ctx.lineDashOffset = -offset;
            }
          } else if (line.dashArray && ctx.setLineDash) {
            try {
              ctx.setLineDash(line.dashArray);
              if (line.dashOffset !== undefined && 'lineDashOffset' in ctx) {
                ctx.lineDashOffset = line.dashOffset;
              }
            } catch (e) {}
          }

          ctx.stroke();

          if (ctx.setLineDash) {
            try {
              ctx.setLineDash([]);
              if ('lineDashOffset' in ctx) {
                ctx.lineDashOffset = 0;
              }
            } catch (e) {}
          }
          ctx.restore();

          // Line Label at mid point
          if (line.label) {
            const midIdx = Math.floor(points.length / 2);
            const midPt = points[midIdx];
            const labelText =
              typeof line.label === 'string' ? line.label : line.label.text;
            const labelStyle =
              typeof line.label === 'object' ? line.label : undefined;
            this.drawLabelBadge(ctx, labelText, midPt.x, midPt.y, labelStyle);
          }
        } catch (err) {
          console.error('Error drawing polyline:', err);
        }
      }
    }

    // D. Render Markers & Pins
    if (this.overlays.markers && Array.isArray(this.overlays.markers)) {
      this.currentClusters = [];
      if (!this.clusterOptions.enable) {
        for (const m of this.overlays.markers) {
          this.drawSingleMarker(ctx, m);
        }
      } else {
        const results = clusterMarkers(
          this.overlays.markers,
          this.zoom,
          this.clusterOptions
        );
        for (const item of results) {
          if (!item.isCluster) {
            this.drawSingleMarker(ctx, item.marker);
          } else {
            this.currentClusters.push(item.cluster);
            this.drawClusterMarker(ctx, item.cluster);
          }
        }
      }
    }

    // E. Render Zoom Controls if enabled (Drawn directly in Canvas 2D frame buffer)
    if (this.showControls) {
      this.drawZoomControls(ctx);
    }
  }

  private drawGeoJSON(ctx: any, geojson: any, style?: GeoJsonStyle) {
    if (!geojson) return;
    const features = normalizeGeoJsonFeatures(geojson);

    for (const feat of features) {
      if (!feat.geometry) continue;
      const s = resolveGeoJsonStyle(style, feat, '#3b82f6');
      const gType = feat.geometry.type;
      const coords = feat.geometry.coordinates;

      if (gType === 'Polygon' || gType === 'MultiPolygon') {
        const polys = gType === 'Polygon' ? [coords] : coords;
        for (const poly of polys) {
          if (!poly || poly.length === 0) continue;
          ctx.save();
          ctx.beginPath();
          const extRing = poly[0];
          if (!extRing || extRing.length === 0) continue;
          const firstPt = this.latLngToScreenPoint(extRing[0][1], extRing[0][0]);
          ctx.moveTo(firstPt.x, firstPt.y);
          for (let i = 1; i < extRing.length; i++) {
            const pt = this.latLngToScreenPoint(extRing[i][1], extRing[i][0]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();

          ctx.fillStyle = s.fillColor;
          ctx.globalAlpha = s.fillOpacity ?? 0.25;
          ctx.fill();

          ctx.globalAlpha = s.opacity ?? 1;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.weight ?? 2;
          if (s.dashArray && typeof ctx.setLineDash === 'function') {
            ctx.setLineDash(s.dashArray);
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (gType === 'LineString' || gType === 'MultiLineString') {
        const lines = gType === 'LineString' ? [coords] : coords;
        for (const line of lines) {
          if (!line || line.length < 2) continue;
          ctx.save();
          ctx.beginPath();
          const firstPt = this.latLngToScreenPoint(line[0][1], line[0][0]);
          ctx.moveTo(firstPt.x, firstPt.y);
          for (let i = 1; i < line.length; i++) {
            const pt = this.latLngToScreenPoint(line[i][1], line[i][0]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.weight ?? 2;
          ctx.globalAlpha = s.opacity ?? 1;
          if (s.dashArray && typeof ctx.setLineDash === 'function') {
            ctx.setLineDash(s.dashArray);
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (gType === 'Point') {
        const pt = this.latLngToScreenPoint(coords[1], coords[0]);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = s.fillColor;
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.weight ?? 2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawSingleMarker(ctx: any, m: MarkerOptions) {
    if (!m || !m.latLng) return;
    try {
      const pt = this.latLngToScreenPoint(m.latLng[0], m.latLng[1]);
      const size = m.icon?.size || [32, 32];
      const anchor = m.icon?.anchor || [size[0] / 2, size[1]];

      ctx.save();

      if (m.icon?.type === 'avatar') {
        const avatarSize = m.icon.size || size || [32, 32];
        const avatarW = avatarSize[0];
        const avatarH = avatarSize[1];
        const arrowW = avatarW <= 36 ? 4 : 5;
        const arrowH = avatarW <= 36 ? 5 : 6;
        const anchor = m.icon.anchor || [avatarW / 2, avatarH + arrowH];
        const borderColor = m.icon.borderColor || '#3b82f6';
        const borderWidth = m.icon.borderWidth ?? (avatarW <= 36 ? 2.5 : 3);
        const pulseColor = m.icon.pulseColor || borderColor;
        const radius = Math.min(avatarW, avatarH) / 2;
        const centerX = pt.x - anchor[0] + avatarW / 2;
        const centerY = pt.y - anchor[1] + avatarH / 2;

        // 1. Draw pulse ripple halo if pulse enabled
        if (m.icon.pulse) {
          const pulsePhase = (Date.now() % 1800) / 1800;
          const pulseRadius = radius + pulsePhase * (radius * 0.6);
          const pulseAlpha = (1 - pulsePhase) * 0.8;

          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = pulseColor;
          ctx.lineWidth = borderWidth;
          ctx.globalAlpha = pulseAlpha;
          ctx.stroke();
          ctx.restore();
        }

        // 2. Draw white background circle & drop shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        // 3. Draw bottom pointer arrow
        ctx.save();
        ctx.beginPath();
        const arrowTopY = centerY + radius - 1;
        const arrowBottomY = centerY + radius + arrowH;
        ctx.moveTo(centerX - arrowW, arrowTopY);
        ctx.lineTo(centerX + arrowW, arrowTopY);
        ctx.lineTo(centerX, arrowBottomY);
        ctx.closePath();
        ctx.fillStyle = borderColor;
        ctx.fill();
        ctx.restore();

        // 4. Draw avatar image with circular clipping
        if (m.icon.url) {
          const img = this.getOrLoadIcon(m.icon.url);
          if (img) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(
              centerX,
              centerY,
              Math.max(1, radius - borderWidth / 2),
              0,
              Math.PI * 2
            );
            ctx.clip();
            ctx.drawImage(
              img,
              centerX - radius,
              centerY - radius,
              radius * 2,
              radius * 2
            );
            ctx.restore();
          }
        }

        // 5. Draw border circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
        ctx.restore();

        // 6. Draw badge on top right
        if (m.icon.badgeText) {
          const isSmall = avatarW <= 36;
          const badgeRadius = isSmall ? 6 : Math.max(7, Math.round(radius * 0.35));
          const badgeFontSize = isSmall ? 8 : Math.max(9, Math.round(badgeRadius * 1.1));
          const badgeX = centerX + radius * 0.72;
          const badgeY = centerY - radius * 0.72;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetY = 1;

          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fillStyle = m.icon.badgeColor || '#ffffff';
          ctx.fill();

          ctx.strokeStyle = m.icon.badgeColor ? '#ffffff' : 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.fillStyle = m.icon.badgeColor ? '#ffffff' : '#1e293b';
          ctx.font =
            `bold ${badgeFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(m.icon.badgeText, badgeX, badgeY);
          ctx.restore();
        }
      } else if (m.icon?.svg) {
        let svgStr = m.icon.svg.trim();
        if (!svgStr.includes('xmlns=')) {
          svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
        const img = this.getOrLoadIcon(svgDataUri);
        if (img) {
          ctx.drawImage(img, pt.x - anchor[0], pt.y - anchor[1], size[0], size[1]);
        } else {
          this.drawPinFallback(ctx, pt, m.icon?.color || '#ef4444', size, anchor);
        }
      } else if (m.icon?.url) {
        const img = this.getOrLoadIcon(m.icon.url);
        if (img) {
          ctx.drawImage(img, pt.x - anchor[0], pt.y - anchor[1], size[0], size[1]);
        } else {
          this.drawPinFallback(ctx, pt, m.icon?.color || '#3b82f6', size, anchor);
        }
      } else if (m.icon?.text) {
        const fontSize = Math.round(size[0] * 0.72);
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.icon.text, pt.x - anchor[0] + size[0] / 2, pt.y - anchor[1] + size[1] / 2);
      } else {
        this.drawPinFallback(ctx, pt, m.icon?.color || '#ef4444', size, anchor);
      }

      ctx.restore();

      if (m.label) {
        const labelText =
          typeof m.label === 'string' ? m.label : m.label.text;
        const labelStyle =
          typeof m.label === 'object' ? m.label : undefined;

        const iconTopY = pt.y - anchor[1];
        const iconCenterX = pt.x - anchor[0] + size[0] / 2;

        let tipX = iconCenterX;
        let tipY = iconTopY - 1;

        if (labelStyle?.offset) {
          const offX = labelStyle.offset[0] || 0;
          const offY = labelStyle.offset[1] || 0;
          tipX += offX;
          if (Math.abs(offY) <= 10) {
            tipY += offY;
          }
        }

        this.drawLabelBadge(
          ctx,
          labelText,
          tipX,
          tipY,
          labelStyle,
          true
        );
      }
    } catch (err) {
      console.error('Error drawing marker:', err);
    }
  }

  private drawClusterMarker(ctx: any, cluster: ClusterGroup) {
    const pt = this.latLngToScreenPoint(cluster.center[0], cluster.center[1]);
    const radius = 22;
    ctx.save();

    // 1. Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    // 2. White Circle Background
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 3. Blue Ring Border (3px)
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();

    // 4. Center Icon or Rep Marker
    const rep = cluster.representativeMarker;
    if (rep?.icon?.text) {
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rep.icon.text, pt.x, pt.y + 1);
    } else if (rep?.icon?.url) {
      const img = this.getOrLoadIcon(rep.icon.url);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, pt.x - 14, pt.y - 14, 28, 28);
        ctx.restore();
      } else {
        this.drawDefaultClusterIcon(ctx, pt.x, pt.y);
      }
    } else {
      this.drawDefaultClusterIcon(ctx, pt.x, pt.y);
    }

    // 5. Top-Right Red Badge with +count
    const badgeText = `+${cluster.count}`;
    const badgeHeight = 18;
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    let textWidth = 14;
    try {
      if (ctx.measureText) {
        const m = ctx.measureText(badgeText);
        if (m && m.width > 0) textWidth = m.width;
      }
    } catch (e) {}
    const badgeWidth = Math.max(18, textWidth + 10);
    const badgeCenterX = pt.x + 14;
    const badgeCenterY = pt.y - 14;
    const badgeX = badgeCenterX - badgeWidth / 2;
    const badgeY = badgeCenterY - badgeHeight / 2;
    const r = badgeHeight / 2;

    // Badge shadow
    ctx.shadowColor = 'rgba(220, 38, 38, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Badge pill
    ctx.beginPath();
    ctx.moveTo(badgeX + r, badgeY);
    ctx.lineTo(badgeX + badgeWidth - r, badgeY);
    ctx.arcTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + r, r);
    ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - r);
    ctx.arcTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - r, badgeY + badgeHeight, r);
    ctx.lineTo(badgeX + r, badgeY + badgeHeight);
    ctx.arcTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - r, r);
    ctx.lineTo(badgeX, badgeY + r);
    ctx.arcTo(badgeX, badgeY, badgeX + r, badgeY, r);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Badge white border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeCenterX, badgeCenterY + 1);

    ctx.restore();
  }

  private drawDefaultClusterIcon(ctx: any, cx: number, cy: number) {
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.closePath();
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
  }

  /**
   * Draw floating zoom controls (+ / -) directly onto Canvas 2D frame buffer
   */
  private drawZoomControls(ctx: any) {
    const btnW = 38;
    const btnH = 38;
    const pad = 12;
    const x = this.width - btnW - pad;
    const y = pad;
    const radius = 8;

    try {
      ctx.save();
      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;

      // Card Background (Universally safe arcTo path)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + btnW - radius, y);
      ctx.arcTo(x + btnW, y, x + btnW, y + radius, radius);
      ctx.lineTo(x + btnW, y + btnH * 2 - radius);
      ctx.arcTo(x + btnW, y + btnH * 2, x + btnW - radius, y + btnH * 2, radius);
      ctx.lineTo(x + radius, y + btnH * 2);
      ctx.arcTo(x, y + btnH * 2, x, y + btnH * 2 - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
      ctx.fill();

      // Reset shadow for border & divider
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Divider line
      ctx.beginPath();
      ctx.moveTo(x, y + btnH);
      ctx.lineTo(x + btnW, y + btnH);
      ctx.stroke();

      // Text '+'
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + btnW / 2, y + btnH / 2);

      // Text '−'
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('−', x + btnW / 2, y + btnH + btnH / 2);

      ctx.restore();
    } catch (err) {
      console.error('Error drawing zoom controls on canvas:', err);
    }
  }

  /**
   * Draw rounded pill badge or speech bubble with bottom arrow for label text safely on WeChat Canvas 2D
   */
  private drawLabelBadge(
    ctx: any,
    text: string,
    x: number,
    y: number,
    style?: MarkerLabelOptions,
    withArrow: boolean = false
  ) {
    if (!text || typeof text !== 'string') return;
    try {
      const fontSize = style?.fontSize || 12;
      const color = style?.color || '#1e293b';
      const bg = style?.backgroundColor || 'rgba(255, 255, 255, 0.95)';
      const border = style?.borderColor || '#cbd5e1';
      const radius = style?.borderRadius ?? 6;
      const paddingX = style?.padding ? style.padding[1] : 8;
      const paddingY = style?.padding ? style.padding[0] : 4;

      ctx.save();
      // Drop shadow for floating card feel
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.font = `bold ${Math.round(fontSize)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

      let textWidth = text.length * fontSize * 0.65;
      try {
        if (ctx.measureText) {
          const m = ctx.measureText(text);
          if (m && m.width > 0) {
            textWidth = m.width;
          }
        }
      } catch (e) {}

      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = fontSize + paddingY * 2 + 2;

      ctx.beginPath();

      if (withArrow) {
        // Speech bubble with compact bottom arrow pointing at (x, y)
        const arrowH = 4;
        const arrowHalfW = 4;
        const boxBottom = y - arrowH;
        const boxTop = boxBottom - boxHeight;
        const boxLeft = x - boxWidth / 2;
        const boxRight = x + boxWidth / 2;
        const r = Math.min(radius, boxWidth / 4, boxHeight / 2);

        ctx.moveTo(boxLeft + r, boxTop);
        ctx.lineTo(boxRight - r, boxTop);
        ctx.arcTo(boxRight, boxTop, boxRight, boxTop + r, r);
        ctx.lineTo(boxRight, boxBottom - r);
        ctx.arcTo(boxRight, boxBottom, boxRight - r, boxBottom, r);
        // Bottom arrow pointer
        ctx.lineTo(x + arrowHalfW, boxBottom);
        ctx.lineTo(x, y); // Arrow tip pointing at top of icon
        ctx.lineTo(x - arrowHalfW, boxBottom);
        ctx.lineTo(boxLeft + r, boxBottom);
        ctx.arcTo(boxLeft, boxBottom, boxLeft, boxBottom - r, r);
        ctx.lineTo(boxLeft, boxTop + r);
        ctx.arcTo(boxLeft, boxTop, boxLeft + r, boxTop, r);
        ctx.closePath();

        // Background fill
        ctx.fillStyle = bg;
        ctx.fill();

        // Stroke border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text Content
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, boxTop + boxHeight / 2 + 1);
      } else {
        // Simple centered pill badge
        const boxX = x - boxWidth / 2;
        const boxY = y - boxHeight / 2;
        const r = Math.min(radius, boxWidth / 2, boxHeight / 2);

        ctx.moveTo(boxX + r, boxY);
        ctx.lineTo(boxX + boxWidth - r, boxY);
        ctx.arcTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r, r);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r);
        ctx.arcTo(
          boxX + boxWidth,
          boxY + boxHeight,
          boxX + boxWidth - r,
          boxY + boxHeight,
          r
        );
        ctx.lineTo(boxX + r, boxY + boxHeight);
        ctx.arcTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - r, r);
        ctx.lineTo(boxX, boxY + r);
        ctx.arcTo(boxX, boxY, boxX + r, boxY, r);
        ctx.closePath();

        ctx.fillStyle = bg;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 1);
      }

      ctx.restore();
    } catch (err) {
      try {
        ctx.restore();
      } catch (e) {}
    }
  }

  /**
   * Convert LatLng coordinate to screen point (X, Y)
   */
  public latLngToScreenPoint(lat: number, lng: number): Point {
    const centerWorld = latLngToWorldPixel(
      this.center[0],
      this.center[1],
      this.zoom,
      this.tileSize
    );
    const pointWorld = latLngToWorldPixel(lat, lng, this.zoom, this.tileSize);

    return {
      x: this.width / 2 + (pointWorld.x - centerWorld.x),
      y: this.height / 2 + (pointWorld.y - centerWorld.y),
    };
  }

  /**
   * Convert geographic distance in meters to screen pixels at given latitude
   */
  public metersToPixels(meters: number, lat: number): number {
    const metersPerPixel =
      (40075016.686 * Math.cos((lat * Math.PI) / 180)) /
      (Math.pow(2, this.zoom) * this.tileSize);
    return meters / metersPerPixel;
  }

  /**
   * Screen point (X, Y) to LatLng coordinate
   */
  public screenPointToLatLng(screenX: number, screenY: number): LatLngTuple {
    const centerWorld = latLngToWorldPixel(
      this.center[0],
      this.center[1],
      this.zoom,
      this.tileSize
    );
    const worldX = centerWorld.x + (screenX - this.width / 2);
    const worldY = centerWorld.y + (screenY - this.height / 2);

    const latLng = worldPixelToLatLng(worldX, worldY, this.zoom, this.tileSize);
    return [latLng.lat, latLng.lng];
  }

  // --- Touch & Mouse Event Handlers ---

  public handleTouchStart(e: any) {
    const touches = e.touches || e.changedTouches || [];
    this.touchCount = touches.length;
    this.isTouching = true;
    this.hasMoved = false;
    this.touchStartTime = Date.now();

    this.startTouches = [];
    for (let i = 0; i < touches.length; i++) {
      this.startTouches.push({
        x: touches[i].x ?? touches[i].clientX,
        y: touches[i].y ?? touches[i].clientY,
      });
    }

    this.startCenter = [...this.center];
    this.startZoom = this.zoom;

    if (touches.length >= 2) {
      const t1 = this.startTouches[0];
      const t2 = this.startTouches[1];
      this.startPinchDist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      this.pinchMidPoint = {
        x: (t1.x + t2.x) / 2,
        y: (t1.y + t2.y) / 2,
      };
    }
  }

  public handleTouchMove(e: any) {
    if (!this.isTouching) return;
    const touches = e.touches || e.changedTouches || [];

    if (touches.length === 1 && this.touchCount === 1) {
      const curX = touches[0].x ?? touches[0].clientX;
      const curY = touches[0].y ?? touches[0].clientY;
      const dx = curX - this.startTouches[0].x;
      const dy = curY - this.startTouches[0].y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMoved = true;
      }

      const startWorld = latLngToWorldPixel(
        this.startCenter[0],
        this.startCenter[1],
        this.startZoom,
        this.tileSize
      );

      const curWorldX = startWorld.x - dx;
      const curWorldY = startWorld.y - dy;

      const newLatLng = worldPixelToLatLng(
        curWorldX,
        curWorldY,
        this.startZoom,
        this.tileSize
      );

      this.center = [newLatLng.lat, newLatLng.lng];
      this.requestRender();
      this.onMove?.(this.center, this.zoom);
    } else if (touches.length >= 2) {
      this.hasMoved = true;
      const t1 = {
        x: touches[0].x ?? touches[0].clientX,
        y: touches[0].y ?? touches[0].clientY,
      };
      const t2 = {
        x: touches[1].x ?? touches[1].clientX,
        y: touches[1].y ?? touches[1].clientY,
      };

      const curDist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      if (this.startPinchDist > 0 && curDist > 0) {
        const scale = curDist / this.startPinchDist;
        const newZoom = clamp(
          this.startZoom + Math.log2(scale),
          this.minZoom,
          this.maxZoom
        );

        this.zoom = newZoom;
        this.requestRender();
        this.onZoom?.(this.zoom);
        this.onMove?.(this.center, this.zoom);
      }
    }
  }

  public handleTouchEnd(e: any) {
    if (!this.isTouching) return;
    this.isTouching = false;

    const touchDuration = Date.now() - this.touchStartTime;

    // Check tap / click
    if (!this.hasMoved && touchDuration < 400 && this.startTouches.length === 1) {
      const tapPos = this.startTouches[0];

      // Check hit on Canvas-drawn Zoom Controls
      if (this.showControls) {
        const btnW = 38;
        const btnH = 38;
        const pad = 12;
        const x = this.width - btnW - pad;
        const y = pad;

        if (tapPos.x >= x - 6 && tapPos.x <= x + btnW + 6) {
          if (tapPos.y >= y - 6 && tapPos.y <= y + btnH) {
            this.zoomIn();
            return;
          } else if (tapPos.y > y + btnH && tapPos.y <= y + btnH * 2 + 6) {
            this.zoomOut();
            return;
          }
        }
      }

      const now = Date.now();

      // Check double tap
      if (
        now - this.lastTapTime < 300 &&
        Math.hypot(tapPos.x - this.lastTapPos.x, tapPos.y - this.lastTapPos.y) <
          30
      ) {
        const tapLatLng = this.screenPointToLatLng(tapPos.x, tapPos.y);
        this.center = tapLatLng;
        this.setZoom(Math.min(Math.floor(this.zoom + 1), this.maxZoom));
        this.lastTapTime = 0;
        return;
      }

      this.lastTapTime = now;
      this.lastTapPos = tapPos;

      // Hit testing for overlays
      let hitOverlay = false;

      // 1. Check cluster bubble hit
      if (this.clusterOptions.enable && this.currentClusters.length > 0) {
        for (const cluster of this.currentClusters) {
          const pt = this.latLngToScreenPoint(cluster.center[0], cluster.center[1]);
          const dist = Math.hypot(pt.x - tapPos.x, pt.y - tapPos.y);
          if (dist <= 26) {
            hitOverlay = true;
            const bounds = cluster.bounds;
            const isSameCoord =
              Math.abs(bounds[0][0] - bounds[1][0]) < 1e-6 &&
              Math.abs(bounds[0][1] - bounds[1][1]) < 1e-6;
            if (isSameCoord) {
              this.center = cluster.center;
              this.setZoom(Math.min(this.zoom + 2, this.maxZoom));
            } else {
              this.fitBounds(bounds, { padding: [60, 60] });
            }
            this.onClusterClick?.(cluster);
            break;
          }
        }
      }

      // 2. Check markers hit
      if (!hitOverlay && this.overlays.markers) {
        for (const m of this.overlays.markers) {
          const pt = this.latLngToScreenPoint(m.latLng[0], m.latLng[1]);
          const isAvatar = m.icon?.type === 'avatar';
          const size = m.icon?.size || [32, 32];
          const arrowH = isAvatar ? (size[0] <= 36 ? 5 : 6) : 0;
          const anchor =
            m.icon?.anchor || (isAvatar ? [size[0] / 2, size[1] + arrowH] : [size[0] / 2, size[1]]);
          const centerX = pt.x - anchor[0] + size[0] / 2;
          const centerY = pt.y - anchor[1] + size[1] / 2;
          const hitRadius = Math.max(20, Math.max(size[0], size[1]) / 2 + 4);
          if (Math.hypot(centerX - tapPos.x, centerY - tapPos.y) <= hitRadius) {
            this.onOverlayClick?.({ type: 'marker', data: m });
            hitOverlay = true;
            break;
          }
        }
      }

      // 3. Check GeoJSON polygon features hit
      if (!hitOverlay && this.geojson) {
        const features = normalizeGeoJsonFeatures(this.geojson);
        for (const feat of features) {
          if (
            feat.geometry &&
            (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')
          ) {
            const polys =
              feat.geometry.type === 'Polygon'
                ? [feat.geometry.coordinates]
                : feat.geometry.coordinates;
            let matched = false;
            for (const poly of polys) {
              if (!poly || !poly[0]) continue;
              const ring: [number, number][] = poly[0].map((coord: any) => {
                const pt = this.latLngToScreenPoint(coord[1], coord[0]);
                return [pt.x, pt.y] as [number, number];
              });
              if (isPointInPolygon2D([tapPos.x, tapPos.y], ring)) {
                matched = true;
                break;
              }
            }
            if (matched) {
              hitOverlay = true;
              this.onOverlayClick?.({ type: 'geojson', data: feat });
              break;
            }
          }
        }
      }

      if (!hitOverlay) {
        const clickLatLng = this.screenPointToLatLng(tapPos.x, tapPos.y);
        this.onClick?.(clickLatLng, tapPos);
      }
    } else {
      this.onMoveEnd?.(this.center, this.zoom);
      this.onZoomEnd?.(this.zoom);
    }
  }

  /**
   * Helper to create an Image instance (compatible with WeChat Mini-Program Canvas 2D & Web)
   */
  private createIconImageInstance(): any {
    if (this.canvas && typeof this.canvas.createImage === 'function') {
      return this.canvas.createImage();
    }
    if (typeof Image !== 'undefined') {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        return img;
      } catch (e) {}
    }
    return null;
  }

  /**
   * Request / cache an icon image (PNG, JPG, SVG, Data URI)
   */
  private getOrLoadIcon(src: string): any {
    if (!src) return null;
    const existing = this.iconCache.get(src);
    if (existing) {
      return existing.status === 'loaded' ? existing.image : null;
    }

    const img = this.createIconImageInstance();
    if (img) {
      const record: { image: any; status: 'loading' | 'loaded' | 'error' } = {
        image: img,
        status: 'loading',
      };
      this.iconCache.set(src, record);

      img.onload = () => {
        record.status = 'loaded';
        this.requestRender();
      };
      img.onerror = () => {
        record.status = 'error';
      };
      img.src = src;
      return null;
    }

    // Fallback for non-DOM WeChat / App environments
    if (typeof uni !== 'undefined' && typeof uni.getImageInfo === 'function') {
      const record: { image: any; status: 'loading' | 'loaded' | 'error' } = {
        image: src,
        status: 'loading',
      };
      this.iconCache.set(src, record);

      uni.getImageInfo({
        src,
        success: (res: any) => {
          record.image = res.path || src;
          record.status = 'loaded';
          this.requestRender();
        },
        fail: () => {
          record.status = 'error';
        },
      });
      return null;
    }

    return null;
  }

  /**
   * Draw fallback sleek vector pin
   */
  private drawPinFallback(
    ctx: any,
    pt: Point,
    pinColor: string,
    size: [number, number] = [28, 36],
    anchor: [number, number] = [14, 36]
  ) {
    const scale = (size[1] || 36) / 36;
    const pinTopX = pt.x - anchor[0] + size[0] / 2;
    const pinTipY = pt.y - anchor[1] + size[1];
    const circleCenterY = pinTipY - 18 * scale;
    const headRadius = 8 * scale;

    ctx.fillStyle = pinColor;
    ctx.beginPath();
    ctx.arc(pinTopX, circleCenterY, headRadius, 0, Math.PI * 2);
    ctx.moveTo(pinTopX - 5 * scale, circleCenterY + 5 * scale);
    ctx.lineTo(pinTopX, pinTipY);
    ctx.lineTo(pinTopX + 5 * scale, circleCenterY + 5 * scale);
    ctx.fill();

    // White center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pinTopX, circleCenterY, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Handle mouse wheel zoom (for PC Mini-Program, WeChat DevTools, etc.)
   */
  public handleWheel(e: any) {
    let delta = 0;
    if (e.deltaY !== undefined) {
      delta = e.deltaY;
    } else if (e.wheelDelta !== undefined) {
      delta = -e.wheelDelta;
    } else if (e.detail && e.detail.deltaY !== undefined) {
      delta = e.detail.deltaY;
    } else if (e.detail && typeof e.detail === 'number') {
      delta = e.detail;
    }

    if (!delta) return;

    let mouseX = this.width / 2;
    let mouseY = this.height / 2;

    if (e.x !== undefined && e.y !== undefined) {
      mouseX = e.x;
      mouseY = e.y;
    } else if (e.offsetX !== undefined && e.offsetY !== undefined) {
      mouseX = e.offsetX;
      mouseY = e.offsetY;
    } else if (e.detail && e.detail.x !== undefined && e.detail.y !== undefined) {
      mouseX = e.detail.x;
      mouseY = e.detail.y;
    }

    const pivotLatLng = this.screenPointToLatLng(mouseX, mouseY);
    const zoomDelta = delta > 0 ? -0.5 : 0.5;
    const targetZoom = clamp(
      Math.round((this.zoom + zoomDelta) * 2) / 2,
      this.minZoom,
      this.maxZoom
    );

    if (Math.abs(targetZoom - this.zoom) < 1e-4) return;

    const pivotWorld = latLngToWorldPixel(
      pivotLatLng[0],
      pivotLatLng[1],
      targetZoom,
      this.tileSize
    );

    const newCenterWorldX = pivotWorld.x - (mouseX - this.width / 2);
    const newCenterWorldY = pivotWorld.y - (mouseY - this.height / 2);

    const newCenterLatLng = worldPixelToLatLng(
      newCenterWorldX,
      newCenterWorldY,
      targetZoom,
      this.tileSize
    );

    this.zoom = targetZoom;
    this.center = [newCenterLatLng.lat, newCenterLatLng.lng];

    this.requestRender();
    this.onZoom?.(this.zoom);
    this.onMove?.(this.center, this.zoom);

    if (this.wheelEndTimeout) {
      clearTimeout(this.wheelEndTimeout);
    }
    this.wheelEndTimeout = setTimeout(() => {
      this.onZoomEnd?.(this.zoom);
      this.onMoveEnd?.(this.center, this.zoom);
    }, 200);
  }

  public getNativeInstance(): any {
    return this.canvas;
  }

  private checkFlowAnimationState() {
    const hasFlowing = this.overlays.polylines?.some((line) => line.flowing);
    const hasPulse = this.overlays.markers?.some(
      (m) => m.icon?.type === 'avatar' && m.icon?.pulse
    );
    if (hasFlowing || hasPulse) {
      this.startFlowAnimation();
    } else {
      this.stopFlowAnimation();
    }
  }

  private startFlowAnimation() {
    if (this.isFlowAnimating) return;
    this.isFlowAnimating = true;

    let lastTime = 0;
    const step = (time: number) => {
      if (!this.isFlowAnimating) return;
      if (!lastTime) lastTime = time;
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // 20 pixels per second as base flow speed
      this.flowAnimationOffset =
        (this.flowAnimationOffset + delta * 20) % 10000;
      this.requestRender();

      if (typeof requestAnimationFrame !== 'undefined') {
        this.flowAnimFrameId = requestAnimationFrame(step);
      } else {
        this.flowAnimFrameId = setTimeout(() => step(Date.now()), 16);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.flowAnimFrameId = requestAnimationFrame(step);
    } else {
      this.flowAnimFrameId = setTimeout(() => step(Date.now()), 16);
    }
  }

  private stopFlowAnimation() {
    this.isFlowAnimating = false;
    if (this.flowAnimFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.flowAnimFrameId);
      } else {
        clearTimeout(this.flowAnimFrameId);
      }
      this.flowAnimFrameId = null;
    }
  }

  public destroy() {
    this.stopFlowAnimation();
    if (this.wheelEndTimeout) {
      clearTimeout(this.wheelEndTimeout);
      this.wheelEndTimeout = null;
    }
    if (this.animFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animFrameId);
      }
      this.animFrameId = null;
    }
    for (const [, v] of this.iconCache.entries()) {
      if (v.image && typeof v.image === 'object') {
        v.image.onload = null;
        v.image.onerror = null;
      }
    }
    this.iconCache.clear();
    this.tileManager.clear();
  }
}
