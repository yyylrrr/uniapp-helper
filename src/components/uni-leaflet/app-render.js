import * as LModule from 'leaflet';

function resolveLeaflet(raw) {
  if (raw && typeof raw.map === 'function') return raw;
  if (raw && raw.default && typeof raw.default.map === 'function') return raw.default;
  if (typeof window !== 'undefined' && window.L && typeof window.L.map === 'function') {
    return window.L;
  }
  if (typeof globalThis !== 'undefined' && globalThis.L && typeof globalThis.L.map === 'function') {
    return globalThis.L;
  }
  return (raw && raw.default) ? raw.default : raw;
}

const L = resolveLeaflet(LModule);

// Inject essential Leaflet layout CSS into Webview document
function ensureLeafletStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('uni-leaflet-core-styles')) return;

  const style = document.createElement('style');
  style.id = 'uni-leaflet-core-styles';
  style.innerHTML = `
    .leaflet-pane,
    .leaflet-tile,
    .leaflet-marker-icon,
    .leaflet-marker-shadow,
    .leaflet-tile-container,
    .leaflet-pane > svg,
    .leaflet-pane > canvas,
    .leaflet-zoom-box,
    .leaflet-image-layer,
    .leaflet-layer {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
    }
    .leaflet-container {
      overflow: hidden !important;
      width: 100% !important;
      height: 100% !important;
      position: relative !important;
      touch-action: none !important;
      -webkit-tap-highlight-color: transparent !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      background: #f2efe9 !important;
      cursor: grab;
    }
    .leaflet-tile,
    .leaflet-marker-icon,
    .leaflet-marker-shadow {
      user-select: none !important;
      -webkit-user-select: none !important;
      -webkit-user-drag: none !important;
    }
    .leaflet-tile {
      filter: inherit !important;
      visibility: hidden;
      max-width: none !important;
      max-height: none !important;
      width: 256px !important;
      height: 256px !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      box-sizing: content-box !important;
      pointer-events: none !important;
    }
    .leaflet-tile-loaded {
      visibility: inherit !important;
    }
    .leaflet-tile-container {
      pointer-events: none !important;
    }
    .leaflet-zoom-animated {
      transform-origin: 0 0 !important;
      -webkit-transform-origin: 0 0 !important;
    }
    .leaflet-pane { z-index: 400; }
    .leaflet-tile-pane { z-index: 200; pointer-events: none !important; }
    .leaflet-overlay-pane { z-index: 400; pointer-events: none !important; }
    .leaflet-shadow-pane { z-index: 500; pointer-events: none !important; }
    .leaflet-marker-pane { z-index: 600; pointer-events: none !important; }
    .leaflet-tooltip-pane { z-index: 650; pointer-events: none !important; }
    .leaflet-popup-pane { z-index: 700; }
    .leaflet-map-pane canvas { z-index: 100; }
    .leaflet-map-pane svg { z-index: 200; pointer-events: none !important; }

    /* Interactive Elements & Clicks */
    .leaflet-interactive,
    .leaflet-pane > svg path.leaflet-interactive,
    .leaflet-pane > svg polygon.leaflet-interactive,
    .leaflet-pane > svg polyline.leaflet-interactive,
    .leaflet-pane > svg circle.leaflet-interactive,
    .leaflet-marker-pane .leaflet-marker-icon {
      pointer-events: auto !important;
      cursor: pointer !important;
    }

    .leaflet-tooltip {
      position: absolute !important;
      padding: 4px 8px !important;
      background-color: #fff !important;
      border: 1px solid #fff !important;
      border-radius: 4px !important;
      color: #222 !important;
      white-space: nowrap !important;
      user-select: none !important;
      pointer-events: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
    }
    .leaflet-tooltip-top {
      margin-top: -6px !important;
    }

    .uni-overlay-label {
      position: absolute !important;
      background-color: rgba(255, 255, 255, 0.96) !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 3px 8px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
      white-space: nowrap !important;
      pointer-events: none !important;
    }

    .leaflet-tooltip-top.uni-overlay-label:before,
    .leaflet-tooltip-top.uni-overlay-label:after {
      content: "" !important;
      position: absolute !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: 0 !important;
      height: 0 !important;
      border-style: solid !important;
      pointer-events: none !important;
    }

    /* Outer border triangle */
    .leaflet-tooltip-top.uni-overlay-label:before {
      bottom: -6px !important;
      border-width: 6px 5px 0 5px !important;
      border-color: #cbd5e1 transparent transparent transparent !important;
      z-index: 1 !important;
    }

    /* Inner fill triangle */
    .leaflet-tooltip-top.uni-overlay-label:after {
      bottom: -5px !important;
      border-width: 5px 4px 0 4px !important;
      border-color: rgba(255, 255, 255, 0.96) transparent transparent transparent !important;
      z-index: 2 !important;
    }
    .uni-emoji-marker-icon,
    .uni-custom-svg-icon,
    .uni-custom-html-icon,
    .uni-custom-img-icon,
    .uni-custom-icon,
    .uni-default-pin {
      background: transparent !important;
      border: none !important;
    }
  `;
  document.head.appendChild(style);
}

