import type { Point } from '../types';
import { latLngToWorldPixel } from './crs';

export interface VisibleTile {
  key: string;
  x: number;
  y: number;
  z: number;
  url: string;
  screenX: number;
  screenY: number;
  screenSize: number;
}

/**
 * Format tile URL with template string {z}, {x}, {y}, {s}, {-y}
 */
export function formatTileUrl(
  template: string,
  x: number,
  y: number,
  z: number,
  subdomains: string[] = ['a', 'b', 'c']
): string {
  const maxTile = 1 << z;
  // Normalize x (wrap around longitude)
  const normalizedX = ((x % maxTile) + maxTile) % maxTile;
  
  // Calculate subdomain
  const subdomain =
    subdomains.length > 0
      ? subdomains[Math.abs(normalizedX + y) % subdomains.length]
      : '';

  // TMS inverted y
  const invertedY = maxTile - 1 - y;

  return template
    .replace('{z}', String(z))
    .replace('{x}', String(normalizedX))
    .replace('{y}', String(y))
    .replace('{-y}', String(invertedY))
    .replace('{s}', subdomain);
}

/**
 * Calculate all visible tiles in current viewport
 */
export function getVisibleTiles(
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewWidth: number,
  viewHeight: number,
  tileUrlTemplate: string,
  subdomains: string[] = ['a', 'b', 'c'],
  tileSize = 256
): { tiles: VisibleTile[]; centerWorldPixel: Point } {
  // Determine base integer zoom for tile fetching
  const baseZoom = Math.floor(zoom);
  const zoomFraction = zoom - baseZoom;
  const zoomScale = Math.pow(2, zoomFraction);
  const currentTileSize = tileSize * zoomScale;

  // World pixel position of center at baseZoom
  const centerWorldPixel = latLngToWorldPixel(centerLat, centerLng, baseZoom, tileSize);

  // Viewport half dimensions scaled
  const halfW = viewWidth / 2;
  const halfH = viewHeight / 2;

  // World pixel bounds visible in viewport (relative to baseZoom)
  const minWorldX = centerWorldPixel.x - halfW / zoomScale;
  const maxWorldX = centerWorldPixel.x + halfW / zoomScale;
  const minWorldY = centerWorldPixel.y - halfH / zoomScale;
  const maxWorldY = centerWorldPixel.y + halfH / zoomScale;

  // Tile index bounds
  const minTileX = Math.floor(minWorldX / tileSize);
  const maxTileX = Math.floor(maxWorldX / tileSize);
  const minTileY = Math.floor(minWorldY / tileSize);
  const maxTileY = Math.floor(maxWorldY / tileSize);

  const maxTileCount = 1 << baseZoom;
  const tiles: VisibleTile[] = [];

  for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
    // Y tile index must be within [0, 2^z - 1]
    if (tileY < 0 || tileY >= maxTileCount) continue;

    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      // Calculate tile top-left in world pixels at baseZoom
      const tileWorldX = tileX * tileSize;
      const tileWorldY = tileY * tileSize;

      // Project into screen coordinates
      const screenX = halfW + (tileWorldX - centerWorldPixel.x) * zoomScale;
      const screenY = halfH + (tileWorldY - centerWorldPixel.y) * zoomScale;

      const normX = ((tileX % maxTileCount) + maxTileCount) % maxTileCount;
      const url = formatTileUrl(tileUrlTemplate, normX, tileY, baseZoom, subdomains);
      const key = url;

      tiles.push({
        key,
        x: normX,
        y: tileY,
        z: baseZoom,
        url,
        screenX,
        screenY,
        screenSize: currentTileSize,
      });
    }
  }

  return { tiles, centerWorldPixel };
}
