import type {
  LatLngTuple,
  MarkerOptions,
  ClusterGroup,
  ClusterResult,
  ClusterOptions,
} from '../types';
import { latLngToWorldPixel } from './crs';

export type { ClusterGroup, ClusterResult, ClusterOptions };

/**
 * Cluster markers based on screen pixel distance at current zoom level (EPSG:3857)
 */
export function clusterMarkers(
  markers: MarkerOptions[],
  zoom: number,
  options?: ClusterOptions
): ClusterResult[] {
  if (!markers || markers.length === 0) return [];

  const radius = options?.clusterRadius ?? 60;
  const maxZoom = options?.clusterMaxZoom ?? 17;
  const tileSize = options?.tileSize || 256;

  // If beyond max cluster zoom, return all markers directly
  if (zoom >= maxZoom) {
    return markers.map((marker) => ({ isCluster: false, marker }));
  }

  // Calculate world pixel coordinate for each marker at zoom
  interface PixelMarker {
    marker: MarkerOptions;
    x: number;
    y: number;
    assigned: boolean;
  }

  const pixelMarkers: PixelMarker[] = [];
  for (const marker of markers) {
    if (!marker || !marker.latLng) continue;
    const [lat, lng] = marker.latLng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;
    const pt = latLngToWorldPixel(lat, lng, zoom, tileSize);
    pixelMarkers.push({
      marker,
      x: pt.x,
      y: pt.y,
      assigned: false,
    });
  }

  if (pixelMarkers.length === 0) return [];

  // Spatial Grid Index for fast neighbor search
  const grid = new Map<string, PixelMarker[]>();
  const cellSize = radius;

  for (const pm of pixelMarkers) {
    const gx = Math.floor(pm.x / cellSize);
    const gy = Math.floor(pm.y / cellSize);
    const key = `${gx}_${gy}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(pm);
  }

  const results: ClusterResult[] = [];
  const radiusSq = radius * radius;

  for (let i = 0; i < pixelMarkers.length; i++) {
    const pm = pixelMarkers[i];
    if (pm.assigned) continue;

    pm.assigned = true;
    const clusterItems: PixelMarker[] = [pm];

    const gx = Math.floor(pm.x / cellSize);
    const gy = Math.floor(pm.y / cellSize);

    // Search 3x3 neighbor grid cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborKey = `${gx + dx}_${gy + dy}`;
        const neighborCell = grid.get(neighborKey);
        if (!neighborCell) continue;

        for (const neighbor of neighborCell) {
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
      // Single unclustered marker
      results.push({
        isCluster: false,
        marker: clusterItems[0].marker,
      });
    } else {
      // Multi-marker cluster
      let sumLat = 0;
      let sumLng = 0;
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      const clusterRawMarkers: MarkerOptions[] = [];
      for (const item of clusterItems) {
        const [lat, lng] = item.marker.latLng;
        sumLat += lat;
        sumLng += lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        clusterRawMarkers.push(item.marker);
      }

      const count = clusterItems.length;
      const centerLat = sumLat / count;
      const centerLng = sumLng / count;

      // Pick representative marker (one that has an icon or first)
      const rep =
        clusterRawMarkers.find((m) => m.icon?.url || m.icon?.svg || m.icon?.text) ||
        clusterRawMarkers[0];

      results.push({
        isCluster: true,
        cluster: {
          id: `cluster_${zoom}_${centerLat.toFixed(5)}_${centerLng.toFixed(5)}_${count}`,
          count,
          center: [centerLat, centerLng],
          bounds: [
            [minLat, minLng],
            [maxLat, maxLng],
          ],
          markers: clusterRawMarkers,
          representativeMarker: rep,
        },
      });
    }
  }

  return results;
}