export default {
  data() {
    return {
      map: null,
      tileLayers: [],
      overlayGroup: null,
      isReady: false,
      cachedProps: null,
      isUserInteracting: false,
      lastReportedCenter: null,
      lastReportedZoom: null,
      moveThrottleTimer: null,
      currentLayersKey: '',
      currentOverlaysKey: '',
    };
  },
  mounted() {
    ensureLeafletStyles();
    this.initLeaflet();
  },
  beforeDestroy() {
    if (this.moveThrottleTimer) {
      clearTimeout(this.moveThrottleTimer);
      this.moveThrottleTimer = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  },
  methods: {
    initLeaflet() {
      if (this.map) return;
      ensureLeafletStyles();

      const id = (this.prop && this.prop.appMapId) || (this.cachedProps && this.cachedProps.appMapId);
      const container = (id && document.getElementById(id)) || (this.$el && this.$el.querySelector ? this.$el.querySelector('.uni-leaflet-h5-container') : this.$el);
      if (!container) {
        setTimeout(() => this.initLeaflet(), 60);
        return;
      }

      const p = this.cachedProps || this.prop || {};
      const center = p.center || [39.9042, 116.4074];
      const zoom = p.zoom || 13;
      const minZoom = p.minZoom ?? 3;
      const maxZoom = p.maxZoom ?? 18;

      try {
        this.map = L.map(container, {
          center: [center[0], center[1]],
          zoom,
          minZoom,
          maxZoom,
          zoomControl: false,
          attributionControl: false,
          tap: false, // Avoid synthetic tap conflicts with pinch-to-zoom on mobile Webview
          touchZoom: true, // Smooth native multi-touch pinch-to-zoom
          bounceAtZoomLimits: false,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        });

        try {
          this.map.createPane('overlayTilePane');
          const overlayPane = this.map.getPane('overlayTilePane');
          if (overlayPane) {
            overlayPane.style.zIndex = '350';
            overlayPane.style.pointerEvents = 'none';
          }
        } catch (e) {}

        this.overlayGroup = L.layerGroup().addTo(this.map);

        // Track user drag/pinch gestures to prevent ping-pong feedback loop
        this.map.on('movestart zoomstart dragstart', () => {
          this.isUserInteracting = true;
        });

        this.map.on('move', () => {
          const c = this.map.getCenter();
          const z = this.map.getZoom();
          this.lastReportedCenter = [c.lat, c.lng];
          this.lastReportedZoom = z;

          if (!this.moveThrottleTimer) {
            this.moveThrottleTimer = setTimeout(() => {
              this.moveThrottleTimer = null;
              if (this.map) {
                const cur = this.map.getCenter();
                const curZ = this.map.getZoom();
                this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapMove', { center: [cur.lat, cur.lng], zoom: curZ });
              }
            }, 100);
          }
        });

        this.map.on('moveend zoomend dragend', () => {
          if (this.moveThrottleTimer) {
            clearTimeout(this.moveThrottleTimer);
            this.moveThrottleTimer = null;
          }
          const c = this.map.getCenter();
          const z = this.map.getZoom();
          this.lastReportedCenter = [c.lat, c.lng];
          this.lastReportedZoom = z;

          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapMoveEnd', { center: [c.lat, c.lng], zoom: z });

          setTimeout(() => {
            this.isUserInteracting = false;
          }, 150);
        });

        this.map.on('zoom', () => {
          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapZoom', this.map.getZoom());
        });

        this.map.on('zoomend', () => {
          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapZoomEnd', this.map.getZoom());
        });

        this.map.on('click', (e) => {
          this.$ownerInstance && this.$ownerInstance.callMethod('onRender_MapClick', {
            latLng: [e.latlng.lat, e.latlng.lng],
            point: { x: e.containerPoint.x, y: e.containerPoint.y }
          });
        });

        this.isReady = true;
        this.applyProps(p);

        // Invalidate size on multiple next frames to sync with Webview layout
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            if (this.map) this.map.invalidateSize(true);
          });
        }
        setTimeout(() => {
          if (this.map) this.map.invalidateSize(true);
        }, 120);
        setTimeout(() => {
          if (this.map) this.map.invalidateSize(true);
        }, 300);

        this.$ownerInstance && this.$ownerInstance.callMethod('onRender_Ready');
      } catch (err) {
        console.error('Leaflet init in renderjs error:', err);
      }
    },
    updateMapProps(newVal) {
      if (!newVal) return;
      this.cachedProps = newVal;
      if (!this.map || !this.isReady) {
        this.initLeaflet();
        return;
      }
      this.applyProps(newVal);
    },
    applyProps(p) {
      if (!this.map || !p) return;

      // Anti-feedback loop: Don't setView if the user is actively dragging/zooming or if this is an echo
      if (p.center && p.zoom !== undefined) {
        const curCenter = this.map.getCenter();
        const curZoom = this.map.getZoom();

        const isEcho =
          this.lastReportedCenter &&
          Math.abs(this.lastReportedCenter[0] - p.center[0]) < 1e-4 &&
          Math.abs(this.lastReportedCenter[1] - p.center[1]) < 1e-4 &&
          this.lastReportedZoom !== null &&
          Math.abs(this.lastReportedZoom - p.zoom) < 0.1;

        if (!this.isUserInteracting && !isEcho) {
          const centerDiff =
            Math.abs(curCenter.lat - p.center[0]) > 1e-4 ||
            Math.abs(curCenter.lng - p.center[1]) > 1e-4;
          const zoomDiff = Math.abs(curZoom - p.zoom) > 0.05;

          if (centerDiff || zoomDiff) {
            this.map.setView([p.center[0], p.center[1]], p.zoom, { animate: false });
          }
        }
      }

      // Only rebuild tile layers when tile URLs / configs actually change
      const layersToApply = (p.layers && p.layers.length > 0)
        ? p.layers
        : (p.tileUrl ? [{ url: p.tileUrl, subdomains: p.subdomains }] : []);
      const layersKey = JSON.stringify(layersToApply);
      if (this.currentLayersKey !== layersKey) {
        this.currentLayersKey = layersKey;
        this.setTileLayers(layersToApply);
      }

      // Only rebuild vector overlays when overlay data actually changes
      const overlaysToApply = {
        markers: p.markers,
        polylines: p.polylines,
        polygons: p.polygons,
        circles: p.circles,
        ...(p.overlays || {}),
      };
      const overlaysKey = JSON.stringify(overlaysToApply);
      if (this.currentOverlaysKey !== overlaysKey) {
        this.currentOverlaysKey = overlaysKey;
        this.renderOverlays(overlaysToApply);
      }
    },
    setTileLayers(layers) {
      for (const l of this.tileLayers) {
        try {
          this.map.removeLayer(l);
        } catch (e) {}
      }
      this.tileLayers = [];

      for (let i = 0; i < layers.length; i++) {
        const cfg = typeof layers[i] === 'string' ? { url: layers[i] } : layers[i];
        const subdomains = cfg.subdomains || ['a', 'b', 'c'];
        const isOverlay = (cfg.zIndex && cfg.zIndex >= 10) || (i > 0);
        const tile = L.tileLayer(cfg.url, {
          subdomains,
          opacity: cfg.opacity !== undefined ? cfg.opacity : 1,
          zIndex: cfg.zIndex || (i + 1),
          pane: isOverlay ? 'overlayTilePane' : 'tilePane',
          tileSize: 256,
        });
        tile.addTo(this.map);
        this.tileLayers.push(tile);
      }
    },
    renderOverlays(overlays) {
      if (!this.overlayGroup) return;
      this.overlayGroup.clearLayers();

      // Polygons
      if (overlays.polygons) {
        for (const poly of overlays.polygons) {
          if (!poly.latLngs || poly.latLngs.length < 3) continue;
          const lPoly = L.polygon(poly.latLngs, {
            color: poly.color || '#ef4444',
            weight: poly.width || 2,
            fillColor: poly.fillColor || '#ef4444',
            fillOpacity: poly.fillOpacity ?? 0.25,
            interactive: true,
          }).addTo(this.overlayGroup);
          if (poly.label) {
            const labelText = typeof poly.label === 'string' ? poly.label : poly.label.text;
            lPoly.bindTooltip(labelText, { permanent: true, direction: 'center', className: 'uni-overlay-label' });
          }
          lPoly.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', { type: 'polygon', data: poly });
          });
        }
      }

      // Circles
      if (overlays.circles) {
        for (const c of overlays.circles) {
          const lCircle = L.circle([c.latLng[0], c.latLng[1]], {
            radius: c.radius,
            color: c.color || '#10b981',
            weight: c.width || 2,
            fillColor: c.fillColor || c.color || '#10b981',
            fillOpacity: c.fillOpacity ?? 0.2,
            interactive: true,
          }).addTo(this.overlayGroup);
          if (c.label) {
            const labelText = typeof c.label === 'string' ? c.label : c.label.text;
            lCircle.bindTooltip(labelText, { permanent: true, direction: 'center', className: 'uni-overlay-label' });
          }
          lCircle.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', { type: 'circle', data: c });
          });
        }
      }

      // Polylines
      if (overlays.polylines) {
        for (const line of overlays.polylines) {
          if (!line.latLngs || line.latLngs.length < 2) continue;
          const lLine = L.polyline(line.latLngs, {
            color: line.color || '#3b82f6',
            weight: line.width || 4,
            opacity: line.opacity ?? 1,
            dashArray: line.dashArray ? line.dashArray.join(',') : undefined,
            interactive: true,
          }).addTo(this.overlayGroup);
          if (line.label) {
            const labelText = typeof line.label === 'string' ? line.label : line.label.text;
            lLine.bindTooltip(labelText, { permanent: true, direction: 'center', className: 'uni-overlay-label' });
          }
          lLine.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', { type: 'polyline', data: line });
          });
        }
      }

      // Markers
      if (overlays.markers) {
        for (const m of overlays.markers) {
          let icon;
          const size = m.icon && m.icon.size ? m.icon.size : [32, 32];
          const anchor = m.icon && m.icon.anchor ? m.icon.anchor : [size[0] / 2, size[1]];

          const tooltipAnchor = [size[0] / 2 - anchor[0], -anchor[1]];

          if (m.icon && m.icon.svg) {
            let svgStr = m.icon.svg.trim();
            if (svgStr.indexOf('xmlns=') === -1) {
              svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            icon = L.divIcon({
              className: 'uni-custom-svg-icon',
              html: '<div style="width:' + size[0] + 'px;height:' + size[1] + 'px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' + svgStr + '</div>',
              iconSize: size,
              iconAnchor: anchor,
              tooltipAnchor: tooltipAnchor,
            });
          } else if (m.icon && m.icon.html) {
            icon = L.divIcon({
              className: 'uni-custom-html-icon',
              html: m.icon.html,
              iconSize: size,
              iconAnchor: anchor,
              tooltipAnchor: tooltipAnchor,
            });
          } else if (m.icon && m.icon.url) {
            let finalUrl = m.icon.url;
            if (finalUrl && typeof finalUrl === 'string' && !finalUrl.startsWith('data:') && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
              // Strip leading slash so that local resources resolve relative to app bundle www root in App-Plus
              if (finalUrl.startsWith('/')) {
                finalUrl = finalUrl.slice(1);
              }
            }
            const html = '<img src="' + finalUrl + '" style="width:' + size[0] + 'px;height:' + size[1] + 'px;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />';
            icon = L.divIcon({
              className: 'uni-custom-img-icon',
              html: html,
              iconSize: size,
              iconAnchor: anchor,
              tooltipAnchor: tooltipAnchor,
            });
          } else if (m.icon && m.icon.text) {
            const fontSize = Math.round(size[0] * 0.72);
            icon = L.divIcon({
              className: 'uni-emoji-marker-icon',
              html: '<div style="font-size:' + fontSize + 'px;line-height:1;text-align:center;pointer-events:auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' + m.icon.text + '</div>',
              iconSize: size,
              iconAnchor: anchor,
              tooltipAnchor: tooltipAnchor,
            });
          } else {
            const pinColor = (m.icon && m.icon.color) ? m.icon.color : '#ef4444';
            const html = '<svg viewBox="0 0 24 32" width="' + size[0] + '" height="' + size[1] + '" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">' +
              '<path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="' + pinColor + '"/>' +
              '<circle cx="12" cy="11" r="4.5" fill="#ffffff"/>' +
              '</svg>';
            icon = L.divIcon({
              html: html,
              className: 'uni-default-pin',
              iconSize: size,
              iconAnchor: anchor,
              tooltipAnchor: tooltipAnchor,
            });
          }

          const lMarker = L.marker([m.latLng[0], m.latLng[1]], {
            icon: icon,
            interactive: true,
          }).addTo(this.overlayGroup);
          if (m.label) {
            const labelText = typeof m.label === 'string' ? m.label : m.label.text;
            const customOffset = typeof m.label === 'object' && m.label.offset ? m.label.offset : undefined;
            let offset = [0, 0];
            if (customOffset) {
              const ox = customOffset[0] || 0;
              const oy = customOffset[1] || 0;
              if (Math.abs(oy) <= 10) {
                offset = [ox, oy];
              } else {
                offset = [ox, 0];
              }
            }
            lMarker.bindTooltip(labelText, {
              permanent: true,
              direction: 'top',
              offset: offset,
              className: 'uni-overlay-label',
            });
          }
          lMarker.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            this.$ownerInstance && this.$ownerInstance.callMethod('onRender_OverlayClick', { type: 'marker', data: m });
          });
        }
      }
    }
  }
};
