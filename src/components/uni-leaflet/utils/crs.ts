import type { LatLng, Point } from '../types';

const MAX_LATITUDE = 85.0511287798;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Limit value within [min, max]
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Convert Latitude & Longitude to world pixel coordinates at a given zoom level (EPSG:3857)
 */
export function latLngToWorldPixel(
  lat: number,
  lng: number,
  zoom: number,
  tileSize = 256
): Point {
  const clampedLat = clamp(lat, -MAX_LATITUDE, MAX_LATITUDE);
  const scale = tileSize * Math.pow(2, zoom);

  // X coordinate
  const x = ((lng + 180) / 360) * scale;

  // Y coordinate
  const sin = Math.sin(clampedLat * DEG_TO_RAD);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;

  return { x, y };
}

/**
 * Convert world pixel coordinates back to Latitude & Longitude at a given zoom level (EPSG:3857)
 */
export function worldPixelToLatLng(
  x: number,
  y: number,
  zoom: number,
  tileSize = 256
): LatLng {
  const scale = tileSize * Math.pow(2, zoom);

  // Longitude
  let lng = (x / scale) * 360 - 180;
  // Normalize longitude to [-180, 180]
  lng = (((lng + 180) % 360) + 360) % 360 - 180;

  // Latitude
  const normY = 0.5 - y / scale;
  const lat = RAD_TO_DEG * (2 * Math.atan(Math.exp(normY * 2 * Math.PI)) - Math.PI / 2);

  return {
    lat: clamp(lat, -MAX_LATITUDE, MAX_LATITUDE),
    lng,
  };
}
