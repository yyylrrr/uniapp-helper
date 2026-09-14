import type { LatLngTuple, MapBounds, Point } from '../types';
import { clamp, latLngToWorldPixel, worldPixelToLatLng } from './crs';
import { extractGeoJsonLatLngs } from './geojson';
import { generateCurvedPolyline } from './curve';

/**
 * Universal helper to extract an array of [lat, lng] coordinates
 * from various bounds representations:
 * - LatLngTuple[] (e.g. [[39.9, 116.4], [39.92, 116.45]])
 * - Single LatLngTuple ([39.9, 116.4])
 * - MapBounds object ({ minLat, maxLat, minLng, maxLng })
 * - Object with southWest & northEast ({ southWest: [lat, lng], northEast: [lat, lng] })
 * - Object with _southWest & _northEast (Leaflet bounds internal)
 * - Objects with lat & lng ({ lat: 39.9, lng: 116.4 })
 * - Objects with latLng property ({ latLng: [39.9, 116.4] })
 * - Leaflet LatLngBounds instance (getSouthWest(), getNorthEast())
 * - GeoJSON objects (FeatureCollection, Feature, Geometry)
 */
export function extractLatLngs(bounds: any): LatLngTuple[] {
  if (!bounds) return [];

  // GeoJSON object (FeatureCollection, Feature, or Geometry)
  if (
    bounds.type &&
    (bounds.features || bounds.geometry || bounds.coordinates || bounds.geometries)
  ) {
    return extractGeoJsonLatLngs(bounds);
  }

  // Single LatLngTuple: [lat, lng]
  if (
    Array.isArray(bounds) &&
    bounds.length === 2 &&
    typeof bounds[0] === 'number' &&
    typeof bounds[1] === 'number'
  ) {
    return [[bounds[0], bounds[1]]];
  }

  // Array of points or coordinates or polylines/polygons
  if (Array.isArray(bounds)) {
    const list: LatLngTuple[] = [];
    for (const item of bounds) {
      if (!item) continue;
      if (
        Array.isArray(item) &&
        item.length >= 2 &&
        typeof item[0] === 'number' &&
        typeof item[1] === 'number'
      ) {
        list.push([item[0], item[1]]);
      } else if (typeof item.lat === 'number' && typeof item.lng === 'number') {
        list.push([item.lat, item.lng]);
      } else if (
        Array.isArray(item.latLng) &&
        item.latLng.length >= 2 &&
        typeof item.latLng[0] === 'number' &&
        typeof item.latLng[1] === 'number'
      ) {
        list.push([item.latLng[0], item.latLng[1]]);
      } else if (Array.isArray(item.latLngs)) {
        // Polyline or Polygon object (if curved polyline, extract interpolated arc points)
        const pts = item.curved
          ? generateCurvedPolyline(item.latLngs, item.curvature ?? 0.25)
          : item.latLngs;
        for (const pt of pts) {
          if (
            Array.isArray(pt) &&
            pt.length >= 2 &&
            typeof pt[0] === 'number' &&
            typeof pt[1] === 'number'
          ) {
            list.push([pt[0], pt[1]]);
          } else if (pt && typeof pt.lat === 'number' && typeof pt.lng === 'number') {
            list.push([pt.lat, pt.lng]);
          }
        }
      } else if (item.type && (item.features || item.geometry || item.coordinates)) {
        list.push(...extractGeoJsonLatLngs(item));
      }
    }
    return list;
  }

  // Overlays collection object: { markers, polylines, polygons, circles, geojson }
  if (
    bounds.markers ||
    bounds.polylines ||
    bounds.polygons ||
    bounds.circles ||
    bounds.geojson
  ) {
    const list: LatLngTuple[] = [];
    if (Array.isArray(bounds.markers)) {
      list.push(...extractLatLngs(bounds.markers));
    }
    if (Array.isArray(bounds.polylines)) {
      list.push(...extractLatLngs(bounds.polylines));
    }
    if (Array.isArray(bounds.polygons)) {
      list.push(...extractLatLngs(bounds.polygons));
    }
    if (Array.isArray(bounds.circles)) {
      list.push(...extractLatLngs(bounds.circles));
    }
    if (bounds.geojson) {
      list.push(...extractGeoJsonLatLngs(bounds.geojson));
    }
    return list;
  }

  // Leaflet LatLngBounds object
  if (
    typeof bounds.getSouthWest === 'function' &&
    typeof bounds.getNorthEast === 'function'
  ) {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return [
      [sw.lat, sw.lng],
      [ne.lat, ne.lng],
    ];
  }

  // MapBounds object: { minLat, maxLat, minLng, maxLng }
  if (
    typeof bounds.minLat === 'number' &&
    typeof bounds.maxLat === 'number' &&
    typeof bounds.minLng === 'number' &&
    typeof bounds.maxLng === 'number'
  ) {
    return [
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng],
    ];
  }

  // Object with southWest and northEast
  if (bounds.southWest && bounds.northEast) {
    const sw = bounds.southWest;
    const ne = bounds.northEast;
    const swLat = Array.isArray(sw) ? sw[0] : sw.lat;
    const swLng = Array.isArray(sw) ? sw[1] : sw.lng;
    const neLat = Array.isArray(ne) ? ne[0] : ne.lat;
    const neLng = Array.isArray(ne) ? ne[1] : ne.lng;
    if (
      typeof swLat === 'number' &&
      typeof swLng === 'number' &&
      typeof neLat === 'number' &&
      typeof neLng === 'number'
    ) {
      return [
        [swLat, swLng],
        [neLat, neLng],
      ];
    }
  }

  // Object with _southWest and _northEast
  if (bounds._southWest && bounds._northEast) {
    const sw = bounds._southWest;
    const ne = bounds._northEast;
    if (typeof sw.lat === 'number' && typeof ne.lat === 'number') {
      return [
        [sw.lat, sw.lng],
        [ne.lat, ne.lng],
      ];
    }
  }

  return [];
}

