<template>
  <view
    class="uni-leaflet-wrapper"
    :style="{ width: props.width, height: props.height }"
    @wheel.prevent.stop="handleWheel"
    @mousewheel.prevent.stop="handleWheel"
  >
    <!-- #ifdef H5 -->
    <div ref="h5ContainerRef" class="uni-leaflet-h5-container"></div>
    <!-- #endif -->

    <!-- #ifdef APP-PLUS -->
    <view
      :id="appMapId"
      class="uni-leaflet-h5-container"
      :change:prop="leafletRender.updateMapProps"
      :prop="mapPropsPayload"
    ></view>
    <!-- #endif -->

    <!-- #ifdef MP -->
    <canvas
      type="2d"
      :id="canvasId"
      :canvas-id="canvasId"
      class="uni-leaflet-canvas"
      disable-scroll="true"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
      @wheel.prevent.stop="handleWheel"
      @mousewheel.prevent.stop="handleWheel"
    ></canvas>
    <!-- #endif -->

    <!-- Floating Zoom & Action Controls for H5 and App-Plus (Mini-Program renders natively on Canvas 2D) -->
    <!-- #ifndef MP -->
    <view v-if="props.showControls" class="uni-leaflet-controls">
      <view class="control-btn" hover-class="btn-hover" @click.stop="handleZoomIn">
        <text class="btn-text">+</text>
      </view>
      <view class="control-divider"></view>
      <view class="control-btn" hover-class="btn-hover" @click.stop="handleZoomOut">
        <text class="btn-text">-</text>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script lang="ts">
export default {
  methods: {
    onRender_MapMove(this: any, val: any) {
      const center = val?.center || val;
      const zoom = val?.zoom;
      if (center) {
        this.$emit('update:center', center);
        this.$emit('move', { center, zoom });
      }
    },
    onRender_MapMoveEnd(this: any, val: any) {
      const center = val?.center || val;
      const zoom = val?.zoom;
      if (center) {
        this.$emit('update:center', center);
        this.$emit('moveend', { center, zoom });
      }
    },
    onRender_MapZoom(this: any, z: any) {
      this.$emit('update:zoom', z);
      this.$emit('zoom', z);
    },
    onRender_MapZoomEnd(this: any, z: any) {
      this.$emit('update:zoom', z);
      this.$emit('zoomend', z);
    },
    onRender_MapClick(this: any, val: any) {
      const latLng = val?.latLng || val;
      const point = val?.point || { x: 0, y: 0 };
      this.$emit('click', { latLng, point });
    },
    onRender_OverlayClick(this: any, val: any) {
      this.$emit('overlay-click', val);
      if (val && val.type === 'marker') this.$emit('marker-click', val.data);
      if (val && val.type === 'polyline') this.$emit('polyline-click', val.data);
      if (val && val.type === 'polygon') this.$emit('polygon-click', val.data);
      if (val && val.type === 'circle') this.$emit('circle-click', val.data);
    },
    onRender_Ready(this: any) {
      this.$emit('ready', this);
    },
  },
};
</script>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  getCurrentInstance,
  watch,
  type PropType,
} from 'vue';
import type {
  IMapEngine,
  LatLngTuple,
  Point,
  TileLayerConfig,
  MarkerOptions,
  PolylineOptions,
  PolygonOptions,
  CircleOptions,
  MapOverlays,
  OverlayClickEvent,
} from './types';
import { createMapEngine } from './engine/factory';

