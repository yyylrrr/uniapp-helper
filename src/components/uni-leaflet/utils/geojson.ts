import type { LatLngTuple, GeoJsonStyleOptions, GeoJsonStyle } from '../types';

/**
 * Extracts an array of [lat, lng] coordinates from any GeoJSON structure
 * (FeatureCollection, Feature, or raw Geometry).
 * Note: GeoJSON stores coordinates as [longitude, latitude], which is converted here
 * to [latitude, longitude] tuples for Leaflet / Map consistency.
 */
export function extractGeoJsonLatLngs(geojson: any): LatLngTuple[] {
  if (!geojson) return [];

  const result: LatLngTuple[] = [];

  function parseCoordinates(coords: any) {
    if (!coords || !Array.isArray(coords)) return;

    // Single coordinate pair: [lng, lat]
    if (
      coords.length >= 2 &&
      typeof coords[0] === 'number' &&
      typeof coords[1] === 'number'
    ) {
      result.push([coords[1], coords[0]]);
      return;
    }

    // Nested coordinate arrays
    for (const sub of coords) {
      parseCoordinates(sub);
    }
  }

  function parseGeometry(geom: any) {
    if (!geom || !geom.type) return;

    if (geom.type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
      for (const g of geom.geometries) {
        parseGeometry(g);
      }
      return;
    }

    if (geom.coordinates) {
      parseCoordinates(geom.coordinates);
    }
  }

  function parseFeature(feature: any) {
    if (!feature) return;
    if (feature.geometry) {
      parseGeometry(feature.geometry);
    }
  }

  if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    for (const f of geojson.features) {
      parseFeature(f);
    }
  } else if (geojson.type === 'Feature') {
    parseFeature(geojson);
  } else if (geojson.type) {
    // Direct Geometry object
    parseGeometry(geojson);
  } else if (Array.isArray(geojson)) {
    for (const item of geojson) {
      result.push(...extractGeoJsonLatLngs(item));
    }
  }

  return result;
}

export interface NormalizedGeoJsonFeature {
  type: 'Feature';
  geometry: {
    type:
      | 'Point'
      | 'MultiPoint'
      | 'LineString'
      | 'MultiLineString'
      | 'Polygon'
      | 'MultiPolygon'
      | 'GeometryCollection';
    coordinates: any;
  };
  properties: Record<string, any>;
}

/**
 * Normalizes any GeoJSON input into an array of Standard Features
 */
export function normalizeGeoJsonFeatures(
  geojson: any
): NormalizedGeoJsonFeature[] {
  if (!geojson) return [];

  if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    return geojson.features.filter((f: any) => f && f.geometry);
  }

  if (geojson.type === 'Feature' && geojson.geometry) {
    return [geojson];
  }

  if (geojson.type) {
    // Direct geometry
    return [
      {
        type: 'Feature',
        geometry: geojson,
        properties: {},
      },
    ];
  }

  if (Array.isArray(geojson)) {
    const list: NormalizedGeoJsonFeature[] = [];
    for (const item of geojson) {
      list.push(...normalizeGeoJsonFeatures(item));
    }
    return list;
  }

  return [];
}

/**
 * Resolve style for a given feature from static or functional GeoJsonStyle
 */
export function resolveGeoJsonStyle(
  style: GeoJsonStyle | undefined,
  feature: any,
  defaultColor = '#3b82f6'
): GeoJsonStyleOptions {
  let computed: GeoJsonStyleOptions = {};
  if (typeof style === 'function') {
    computed = style(feature) || {};
  } else if (style && typeof style === 'object') {
    computed = { ...style };
  }

  return {
    color: computed.color || defaultColor,
    weight: computed.weight ?? 2,
    opacity: computed.opacity ?? 1,
    fillColor: computed.fillColor || computed.color || defaultColor,
    fillOpacity: computed.fillOpacity ?? 0.25,
    dashArray: computed.dashArray,
  };
}

/**
 * Ray-casting algorithm to test if a 2D point [x, y] is inside a polygon ring
 */
export function isPointInPolygon2D(
  pt: [number, number],
  ring: [number, number][]
): boolean {
  let inside = false;
  const x = pt[0];
  const y = pt[1];

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}
