export type LatLngTuple = [number, number]; // [latitude, longitude]

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TileCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface TileLayerConfig {
  id?: string;
  url: string;
  subdomains?: string[];
  opacity?: number;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
}

export interface MarkerLabelOptions {
  text: string;
  offset?: [number, number]; // [offsetX, offsetY] in px
  color?: string;
  fontSize?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: [number, number]; // [paddingY, paddingX] in px
  show?: boolean;
}

export interface MarkerIconOptions {
  /** Image URL for PNG/JPG/WebP/SVG or data URI (e.g. '/static/icons/pin-blue.png', 'data:image/png;base64,...') */
  url?: string;
  /** Raw SVG string markup (e.g. '<svg viewBox="0 0 24 24">...</svg>') */
  svg?: string;
  /** Custom HTML markup string (H5 and App renderjs) */
  html?: string;
  /** Emoji or single character e.g. '📍', '🏛️', '🚩', '☕' */
  text?: string;
  /** Default pin fill color or tint color (e.g. '#3b82f6', '#ef4444') */
  color?: string;
  /** Icon size in px: [width, height], default [32, 32] */
  size?: [number, number];
  /** Icon anchor point in px: [anchorX, anchorY], default [width/2, height] */
  anchor?: [number, number];
}

export interface MarkerOptions {
  id?: string | number;
  latLng: LatLngTuple;
  title?: string;
  icon?: MarkerIconOptions;
  label?: string | MarkerLabelOptions;
  data?: any;
}

export interface PolylineOptions {
  id?: string | number;
  latLngs: LatLngTuple[];
  color?: string;
  width?: number;
  dashArray?: number[];
  opacity?: number;
  label?: string | MarkerLabelOptions;
  data?: any;
}

export interface PolygonOptions {
  id?: string | number;
  latLngs: LatLngTuple[];
  color?: string; // stroke border color
  fillColor?: string; // fill color
  fillOpacity?: number;
  width?: number; // stroke width
  label?: string | MarkerLabelOptions;
  data?: any;
}

export interface CircleOptions {
  id?: string | number;
  latLng: LatLngTuple;
  radius: number; // in meters
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  width?: number;
  label?: string | MarkerLabelOptions;
  data?: any;
}

export interface MapOverlays {
  markers?: MarkerOptions[];
  polylines?: PolylineOptions[];
  polygons?: PolygonOptions[];
  circles?: CircleOptions[];
}

export interface OverlayClickEvent {
  type: 'marker' | 'polyline' | 'polygon' | 'circle';
  data: MarkerOptions | PolylineOptions | PolygonOptions | CircleOptions;
}

export interface MapOptions {
  center: LatLngTuple;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  tileUrl?: string;
  subdomains?: string[];
  layers?: Array<string | TileLayerConfig>;
  overlays?: MapOverlays;
  showControls?: boolean;
}

export interface MapChangeEvent {
  center: LatLngTuple;
  zoom: number;
}

/**
 * Unified Map Engine Interface (Strategy / Adapter Pattern)
 */
export interface IMapEngine {
  setCenter(center: LatLngTuple, animate?: boolean): void;
  setZoom(zoom: number): void;
  zoomIn(): void;
  zoomOut(): void;
  panTo(center: LatLngTuple, duration?: number): void;
  setTileUrl(url: string, subdomains?: string[]): void;
  setLayers(layers: Array<string | TileLayerConfig>): void;
  setOverlays(overlays: MapOverlays): void;
  setMarkers(markers: MarkerOptions[]): void;
  setPolylines(polylines: PolylineOptions[]): void;
  setPolygons(polygons: PolygonOptions[]): void;
  setCircles(circles: CircleOptions[]): void;
  clearOverlays(): void;
  getCenter(): LatLngTuple;
  getZoom(): number;
  resize(width?: number, height?: number): void;
  destroy(): void;
  getNativeInstance?(): any;
}
