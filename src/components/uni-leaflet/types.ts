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
  /** Icon rendering type template */
  type?: 'default' | 'image' | 'emoji' | 'svg' | 'html' | 'avatar';
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

  // --- Avatar Bubble Options ---
  /** 头像气泡右上角角标文本或 Emoji (例如 '❤️', 'VIP', '👑') */
  badgeText?: string;
  /** 头像气泡角标背景色，默认线性渐变红 */
  badgeColor?: string;
  /** 是否带有心跳脉冲光晕微动效，默认 false */
  pulse?: boolean;
  /** 脉冲光晕颜色，默认与 borderColor 一致 */
  pulseColor?: string;
  /** 头像气泡外圆环边框颜色，默认 '#3b82f6' */
  borderColor?: string;
  /** 头像气泡外圆环边框宽度，默认 3 */
  borderWidth?: number;
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
  dashOffset?: number;
  opacity?: number;
  label?: string | MarkerLabelOptions;
  /** 是否开启贝塞尔平滑弧线（旅行航线/航迹线），基于两点或多点生成弧线，默认 false */
  curved?: boolean;
  /** 弧线曲率系数，默认 0.25（正数向左/上一侧拱起，负数向右/下一侧拱起，0 为直线） */
  curvature?: number;
  /** 是否开启流光/流动虚线动效，默认 false */
  flowing?: boolean;
  /** 流光流动速度，默认 1（数值越大流动越快，负数反向流动） */
  flowSpeed?: number;
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

export interface GeoJsonStyleOptions {
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dashArray?: number[];
}

export type GeoJsonStyle =
  | GeoJsonStyleOptions
  | ((feature: any) => GeoJsonStyleOptions);

export interface MapOverlays {
  markers?: MarkerOptions[];
  polylines?: PolylineOptions[];
  polygons?: PolygonOptions[];
  circles?: CircleOptions[];
  geojson?: any;
  geojsonStyle?: GeoJsonStyle;
}

export interface OverlayClickEvent {
  type: 'marker' | 'polyline' | 'polygon' | 'circle' | 'geojson';
  data: MarkerOptions | PolylineOptions | PolygonOptions | CircleOptions | any;
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
  geojson?: any;
  geojsonStyle?: GeoJsonStyle;
  showControls?: boolean;
}

export interface MapChangeEvent {
  center: LatLngTuple;
  zoom: number;
}

export type LatLngBoundsExpression =
  | LatLngTuple[]
  | [LatLngTuple, LatLngTuple]
  | MapBounds
  | { southWest: LatLngTuple; northEast: LatLngTuple }
  | 'markers'
  | 'polylines'
  | 'polygons'
  | 'circles'
  | 'geojson'
  | 'all'
  | 'points'
  | 'lines'
  | any;

export interface FitBoundsOptions {
  padding?: [number, number]; // [paddingX, paddingY] in px
  paddingTopLeft?: [number, number];
  paddingBottomRight?: [number, number];
  maxZoom?: number;
  animate?: boolean;
  duration?: number;
  [key: string]: any;
}

export interface ClusterGroup {
  id: string;
  count: number;
  center: LatLngTuple;
  bounds: [LatLngTuple, LatLngTuple];
  markers: MarkerOptions[];
  representativeMarker: MarkerOptions;
}

export type ClusterResult =
  | { isCluster: false; marker: MarkerOptions }
  | { isCluster: true; cluster: ClusterGroup };

export interface ClusterOptions {
  enable?: boolean;
  clusterRadius?: number; // default 60px
  clusterMaxZoom?: number; // default 17
  tileSize?: number;
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
  fitBounds(
    bounds: LatLngBoundsExpression | LatLngTuple[] | MapBounds,
    options?: FitBoundsOptions
  ): void;
  setTileUrl(url: string, subdomains?: string[]): void;
  setLayers(layers: Array<string | TileLayerConfig>): void;
  setOverlays(overlays: MapOverlays): void;
  setMarkers(markers: MarkerOptions[]): void;
  setPolylines(polylines: PolylineOptions[]): void;
  setPolygons(polygons: PolygonOptions[]): void;
  setCircles(circles: CircleOptions[]): void;
  setGeoJSON?(data: any, style?: GeoJsonStyle): void;
  clearOverlays(): void;
  setClusterOptions?(options: ClusterOptions): void;
  getCenter(): LatLngTuple;
  getZoom(): number;
  resize(width?: number, height?: number): void;
  destroy(): void;
  getNativeInstance?(): any;
}