const props = defineProps({
  center: {
    type: Array as unknown as PropType<LatLngTuple>,
    default: () => [39.9042, 116.4074],
  },
  zoom: {
    type: Number,
    default: 13,
  },
  minZoom: {
    type: Number,
    default: 3,
  },
  maxZoom: {
    type: Number,
    default: 18,
  },
  tileUrl: {
    type: String,
    default: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  subdomains: {
    type: Array as PropType<string[]>,
    default: () => ['a', 'b', 'c'],
  },
  layers: {
    type: Array as PropType<Array<string | TileLayerConfig>>,
    default: () => undefined,
  },
  markers: {
    type: Array as PropType<MarkerOptions[]>,
    default: () => undefined,
  },
  polylines: {
    type: Array as PropType<PolylineOptions[]>,
    default: () => undefined,
  },
  polygons: {
    type: Array as PropType<PolygonOptions[]>,
    default: () => undefined,
  },
  circles: {
    type: Array as PropType<CircleOptions[]>,
    default: () => undefined,
  },
  overlays: {
    type: Object as PropType<MapOverlays>,
    default: () => undefined,
  },
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '100%',
  },
  showControls: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits<{
  (e: 'update:center', val: LatLngTuple): void;
  (e: 'update:zoom', val: number): void;
  (e: 'ready', engine: IMapEngine): void;
  (e: 'move', val: { center: LatLngTuple; zoom: number }): void;
  (e: 'moveend', val: { center: LatLngTuple; zoom: number }): void;
  (e: 'zoom', val: number): void;
  (e: 'zoomend', val: number): void;
  (e: 'click', val: { latLng: LatLngTuple; point: Point }): void;
  (e: 'marker-click', val: MarkerOptions): void;
  (e: 'polyline-click', val: PolylineOptions): void;
  (e: 'polygon-click', val: PolygonOptions): void;
  (e: 'circle-click', val: CircleOptions): void;
  (e: 'overlay-click', val: OverlayClickEvent): void;
}>();

const canvasId = `uni_leaflet_canvas_${Math.random().toString(36).slice(2, 9)}`;
const appMapId = `uni_leaflet_app_${Math.random().toString(36).slice(2, 9)}`;
const instance = getCurrentInstance();
const h5ContainerRef = ref<HTMLElement | null>(null);

// Unified Engine Instance
let engine: IMapEngine | null = null;
let isInternalUpdating = false;

// Compute payload for renderjs on App-Plus
const mapPropsPayload = computed(() => ({
  appMapId,
  center: props.center,
  zoom: props.zoom,
  minZoom: props.minZoom,
  maxZoom: props.maxZoom,
  tileUrl: props.tileUrl,
  subdomains: props.subdomains,
  layers: props.layers,
  markers: props.markers,
  polylines: props.polylines,
  polygons: props.polygons,
  circles: props.circles,
  overlays: props.overlays,
}));

// Touch & Mouse Wheel handlers for Canvas/Mini-program
function handleTouchStart(e: any) {
  if (engine && 'handleTouchStart' in engine) {
    (engine as any).handleTouchStart(e);
  }
}

function handleTouchMove(e: any) {
  if (engine && 'handleTouchMove' in engine) {
    (engine as any).handleTouchMove(e);
  }
}

function handleTouchEnd(e: any) {
  if (engine && 'handleTouchEnd' in engine) {
    (engine as any).handleTouchEnd(e);
  }
}

function handleWheel(e: any) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  if (engine && 'handleWheel' in engine) {
    (engine as any).handleWheel(e);
  }
}

// Unified Zoom Controls
function handleZoomIn() {
  if (engine) {
    engine.zoomIn();
  } else {
    const curZoom = props.zoom;
    const nextZoom = Math.min(props.maxZoom, Math.round(curZoom + 1));
    emit('update:zoom', nextZoom);
    emit('zoom', nextZoom);
  }
}

function handleZoomOut() {
  if (engine) {
    engine.zoomOut();
  } else {
    const curZoom = props.zoom;
    const nextZoom = Math.max(props.minZoom, Math.round(curZoom - 1));
    emit('update:zoom', nextZoom);
    emit('zoom', nextZoom);
  }
}

// Unified Watchers
watch(
  () => props.center,
  (newCenter) => {
    if (!newCenter || isInternalUpdating || !engine) return;
    const curCenter = engine.getCenter();
    if (
      Math.abs(curCenter[0] - newCenter[0]) > 1e-6 ||
      Math.abs(curCenter[1] - newCenter[1]) > 1e-6
    ) {
      engine.setCenter(newCenter);
    }
  },
  { deep: true }
);

watch(
  () => props.zoom,
  (newZoom) => {
    if (newZoom === undefined || isInternalUpdating || !engine) return;
    if (Math.abs(engine.getZoom() - newZoom) > 0.01) {
      engine.setZoom(newZoom);
    }
  }
);

watch(
  () => props.layers,
  (newLayers) => {
    if (newLayers && engine) {
      engine.setLayers(newLayers);
    }
  },
  { deep: true }
);

watch(
  [() => props.tileUrl, () => props.subdomains],
  ([newUrl, newSubdomains]) => {
    if (!newUrl || !engine || props.layers) return;
    engine.setTileUrl(newUrl, newSubdomains as string[]);
  },
  { deep: true }
);

watch(
  () => props.showControls,
  (newVal) => {
    if (engine && typeof (engine as any).setShowControls === 'function') {
      (engine as any).setShowControls(newVal);
    }
  }
);

// Overlays Watchers
function syncCombinedOverlays() {
  if (!engine) return;
  const combined: MapOverlays = {
    ...(props.overlays || {}),
  };
  if (props.markers !== undefined) combined.markers = props.markers;
  if (props.polylines !== undefined) combined.polylines = props.polylines;
  if (props.polygons !== undefined) combined.polygons = props.polygons;
  if (props.circles !== undefined) combined.circles = props.circles;
  engine.setOverlays(combined);
}

watch(
  [
    () => props.overlays,
    () => props.markers,
    () => props.polylines,
    () => props.polygons,
    () => props.circles,
  ],
  () => {
    syncCombinedOverlays();
  },
  { deep: true }
);

// Map Event dispatching (shared across H5, App renderjs, Canvas)
function onMapMove(centerOrPayload: any, zoom?: number) {
  let center: LatLngTuple;
  let z: number;
  if (Array.isArray(centerOrPayload)) {
    center = centerOrPayload as LatLngTuple;
    z = zoom ?? props.zoom;
  } else if (centerOrPayload && centerOrPayload.center) {
    center = centerOrPayload.center;
    z = centerOrPayload.zoom ?? props.zoom;
  } else {
    return;
  }
  isInternalUpdating = true;
  emit('update:center', center);
  emit('update:zoom', z);
  emit('move', { center, zoom: z });
  setTimeout(() => {
    isInternalUpdating = false;
  }, 0);
}

function onMapMoveEnd(centerOrPayload: any, zoom?: number) {
  let center: LatLngTuple;
  let z: number;
  if (Array.isArray(centerOrPayload)) {
    center = centerOrPayload as LatLngTuple;
    z = zoom ?? props.zoom;
  } else if (centerOrPayload && centerOrPayload.center) {
    center = centerOrPayload.center;
    z = centerOrPayload.zoom ?? props.zoom;
  } else {
    return;
  }
  isInternalUpdating = true;
  emit('update:center', center);
  emit('update:zoom', z);
  emit('moveend', { center, zoom: z });
  setTimeout(() => {
    isInternalUpdating = false;
  }, 50);
}

function onMapZoom(zoom: number) {
  isInternalUpdating = true;
  emit('update:zoom', zoom);
  emit('zoom', zoom);
  setTimeout(() => {
    isInternalUpdating = false;
  }, 0);
}

function onMapZoomEnd(zoom: number) {
  isInternalUpdating = true;
  emit('update:zoom', zoom);
  emit('zoomend', zoom);
  setTimeout(() => {
    isInternalUpdating = false;
  }, 50);
}

function onMapClick(latLngOrPayload: any, point?: Point) {
  let latLng: LatLngTuple;
  let pt: Point;
  if (Array.isArray(latLngOrPayload)) {
    latLng = latLngOrPayload as LatLngTuple;
    pt = point || { x: 0, y: 0 };
  } else if (latLngOrPayload && latLngOrPayload.latLng) {
    latLng = latLngOrPayload.latLng;
    pt = latLngOrPayload.point || { x: 0, y: 0 };
  } else {
    return;
  }
  emit('click', { latLng, point: pt });
}

function onOverlayClick(event: OverlayClickEvent) {
  emit('overlay-click', event);
  if (event.type === 'marker') emit('marker-click', event.data as MarkerOptions);
  if (event.type === 'polyline') emit('polyline-click', event.data as PolylineOptions);
  if (event.type === 'polygon') emit('polygon-click', event.data as PolygonOptions);
  if (event.type === 'circle') emit('circle-click', event.data as CircleOptions);
}

// Handler when renderjs is ready on App-Plus
function onRenderjsReady() {
  console.log('App renderjs Leaflet map is ready');
}

// Lifecycle Hooks
onMounted(async () => {
  const initialOverlays: MapOverlays = {
    ...(props.overlays || {}),
  };
  if (props.markers) initialOverlays.markers = props.markers;
  if (props.polylines) initialOverlays.polylines = props.polylines;
  if (props.polygons) initialOverlays.polygons = props.polygons;
  if (props.circles) initialOverlays.circles = props.circles;

  const commonOptions = {
    center: props.center,
    zoom: props.zoom,
    minZoom: props.minZoom,
    maxZoom: props.maxZoom,
    tileUrl: props.tileUrl,
    subdomains: props.subdomains,
    layers: props.layers,
    overlays: initialOverlays,
    showControls: props.showControls,
    onMove: onMapMove,
    onMoveEnd: onMapMoveEnd,
    onZoom: onMapZoom,
    onZoomEnd: onMapZoomEnd,
    onClick: onMapClick,
    onOverlayClick: onOverlayClick,
  };

  // #ifdef H5
  if (h5ContainerRef.value) {
    engine = await createMapEngine({
      ...commonOptions,
      container: h5ContainerRef.value,
    });
    emit('ready', engine);
  }
  // #endif

  // #ifdef MP
  const setupCanvas = async (data: any) => {
    const canvas = data.node;
    const ctx = canvas.getContext('2d');
    const width = data.width || 300;
    const height = data.height || 300;
    let dpr = 1;
    try {
      dpr = uni.getSystemInfoSync().pixelRatio || 1;
    } catch (e) {}

    engine = await createMapEngine({
      ...commonOptions,
      canvas,
      ctx,
      width,
      height,
      dpr,
    });

    emit('ready', engine);
  };

  const initCanvas = (retryCount = 0) => {
    const comp = instance?.proxy || (instance as any);
    const query = uni.createSelectorQuery().in(comp);
    (query.select('#' + canvasId) as any)
      .fields({ node: true, size: true })
      .exec(async (res: any) => {
        const data = Array.isArray(res) ? res[0] : res;
        if (!data || !data.node) {
          const fallbackQuery = uni.createSelectorQuery().in(comp);
          (fallbackQuery.select('.uni-leaflet-canvas') as any)
            .fields({ node: true, size: true })
            .exec(async (fbRes: any) => {
              const fbData = Array.isArray(fbRes) ? fbRes[0] : fbRes;
              if (fbData && fbData.node) {
                await setupCanvas(fbData);
              } else if (retryCount < 5) {
                setTimeout(() => initCanvas(retryCount + 1), 80);
              }
            });
          return;
        }
        await setupCanvas(data);
      });
  };

  setTimeout(() => initCanvas(0), 50);
  // #endif
});

onUnmounted(() => {
  engine?.destroy();
  engine = null;
});


// Unified Exposed methods
defineExpose({
  setCenter(center: LatLngTuple, animate = true) {
    engine?.setCenter(center, animate);
  },
  setZoom(zoom: number) {
    engine?.setZoom(zoom);
  },
  zoomIn() {
    engine?.zoomIn();
  },
  zoomOut() {
    engine?.zoomOut();
  },
  panTo(center: LatLngTuple, duration = 300) {
    engine?.panTo(center, duration);
  },
  setTileUrl(url: string, subdomains?: string[]) {
    engine?.setTileUrl(url, subdomains);
  },
  setLayers(layers: Array<string | TileLayerConfig>) {
    engine?.setLayers(layers);
  },
  setOverlays(overlays: MapOverlays) {
    engine?.setOverlays(overlays);
  },
  setMarkers(markers: MarkerOptions[]) {
    engine?.setMarkers(markers);
  },
  setPolylines(polylines: PolylineOptions[]) {
    engine?.setPolylines(polylines);
  },
  setPolygons(polygons: PolygonOptions[]) {
    engine?.setPolygons(polygons);
  },
  setCircles(circles: CircleOptions[]) {
    engine?.setCircles(circles);
  },
  clearOverlays() {
    engine?.clearOverlays();
  },
  resize(width?: number, height?: number) {
    engine?.resize(width, height);
  },
  getCenter(): LatLngTuple {
    return engine ? engine.getCenter() : props.center;
  },
  getZoom(): number {
    return engine ? engine.getZoom() : props.zoom;
  },
  getNativeInstance(): any {
    return engine && typeof engine.getNativeInstance === 'function'
      ? engine.getNativeInstance()
      : null;
  },
});
</script>

<!-- #ifdef APP-PLUS -->
<script module="leafletRender" lang="renderjs" src="./app-render.js"></script>
<!-- #endif -->

<style scoped>
.uni-leaflet-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f2efe9;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  overscroll-behavior: contain;
}

.uni-leaflet-h5-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.uni-leaflet-canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
  touch-action: none;
  overscroll-behavior: contain;
}

.uni-leaflet-controls {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  z-index: 9999 !important;
  display: flex;
  flex-direction: column;
  background: #ffffff !important;
  background-color: #ffffff !important;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15), 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
  border: 1rpx solid #e2e8f0;
  overflow: hidden;
  pointer-events: auto;
  width: 72rpx;
}

.control-btn {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 40rpx;
  font-weight: bold;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #ffffff !important;
  transition: all 0.15s ease;
}

.btn-hover {
  background-color: #f1f5f9 !important;
}

.btn-text {
  font-size: 40rpx;
  font-weight: bold;
  color: #334155;
  line-height: 72rpx;
  text-align: center;
}

.control-divider {
  width: 72rpx;
  height: 1rpx;
  background-color: #e2e8f0;
}
</style>

<style>
/* #ifndef MP */
@import 'leaflet/dist/leaflet.css';
/* #endif */

/* Global Leaflet Tooltip Styling */
.leaflet-tooltip.uni-overlay-label {
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
</style>