/**
 * Calculate the bounding box { minLat, maxLat, minLng, maxLng } from points
 */
export function calculateBounds(points: LatLngTuple[]): MapBounds | null {
  if (!points || points.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of points) {
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    if (isNaN(lat) || isNaN(lng)) continue;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  if (!isFinite(minLat) || !isFinite(maxLat) || !isFinite(minLng) || !isFinite(maxLng)) {
    return null;
  }

  return { minLat, maxLat, minLng, maxLng };
}

export interface BoundsCalcOptions {
  padding?: [number, number]; // [paddingX, paddingY] in pixels
  minZoom?: number;
  maxZoom?: number;
  tileSize?: number;
}

/**
 * Calculate optimal center LatLng and integer Zoom to fit the bounds in given view dimensions
 */
export function getBoundsCenterAndZoom(
  bounds: any,
  viewWidth: number,
  viewHeight: number,
  options?: BoundsCalcOptions
): { center: LatLngTuple; zoom: number } | null {
  const points = extractLatLngs(bounds);
  const bbox = calculateBounds(points);
  if (!bbox) return null;

  const { minLat, maxLat, minLng, maxLng } = bbox;
  const minZoom = options?.minZoom ?? 3;
  const maxZoom = options?.maxZoom ?? 18;
  const tileSize = options?.tileSize || 256;

  // Single point case
  if (Math.abs(maxLat - minLat) < 1e-7 && Math.abs(maxLng - minLng) < 1e-7) {
    return {
      center: [minLat, minLng],
      zoom: clamp(options?.maxZoom ?? 14, minZoom, maxZoom),
    };
  }

  // Convert bounding corners to Mercator world pixels at zoom 0
  const pNW = latLngToWorldPixel(maxLat, minLng, 0, tileSize);
  const pSE = latLngToWorldPixel(minLat, maxLng, 0, tileSize);

  // Geometric center in world pixels at zoom 0
  const centerWorldX = (pNW.x + pSE.x) / 2;
  const centerWorldY = (pNW.y + pSE.y) / 2;
  const centerLatLng = worldPixelToLatLng(centerWorldX, centerWorldY, 0, tileSize);

  // Available viewport space considering padding
  const padX = options?.padding ? options.padding[0] : 20;
  const padY = options?.padding ? options.padding[1] : 20;
  const availW = Math.max(viewWidth - 2 * padX, 20);
  const availH = Math.max(viewHeight - 2 * padY, 20);

  // World pixel spans at zoom 0
  const deltaX0 = Math.abs(pSE.x - pNW.x);
  const deltaY0 = Math.abs(pSE.y - pNW.y);

  const zoomX = deltaX0 > 1e-6 ? Math.log2(availW / deltaX0) : Infinity;
  const zoomY = deltaY0 > 1e-6 ? Math.log2(availH / deltaY0) : Infinity;

  // Use Math.floor to ensure entire bounding area + padding fits within view
  const rawZoom = Math.min(zoomX, zoomY);
  const targetZoom = clamp(Math.floor(rawZoom), minZoom, maxZoom);

  return {
    center: [centerLatLng.lat, centerLatLng.lng],
    zoom: targetZoom,
  };
}
