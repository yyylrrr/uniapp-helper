import { formatTileUrl } from '../utils/tile';

export interface TileImageRecord {
  image: any;
  status: 'loading' | 'loaded' | 'error';
  lastUsed: number;
}

export interface ParentFallbackInfo {
  image: any;
  // Sub-rectangle in parent tile (0..256)
  srcX: number;
  srcY: number;
  srcSize: number;
}

export class TileManager {
  private cache: Map<string, TileImageRecord> = new Map();
  private maxCacheSize: number;
  private canvasNode: any;
  private onTileLoadedCallback?: (key: string) => void;

  constructor(maxCacheSize = 250) {
    this.maxCacheSize = maxCacheSize;
  }

  public setCanvasNode(canvasNode: any) {
    this.canvasNode = canvasNode;
  }

  public setOnTileLoaded(cb: (key: string) => void) {
    this.onTileLoadedCallback = cb;
  }

  /**
   * Create an Image instance (supports mini-program Canvas 2D and Web)
   */
  private createImageInstance(): any {
    if (this.canvasNode && typeof this.canvasNode.createImage === 'function') {
      return this.canvasNode.createImage();
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
   * Request a tile. If cached and loaded, returns the image record.
   * If not cached, initiates image loading across Web, Mini-Program, and App-Plus.
   */
  public requestTile(key: string, url: string): TileImageRecord | null {
    const existing = this.cache.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing;
    }

    const img = this.createImageInstance();
    if (img) {
      const record: TileImageRecord = {
        image: img,
        status: 'loading',
        lastUsed: Date.now(),
      };

      this.evictIfNeeded();
      this.cache.set(key, record);

      img.onload = () => {
        record.status = 'loaded';
        if (this.onTileLoadedCallback) {
          this.onTileLoadedCallback(key);
        }
      };

      img.onerror = () => {
        record.status = 'error';
      };

      img.src = url;
      return record;
    }

    // Fallback for App-Plus / non-DOM environments using uni.getImageInfo
    if (typeof uni !== 'undefined' && typeof uni.getImageInfo === 'function') {
      const record: TileImageRecord = {
        image: url,
        status: 'loading',
        lastUsed: Date.now(),
      };

      this.evictIfNeeded();
      this.cache.set(key, record);

      uni.getImageInfo({
        src: url,
        success: (res: any) => {
          record.image = res.path || url;
          record.status = 'loaded';
          if (this.onTileLoadedCallback) {
            this.onTileLoadedCallback(key);
          }
        },
        fail: () => {
          record.status = 'error';
        },
      });

      return record;
    }

    return null;
  }

  /**
   * Check if a parent tile (from lower zoom levels) is already loaded to serve as fallback
   */
  public getParentFallback(
    z: number,
    x: number,
    y: number,
    tileUrlTemplate: string,
    subdomains: string[] = ['a', 'b', 'c'],
    minZ = 0,
    tileSize = 256
  ): ParentFallbackInfo | null {
    for (let pz = z - 1; pz >= minZ; pz--) {
      const zoomDiff = z - pz;
      const factor = 1 << zoomDiff;
      const px = Math.floor(x / factor);
      const py = Math.floor(y / factor);

      const parentUrl = formatTileUrl(tileUrlTemplate, px, py, pz, subdomains);
      const parentKey = `${pz}_${px}_${py}_${parentUrl}`;
      const record = this.cache.get(parentKey);

      if (record && record.status === 'loaded' && record.image) {
        const subTileSize = tileSize / factor;
        const subX = (x % factor) * subTileSize;
        const subY = (y % factor) * subTileSize;

        return {
          image: record.image,
          srcX: subX,
          srcY: subY,
          srcSize: subTileSize,
        };
      }
    }
    return null;
  }

  private evictIfNeeded() {
    if (this.cache.size < this.maxCacheSize) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [k, v] of this.cache.entries()) {
      if (v.lastUsed < oldestTime) {
        oldestTime = v.lastUsed;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      const item = this.cache.get(oldestKey);
      if (item && item.image) {
        item.image.onload = null;
        item.image.onerror = null;
        item.image.src = '';
      }
      this.cache.delete(oldestKey);
    }
  }

  public clear() {
    for (const [, v] of this.cache.entries()) {
      if (v.image) {
        v.image.onload = null;
        v.image.onerror = null;
        v.image.src = '';
      }
    }
    this.cache.clear();
  }
}
