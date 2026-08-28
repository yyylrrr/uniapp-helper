import type {
  IMapEngine,
  LatLngTuple,
  Point,
  TileLayerConfig,
  MapOverlays,
  OverlayClickEvent,
} from '../types';

// #ifdef H5
import { H5MapAdapter } from './h5-map-adapter';
// #endif

// #ifndef H5
import { CanvasTileEngine } from './canvas-tile-engine';
// #endif

export interface CreateEngineOptions {
  center: LatLngTuple;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  tileUrl: string;
  subdomains: string[];
  layers?: Array<string | TileLayerConfig>;
  overlays?: MapOverlays;
  showControls?: boolean;
  onMove: (center: LatLngTuple, zoom: number) => void;
  onMoveEnd: (center: LatLngTuple, zoom: number) => void;
  onZoom: (zoom: number) => void;
  onZoomEnd: (zoom: number) => void;
  onClick: (latLng: LatLngTuple, point: Point) => void;
  onOverlayClick?: (event: OverlayClickEvent) => void;

  // H5 container
  container?: HTMLElement | null;

  // Mini-program / App canvas
  canvas?: any;
  ctx?: any;
  width?: number;
  height?: number;
  dpr?: number;
}

/**
 * Factory to create platform-specific map engine implementing unified IMapEngine
 */
export async function createMapEngine(
  options: CreateEngineOptions
): Promise<IMapEngine> {
  // #ifdef H5
  const adapter = new H5MapAdapter();
  if (!options.container) {
    throw new Error('H5MapAdapter requires container DOM element');
  }
  await adapter.init({
    container: options.container,
    center: options.center,
    zoom: options.zoom,
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
    tileUrl: options.tileUrl,
    subdomains: options.subdomains,
    layers: options.layers,
    overlays: options.overlays,
    onMove: options.onMove,
    onMoveEnd: options.onMoveEnd,
    onZoom: options.onZoom,
    onZoomEnd: options.onZoomEnd,
    onClick: options.onClick,
    onOverlayClick: options.onOverlayClick,
  });
  return adapter;
  // #endif

  // #ifndef H5
  return new CanvasTileEngine({
    canvas: options.canvas,
    ctx: options.ctx,
    width: options.width || 300,
    height: options.height || 300,
    dpr: options.dpr || 1,
    center: options.center,
    zoom: options.zoom,
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
    tileUrl: options.tileUrl,
    subdomains: options.subdomains,
    layers: options.layers,
    overlays: options.overlays,
    showControls: options.showControls,
    onMove: options.onMove,
    onMoveEnd: options.onMoveEnd,
    onZoom: options.onZoom,
    onZoomEnd: options.onZoomEnd,
    onClick: options.onClick,
    onOverlayClick: options.onOverlayClick,
  });
  // #endif
}
