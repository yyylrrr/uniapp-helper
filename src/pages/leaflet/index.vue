<template>
  <view class="page-container">
    <!-- Header -->
    <view class="header-card">
      <view class="title-row">
        <text class="page-title">Uni-Leaflet 地图</text>
        <!-- #ifdef H5 -->
        <view class="platform-badge h5-badge">
          <text class="badge-dot"></text>
          <text class="badge-text">H5 (Leaflet 引擎)</text>
        </view>
        <!-- #endif -->
        <!-- #ifdef APP-PLUS -->
        <view class="platform-badge h5-badge">
          <text class="badge-dot"></text>
          <text class="badge-text">App 端 (Leaflet renderjs 引擎)</text>
        </view>
        <!-- #endif -->
        <!-- #ifdef MP -->
        <view class="platform-badge mp-badge">
          <text class="badge-dot mp-dot"></text>
          <text class="badge-text">小程序 (Canvas 2D 引擎)</text>
        </view>
        <!-- #endif -->
      </view>
      <text class="page-subtitle">支持 Emoji / PNG 图片 / SVG 矢量文件 / SVG 内联代码全端统一渲染</text>
    </view>

    <!-- Map View Area -->
    <view class="map-wrapper" style="min-height: 400px;">
      <UniLeafletMap
        ref="mapRef"
        v-model:center="center"
        v-model:zoom="zoom"
        :min-zoom="3"
        :max-zoom="18"
        :layers="activeLayers"
        :markers="showMarkers ? filteredMarkers : []"
        :polylines="showPolylines ? samplePolylines : []"
        :polygons="showPolygons ? samplePolygons : []"
        :circles="showCircles ? sampleCircles : []"
        height="100%"
        @ready="onMapReady"
        @click="onMapClick"
        @move="onMapMove"
        @zoom="onMapZoom"
        @overlay-click="onOverlayClick"
      />
    </view>

    <!-- Status & Info Panel -->
    <view class="info-card">
      <view class="info-grid">
        <view class="info-item">
          <text class="info-label">中心点经纬度</text>
          <text class="info-val">{{ center[0].toFixed(4) }}°, {{ center[1].toFixed(4) }}°</text>
        </view>
        <view class="info-item">
          <text class="info-label">缩放层级 (Zoom)</text>
          <text class="info-val highlight-val">{{ Math.round(zoom * 10) / 10 }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">当前标注要素数量</text>
          <text class="info-val highlight-green">{{ activeOverlayCount }} 个要素 ({{ filteredMarkers.length }} 点)</text>
        </view>
        <view class="info-item">
          <text class="info-label">最近点击交互</text>
          <text class="info-val highlight-orange">{{ lastClickedTarget || lastClickPos || '点击地图或标注' }}</text>
        </view>
      </view>
    </view>

    <!-- Operations Panel -->
    <view class="panel-card">
      <!-- Layer Overlay Toggle -->
      <view class="switch-row">
        <view class="switch-label-group">
          <text class="switch-title">叠加地名/路网注记图层</text>
          <text class="switch-subtitle">支持在卫星/矢量底图上叠加透明文字标注与道路线</text>
        </view>
        <switch
          :checked="showAnnotations"
          color="#3b82f6"
          @change="toggleAnnotation"
        />
      </view>

      <view class="section-title" style="margin-top: 24rpx">城市快速导航 (平滑平移)</view>
      <view class="city-chips">
        <view
          v-for="city in presetCities"
          :key="city.name"
          class="chip-btn"
          hover-class="chip-hover"
          @click="navigateToCity(city)"
        >
          <text class="chip-icon">📍</text>
          <text class="chip-text">{{ city.name }}</text>
        </view>
      </view>

      <view class="section-title" style="margin-top: 28rpx">瓦片底图源切换 (含天地图/高德/CartoDB)</view>
      
      <!-- Tianditu Token Input Bar -->
      <view class="token-bar">
        <text class="token-label">天地图 Token (tk):</text>
        <input
          v-model="tiandituKey"
          class="token-input"
          placeholder="请输入天地图开发者Key"
          @blur="updateTiandituKey"
        />
      </view>

      <view class="tile-switch-grid">
        <view
          v-for="layer in layerList"
          :key="layer.name"
          class="layer-card"
          :class="{ active: currentLayerName === layer.name }"
          hover-class="layer-hover"
          @click="selectTileLayer(layer)"
        >
          <view class="layer-header">
            <view class="layer-title-box">
              <text class="layer-tag-badge" :class="layer.type">{{ layer.source }}</text>
              <text class="layer-name">{{ layer.name }}</text>
            </view>
            <view class="tag-group">
              <text v-if="layer.hasAnnotation && showAnnotations" class="overlay-tag">
                +注记
              </text>
              <text v-if="currentLayerName === layer.name" class="active-tag">使用中</text>
            </view>
          </view>
          <text class="layer-desc">{{ layer.desc }}</text>
        </view>
      </view>
    </view>

    <!-- Vector Overlays Toggle Panel -->
    <view class="panel-card">
      <view class="section-title">点、线、面、图标与 Label 标注开关</view>
      <view class="overlay-toggles-grid">
        <view
          class="toggle-btn"
          :class="{ active: showMarkers }"
          @click="showMarkers = !showMarkers"
        >
          <text class="toggle-icon">📍</text>
          <text class="toggle-text">点图标标注 ({{ filteredMarkers.length }})</text>
        </view>
        <view
          class="toggle-btn"
          :class="{ active: showPolylines }"
          @click="showPolylines = !showPolylines"
        >
          <text class="toggle-icon">🛣️</text>
          <text class="toggle-text">路线/折线 ({{ samplePolylines.length }})</text>
        </view>
        <view
          class="toggle-btn"
          :class="{ active: showPolygons }"
          @click="showPolygons = !showPolygons"
        >
          <text class="toggle-icon">🟦</text>
          <text class="toggle-text">多边形区域 ({{ samplePolygons.length }})</text>
        </view>
        <view
          class="toggle-btn"
          :class="{ active: showCircles }"
          @click="showCircles = !showCircles"
        >
          <text class="toggle-icon">🔴</text>
          <text class="toggle-text">辐射圆形 ({{ sampleCircles.length }})</text>
        </view>
      </view>
    </view>

    <!-- Icon Type Filter Panel -->
    <view class="panel-card">
      <view class="section-title">🎨 图标类型示例快速切换 (Emoji / PNG / SVG)</view>
      <view class="icon-filter-tabs">
        <view
          v-for="tab in iconFilterTabs"
          :key="tab.type"
          class="icon-tab"
          :class="{ active: currentIconType === tab.type }"
          @click="setMarkerFilter(tab.type)"
        >
          <text class="tab-icon">{{ tab.icon }}</text>
          <text class="tab-label">{{ tab.name }}</text>
          <text class="tab-count">({{ getIconCount(tab.type) }})</text>
        </view>
      </view>
    </view>

    <!-- Dynamic API Operations Panel -->
    <view class="panel-card">
      <view class="section-title">📡 动态接口与多类型图标操作</view>
      <view class="action-btn-row">
        <view class="action-btn primary" hover-class="btn-hover" @click="fetchNearbyPlacesFromAPI">
          <text class="action-btn-icon">⚡</text>
          <text class="action-btn-text">异步加载多类型点</text>
        </view>
        <view class="action-btn png-btn" hover-class="btn-hover" @click="addPngMarker">
          <text class="action-btn-icon">🖼️</text>
          <text class="action-btn-text">追加 PNG 点</text>
        </view>
        <view class="action-btn svg-btn" hover-class="btn-hover" @click="addSvgMarker">
          <text class="action-btn-icon">📐</text>
          <text class="action-btn-text">追加 SVG 点</text>
        </view>
        <view class="action-btn emoji-btn" hover-class="btn-hover" @click="addEmojiMarker">
          <text class="action-btn-icon">😀</text>
          <text class="action-btn-text">追加 Emoji 点</text>
        </view>
      </view>
      <view class="action-btn-row" style="margin-top: 14rpx;">
        <view class="action-btn danger" hover-class="btn-hover" @click="clearAllMarkers">
          <text class="action-btn-icon">🗑️</text>
          <text class="action-btn-text">清空标记</text>
        </view>
        <view class="action-btn outline" hover-class="btn-hover" @click="resetPresetMarkers">
          <text class="action-btn-icon">🔄</text>
          <text class="action-btn-text">重置初始 10 点</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import UniLeafletMap from '@/components/uni-leaflet/UniLeafletMap.vue';
import type {
  LatLngTuple,
  Point,
  TileLayerConfig,
  MarkerOptions,
  PolylineOptions,
  PolygonOptions,
  CircleOptions,
  OverlayClickEvent,
} from '@/components/uni-leaflet/types';

const mapRef = ref<InstanceType<typeof UniLeafletMap> | null>(null);

// Initial center: Beijing Palace Museum
const center = ref<LatLngTuple>([39.9163, 116.3972]);
const zoom = ref(14);
const lastClickPos = ref('');
const lastClickedTarget = ref('');
const showAnnotations = ref(true);

// Overlays visibility toggles
const showMarkers = ref(true);
const showPolylines = ref(true);
const showPolygons = ref(true);
const showCircles = ref(true);

// Tianditu Token
const tiandituKey = ref('56b81006f361f6406d0e940d2f89a39c');

// Marker Icon Filter Tab
type IconTypeFilter = 'all' | 'emoji' | 'png' | 'svg_file' | 'svg_inline';
const currentIconType = ref<IconTypeFilter>('all');

const iconFilterTabs = [
  { type: 'all' as IconTypeFilter, name: '全部图标', icon: '🌟' },
  { type: 'emoji' as IconTypeFilter, name: 'Emoji 图标', icon: '😀' },
  { type: 'png' as IconTypeFilter, name: 'PNG 图片', icon: '🖼️' },
  { type: 'svg_file' as IconTypeFilter, name: 'SVG 文件', icon: '📐' },
  { type: 'svg_inline' as IconTypeFilter, name: 'SVG 内联代码', icon: '✨' },
];

// Initial default preset markers showcasing 4 distinct icon formats
const initialMarkers: MarkerOptions[] = [
  // --- 1. Emoji Icons ---
  {
    id: 'm1_emoji',
    latLng: [39.9163, 116.3972],
    title: '故宫博物院 (Emoji 图标)',
    icon: { text: '🏛️', size: [34, 34] },
    label: { text: '故宫博物院 (Emoji)' },
    data: { iconType: 'emoji' },
  },
  {
    id: 'm2_emoji',
    latLng: [39.9055, 116.3976],
    title: '天安门广场 (Emoji 图标)',
    icon: { text: '🚩', size: [34, 34] },
    label: { text: '天安门广场 (Emoji)' },
    data: { iconType: 'emoji' },
  },

  // --- 2. PNG Image Icons ---
  {
    id: 'm3_png',
    latLng: [39.9242, 116.3995],
    title: '景山公园万春亭 (PNG 图标)',
    icon: {
      url: '/static/icons/pin-purple.png',
      size: [32, 40],
      anchor: [16, 40],
    },
    label: { text: '景山万春亭 (PNG)' },
    data: { iconType: 'png' },
  },
  {
    id: 'm4_png',
    latLng: [39.9255, 116.3860],
    title: '北海公园白塔 (PNG 图标)',
    icon: {
      url: '/static/icons/pin-blue.png',
      size: [32, 40],
      anchor: [16, 40],
    },
    label: { text: '北海白塔 (PNG)' },
    data: { iconType: 'png' },
  },
  {
    id: 'm5_png',
    latLng: [39.9135, 116.4110],
    title: '王府井商业街 (PNG 五角星)',
    icon: {
      url: '/static/icons/marker-star.png',
      size: [32, 32],
      anchor: [16, 16],
    },
    label: { text: '王府井打卡之星 (PNG)' },
    data: { iconType: 'png' },
  },

  // --- 3. SVG File Icons ---
  {
    id: 'm6_svg',
    latLng: [39.9100, 116.3910],
    title: '中山公园摄影点 (SVG 矢量图标)',
    icon: {
      url: '/static/icons/camera.svg',
      size: [36, 36],
      anchor: [18, 36],
    },
    label: { text: '中山公园摄影点 (SVG)' },
    data: { iconType: 'svg_file' },
  },
  {
    id: 'm7_svg',
    latLng: [39.9070, 116.4020],
    title: '天安门东地铁站 (SVG 矢量图标)',
    icon: {
      url: '/static/icons/metro.svg',
      size: [36, 36],
      anchor: [18, 36],
    },
    label: { text: '天安门东站 (SVG)' },
    data: { iconType: 'svg_file' },
  },
  {
    id: 'm8_svg',
    latLng: [39.9180, 116.4080],
    title: '四季民福烤鸭店 (SVG 图标)',
    icon: {
      url: '/static/icons/restaurant.svg',
      size: [36, 36],
      anchor: [18, 36],
    },
    label: { text: '四季民福' },
    data: { iconType: 'svg_file' },
  },
  {
    id: 'm9_svg',
    latLng: [39.9085, 116.4115],
    title: '北京饭店 (SVG 图标)',
    icon: {
      url: '/static/icons/hotel.svg',
      size: [36, 36],
      anchor: [18, 36],
    },
    label: { text: '北京饭店' },
    data: { iconType: 'svg_file' },
  },

  // --- 4. SVG Inline Code (Raw SVG Markup) ---
  {
    id: 'm10_inline_svg',
    latLng: [39.9045, 116.3895],
    title: '国家大剧院 (内联 SVG 渐变徽章)',
    icon: {
      svg: `<svg viewBox="0 0 36 36" width="36" height="36">
        <defs>
          <linearGradient id="gTheater" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ec4899"/>
            <stop offset="100%" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="16" fill="url(#gTheater)" stroke="#ffffff" stroke-width="2"/>
        <text x="18" y="24" font-size="16" text-anchor="middle" fill="#ffffff">🎭</text>
      </svg>`,
      size: [36, 36],
      anchor: [18, 18],
    },
    label: { text: '国家大剧院 (内联SVG)' },
    data: { iconType: 'svg_inline' },
  },
];

// Reactive dynamic markers array
const dynamicMarkers = ref<MarkerOptions[]>([...initialMarkers]);

// Filtered markers based on current icon tab
const filteredMarkers = computed(() => {
  if (currentIconType.value === 'all') return dynamicMarkers.value;
  return dynamicMarkers.value.filter(
    (m) => m.data?.iconType === currentIconType.value
  );
});

function getIconCount(type: IconTypeFilter) {
  if (type === 'all') return dynamicMarkers.value.length;
  return dynamicMarkers.value.filter((m) => m.data?.iconType === type).length;
}

function setMarkerFilter(type: IconTypeFilter) {
  currentIconType.value = type;
  uni.showToast({
    title: `已筛选: ${iconFilterTabs.find((t) => t.type === type)?.name}`,
    icon: 'none',
    duration: 1000,
  });
}

// Sample Polylines with Labels
const samplePolylines = ref<PolylineOptions[]>([
  {
    id: 'l1',
    latLngs: [
      [39.9295, 116.3972],
      [39.9242, 116.3972],
      [39.9163, 116.3972],
      [39.9055, 116.3972],
      [39.8985, 116.3972],
    ],
    color: '#3b82f6',
    width: 5,
    label: '中轴线景观步道',
  },
  {
    id: 'l2',
    latLngs: [
      [39.9073, 116.365],
      [39.9068, 116.3976],
      [39.9065, 116.435],
    ],
    color: '#f59e0b',
    width: 4,
    dashArray: [6, 6],
    label: '长安街主干道',
  },
]);

// Sample Polygons with Labels
const samplePolygons = ref<PolygonOptions[]>([
  {
    id: 'p1',
    latLngs: [
      [39.924, 116.3915],
      [39.924, 116.4025],
      [39.9115, 116.4025],
      [39.9115, 116.3915],
    ],
    color: '#ef4444',
    fillColor: 'rgba(239, 68, 68, 0.22)',
    fillOpacity: 0.22,
    width: 2,
    label: '故宫紫禁城核心区',
  },
]);

// Sample Circles with Labels
const sampleCircles = ref<CircleOptions[]>([
  {
    id: 'c1',
    latLng: [39.9055, 116.3976],
    radius: 1000, // 1000 meters
    color: '#10b981',
    fillColor: 'rgba(16, 185, 129, 0.18)',
    fillOpacity: 0.18,
    width: 2,
    label: '1km 核心辐射圈',
  },
]);

const activeOverlayCount = computed(() => {
  let count = 0;
  if (showMarkers.value) count += filteredMarkers.value.length;
  if (showPolylines.value) count += samplePolylines.value.length;
  if (showPolygons.value) count += samplePolygons.value.length;
  if (showCircles.value) count += sampleCircles.value.length;
  return count;
});

// --- Dynamic API Simulation Methods ---

/**
 * Simulate fetching nearby POIs with mixed PNG, SVG, and Emoji icon formats
 */
function fetchNearbyPlacesFromAPI() {
  uni.showLoading({ title: '请求接口数据中...' });

  setTimeout(() => {
    uni.hideLoading();

    const curLat = center.value[0];
    const curLng = center.value[1];

    const mockPoiList: MarkerOptions[] = [
      {
        id: `api_png_${Date.now()}_1`,
        latLng: [curLat + (Math.random() - 0.5) * 0.02, curLng + (Math.random() - 0.5) * 0.03],
        title: '红点标位 (PNG)',
        icon: { url: '/static/icons/pin-red.png', size: [32, 40], anchor: [16, 40] },
        label: { text: '红点标位 (PNG)', offset: [0, -32] },
        data: { iconType: 'png', source: 'api' },
      },
      {
        id: `api_png_${Date.now()}_2`,
        latLng: [curLat + (Math.random() - 0.5) * 0.02, curLng + (Math.random() - 0.5) * 0.03],
        title: '绿点标位 (PNG)',
        icon: { url: '/static/icons/pin-green.png', size: [32, 40], anchor: [16, 40] },
        label: { text: '绿点标位 (PNG)', offset: [0, -32] },
        data: { iconType: 'png', source: 'api' },
      },
      {
        id: `api_svg_${Date.now()}_1`,
        latLng: [curLat + (Math.random() - 0.5) * 0.02, curLng + (Math.random() - 0.5) * 0.03],
        title: '古建地标 (SVG)',
        icon: { url: '/static/icons/landmark.svg', size: [36, 36], anchor: [18, 36] },
        label: { text: '古建地标 (SVG)', offset: [0, -30] },
        data: { iconType: 'svg_file', source: 'api' },
      },
      {
        id: `api_svg_${Date.now()}_2`,
        latLng: [curLat + (Math.random() - 0.5) * 0.02, curLng + (Math.random() - 0.5) * 0.03],
        title: '精选美食 (SVG)',
        icon: { url: '/static/icons/restaurant.svg', size: [36, 36], anchor: [18, 36] },
        label: { text: '精选美食 (SVG)', offset: [0, -30] },
        data: { iconType: 'svg_file', source: 'api' },
      },
      {
        id: `api_emoji_${Date.now()}_1`,
        latLng: [curLat + (Math.random() - 0.5) * 0.02, curLng + (Math.random() - 0.5) * 0.03],
        title: '星巴克咖啡 (Emoji)',
        icon: { text: '☕', size: [32, 32] },
        label: { text: '星巴克咖啡 (Emoji)', offset: [0, -26] },
        data: { iconType: 'emoji', source: 'api' },
      },
      {
        id: `api_emoji_${Date.now()}_2`,
        latLng: [curLat + (Math.random() - 0.5) * 0.02, curLng + (Math.random() - 0.5) * 0.03],
        title: '智能停车场 (Emoji)',
        icon: { text: '🚗', size: [32, 32] },
        label: { text: '智能停车场 (Emoji)', offset: [0, -26] },
        data: { iconType: 'emoji', source: 'api' },
      },
    ];

    dynamicMarkers.value = [...mockPoiList];
    currentIconType.value = 'all';

    uni.showToast({
      title: `接口成功加载 ${mockPoiList.length} 个混合图标点`,
      icon: 'success',
    });
  }, 400);
}

/**
 * Add a dynamic PNG marker
 */
function addPngMarker() {
  const curLat = center.value[0];
  const curLng = center.value[1];
  const lat = curLat + (Math.random() - 0.5) * 0.015;
  const lng = curLng + (Math.random() - 0.5) * 0.02;
  const id = `marker_png_${Date.now()}`;
  const idx = dynamicMarkers.value.length + 1;

  const pngUrls = [
    '/static/icons/pin-blue.png',
    '/static/icons/pin-red.png',
    '/static/icons/pin-green.png',
    '/static/icons/pin-purple.png',
    '/static/icons/marker-star.png',
  ];
  const chosenUrl = pngUrls[idx % pngUrls.length];

  const newMarker: MarkerOptions = {
    id,
    latLng: [lat, lng],
    title: `新增 PNG 点位 #${idx}`,
    icon: {
      url: chosenUrl,
      size: chosenUrl.includes('star') ? [32, 32] : [32, 40],
      anchor: chosenUrl.includes('star') ? [16, 16] : [16, 40],
    },
    label: { text: `新增 PNG #${idx}`, offset: [0, -32] },
    data: { iconType: 'png' },
  };

  dynamicMarkers.value.push(newMarker);
  uni.showToast({ title: `已追加 PNG 图标 #${idx}`, icon: 'none' });
}

/**
 * Add a dynamic SVG marker
 */
function addSvgMarker() {
  const curLat = center.value[0];
  const curLng = center.value[1];
  const lat = curLat + (Math.random() - 0.5) * 0.015;
  const lng = curLng + (Math.random() - 0.5) * 0.02;
  const id = `marker_svg_${Date.now()}`;
  const idx = dynamicMarkers.value.length + 1;

  const svgUrls = [
    '/static/icons/landmark.svg',
    '/static/icons/camera.svg',
    '/static/icons/restaurant.svg',
    '/static/icons/metro.svg',
    '/static/icons/hotel.svg',
  ];
  const chosenSvg = svgUrls[idx % svgUrls.length];

  const newMarker: MarkerOptions = {
    id,
    latLng: [lat, lng],
    title: `新增 SVG 矢量点位 #${idx}`,
    icon: {
      url: chosenSvg,
      size: [36, 36],
      anchor: [18, 36],
    },
    label: { text: `新增 SVG #${idx}`, offset: [0, -30] },
    data: { iconType: 'svg_file' },
  };

  dynamicMarkers.value.push(newMarker);
  uni.showToast({ title: `已追加 SVG 矢量图标 #${idx}`, icon: 'none' });
}

/**
 * Add a dynamic Emoji marker
 */
function addEmojiMarker() {
  const curLat = center.value[0];
  const curLng = center.value[1];
  const lat = curLat + (Math.random() - 0.5) * 0.015;
  const lng = curLng + (Math.random() - 0.5) * 0.02;
  const id = `marker_emoji_${Date.now()}`;
  const idx = dynamicMarkers.value.length + 1;

  const emojis = ['🌟', '🎯', '🚩', '🎡', '🎨', '🎪', '🍦', '🎁'];
  const chosenEmoji = emojis[idx % emojis.length];

  const newMarker: MarkerOptions = {
    id,
    latLng: [lat, lng],
    title: `新增 Emoji 点位 #${idx}`,
    icon: { text: chosenEmoji, size: [32, 32] },
    label: { text: `新增 Emoji #${idx}`, offset: [0, -26] },
    data: { iconType: 'emoji' },
  };

  dynamicMarkers.value.push(newMarker);
  uni.showToast({ title: `已追加 Emoji 图标 #${idx}`, icon: 'none' });
}

function clearAllMarkers() {
  dynamicMarkers.value = [];
  uni.showToast({ title: '已清空标记点', icon: 'none' });
}

function resetPresetMarkers() {
  dynamicMarkers.value = [...initialMarkers];
  currentIconType.value = 'all';
  uni.showToast({ title: '已重置 10 个示例标记', icon: 'none' });
}

// Preset tile layers definition
interface PresetLayerDef {
  name: string;
  source: string;
  type: string;
  desc: string;
  hasAnnotation: boolean;
  getLayers: (tk: string, withAnnotation: boolean) => TileLayerConfig[];
}

const presetLayers: PresetLayerDef[] = [
  {
    name: '高德 · 道路矢量',
    source: '高德',
    type: 'gaode',
    desc: '国内高速访问，标准道路及建筑矢量底图',
    hasAnnotation: false,
    getLayers: () => [
      {
        url: 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7',
        subdomains: ['1', '2', '3', '4'],
      },
    ],
  },
  {
    name: '天地图 · 卫星影像',
    source: '天地图',
    type: 'tianditu',
    desc: '国家高分卫星遥感影像 + (可选)地名道路影像注记 (img_w + cia_w)',
    hasAnnotation: true,
    getLayers: (tk, withAnnotation) => {
      const subdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];
      const base: TileLayerConfig = {
        id: 'tianditu_img',
        url: `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`,
        subdomains,
      };
      if (!withAnnotation) return [base];
      const annotation: TileLayerConfig = {
        id: 'tianditu_cia',
        url: `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`,
        subdomains,
        zIndex: 10,
      };
      return [base, annotation];
    },
  },
  {
    name: '高德 · 卫星影像',
    source: '高德',
    type: 'gaode',
    desc: '国内高速高分辨率航拍卫星图 + (可选)高德路网注记图层',
    hasAnnotation: true,
    getLayers: (_, withAnnotation) => {
      const subdomains = ['1', '2', '3', '4'];
      const base: TileLayerConfig = {
        id: 'gaode_sat',
        url: 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=6',
        subdomains,
      };
      if (!withAnnotation) return [base];
      const annotation: TileLayerConfig = {
        id: 'gaode_road',
        url: 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=8',
        subdomains,
        zIndex: 10,
      };
      return [base, annotation];
    },
  },
  {
    name: '天地图 · 矢量地图',
    source: '天地图',
    type: 'tianditu',
    desc: '国家标准矢量底图 + (可选)行政区划道路矢量注记 (vec_w + cva_w)',
    hasAnnotation: true,
    getLayers: (tk, withAnnotation) => {
      const subdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];
      const base: TileLayerConfig = {
        id: 'tianditu_vec',
        url: `https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`,
        subdomains,
      };
      if (!withAnnotation) return [base];
      const annotation: TileLayerConfig = {
        id: 'tianditu_cva',
        url: `https://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`,
        subdomains,
        zIndex: 10,
      };
      return [base, annotation];
    },
  },
  {
    name: 'CartoDB Positron',
    source: 'CartoDB',
    type: 'carto',
    desc: '浅色淡雅极简底图',
    hasAnnotation: false,
    getLayers: () => [
      {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
      },
    ],
  },
  {
    name: 'CartoDB Dark',
    source: 'CartoDB',
    type: 'carto',
    desc: '暗黑极客夜间模式',
    hasAnnotation: false,
    getLayers: () => [
      {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
      },
    ],
  },
  {
    name: 'OpenStreetMap',
    source: 'OSM',
    type: 'osm',
    desc: '国际通用开源街道地图',
    hasAnnotation: false,
    getLayers: () => [
      {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
      },
    ],
  },
];

const layerList = presetLayers;
const currentLayerName = ref('高德 · 道路矢量');

const activeLayers = computed<TileLayerConfig[]>(() => {
  const target = presetLayers.find((l) => l.name === currentLayerName.value);
  if (!target) return [];
  return target.getLayers(tiandituKey.value, showAnnotations.value);
});

// Preset cities
const presetCities = [
  { name: '北京 (故宫示范区)', center: [39.9163, 116.3972] as LatLngTuple, zoom: 14 },
  { name: '上海', center: [31.2304, 121.4737] as LatLngTuple, zoom: 13 },
  { name: '深圳', center: [22.5431, 114.0579] as LatLngTuple, zoom: 13 },
  { name: '杭州', center: [30.2741, 120.1551] as LatLngTuple, zoom: 13 },
  { name: '广州', center: [23.1291, 113.2644] as LatLngTuple, zoom: 13 },
  { name: '成都', center: [30.5728, 104.0668] as LatLngTuple, zoom: 13 },
];

function onMapReady() {
  console.log('UniLeafletMap is ready!');
}

function onMapClick(e: { latLng: LatLngTuple; point: Point }) {
  lastClickPos.value = `地图坐标: ${e.latLng[0].toFixed(4)}, ${e.latLng[1].toFixed(4)}`;
  lastClickedTarget.value = '';
}

function onOverlayClick(e: OverlayClickEvent) {
  const title = (e.data as any).title || (e.data as any).label || (e.data as any).id;
  const labelText = typeof title === 'object' ? title.text : title;
  const typeMap: Record<string, string> = {
    marker: '点图标',
    polyline: '折线',
    polygon: '多边形',
    circle: '圆形',
  };
  lastClickedTarget.value = `点击了${typeMap[e.type] || '标注'}: ${labelText}`;
  uni.showToast({
    title: `${typeMap[e.type] || '要素'}: ${labelText}`,
    icon: 'none',
    duration: 1500,
  });
}

function onMapMove(e: { center: LatLngTuple; zoom: number }) {
  center.value = e.center;
}

function onMapZoom(z: number) {
  zoom.value = z;
}

function navigateToCity(city: (typeof presetCities)[0]) {
  center.value = city.center;
  zoom.value = city.zoom;
  if (mapRef.value) {
    mapRef.value.panTo(city.center, 500);
    mapRef.value.setZoom(city.zoom);
  }
}

function selectTileLayer(layer: PresetLayerDef) {
  currentLayerName.value = layer.name;
  if (mapRef.value) {
    mapRef.value.setLayers(layer.getLayers(tiandituKey.value, showAnnotations.value));
  }
}

function toggleAnnotation(e: any) {
  showAnnotations.value = e.detail.value;
  if (mapRef.value) {
    mapRef.value.setLayers(activeLayers.value);
  }
}

function updateTiandituKey() {
  if (mapRef.value) {
    mapRef.value.setLayers(activeLayers.value);
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f4f6f9;
  padding: 24rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.header-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1e293b;
}

.page-subtitle {
  font-size: 24rpx;
  color: #64748b;
}

.platform-badge {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 18rpx;
  border-radius: 30rpx;
}

.h5-badge {
  background: #eff6ff;
  border: 1rpx solid #bfdbfe;
}

.mp-badge {
  background: #f0fdf4;
  border: 1rpx solid #bbf7d0;
}

.badge-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #3b82f6;
}

.mp-dot {
  background: #10b981;
}

.badge-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #1e293b;
}

/* Map area */
.map-wrapper {
  height: 580rpx;
  width: 100%;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.08);
  border: 2rpx solid rgba(0, 0, 0, 0.04);
}

/* Info card */
.info-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}

.info-item {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  padding: 16rpx 20rpx;
  border-radius: 14rpx;
  border: 1rpx solid #e2e8f0;
}

.info-label {
  font-size: 22rpx;
  color: #64748b;
  margin-bottom: 6rpx;
}

.info-val {
  font-size: 26rpx;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.highlight-val {
  color: #3b82f6;
}

.highlight-green {
  color: #10b981;
}

.highlight-orange {
  color: #ea580c;
}

/* Operations Panel */
.panel-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.collapse-arrow {
  font-size: 24rpx;
  color: #64748b;
}

/* Icon filter tabs */
.icon-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.icon-tab {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #f1f5f9;
  padding: 12rpx 20rpx;
  border-radius: 30rpx;
  border: 1.5rpx solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-tab.active {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 2rpx 8rpx rgba(59, 130, 246, 0.18);
}

.tab-icon {
  font-size: 24rpx;
}

.tab-label {
  font-size: 22rpx;
  font-weight: 600;
  color: #475569;
}

.icon-tab.active .tab-label {
  color: #2563eb;
}

.tab-count {
  font-size: 20rpx;
  color: #94a3b8;
}

.icon-tab.active .tab-count {
  color: #3b82f6;
}

/* Action button rows */
.action-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 18rpx 20rpx;
  border-radius: 14rpx;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: #3b82f6;
  color: #ffffff;
}

.action-btn.png-btn {
  background: #fdf4ff;
  border: 1rpx solid #f5d0fe;
  color: #86198f;
}

.action-btn.svg-btn {
  background: #ecfeff;
  border: 1rpx solid #a5f3fc;
  color: #0e7490;
}

.action-btn.emoji-btn {
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  color: #92400e;
}

.action-btn.danger {
  background: #fef2f2;
  border: 1rpx solid #fecaca;
  color: #b91c1c;
}

.action-btn.outline {
  background: #f8fafc;
  border: 1rpx solid #cbd5e1;
  color: #475569;
}

.action-btn-icon {
  font-size: 24rpx;
}

.action-btn-text {
  font-size: 24rpx;
  font-weight: 600;
}

/* Code examples box */
.code-examples-box {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.code-card {
  background: #1e293b;
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
  overflow-x: auto;
}

.code-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
  border-bottom: 1rpx solid #334155;
  padding-bottom: 8rpx;
}

.code-type-badge {
  font-size: 20rpx;
  font-weight: 700;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.code-type-badge.emoji {
  background: #fef3c7;
  color: #92400e;
}

.code-type-badge.png {
  background: #f5d0fe;
  color: #701a75;
}

.code-type-badge.svg {
  background: #a5f3fc;
  color: #155e75;
}

.code-type-badge.inline-svg {
  background: #fbcfe8;
  color: #831843;
}

.code-desc {
  font-size: 18rpx;
  color: #94a3b8;
}

.code-content {
  display: flex;
  flex-direction: column;
}

.code-line-block {
  font-size: 20rpx;
  color: #38bdf8;
  font-family: monospace;
  white-space: pre;
  line-height: 1.5;
}

.overlay-toggles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 20rpx;
  background: #f1f5f9;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
}

.toggle-icon {
  font-size: 28rpx;
}

.toggle-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #475569;
}

.toggle-btn.active .toggle-text {
  color: #2563eb;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0fdf4;
  border: 1rpx solid #bbf7d0;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
}

.switch-label-group {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.switch-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #166534;
}

.switch-subtitle {
  font-size: 22rpx;
  color: #15803d;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16rpx;
}

.token-bar {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  padding: 12rpx 18rpx;
  margin-bottom: 18rpx;
  gap: 12rpx;
}

.token-label {
  font-size: 22rpx;
  color: #475569;
  white-space: nowrap;
  font-weight: 500;
}

.token-input {
  flex: 1;
  font-size: 22rpx;
  color: #0f172a;
}

.city-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.chip-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #f1f5f9;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  border: 1rpx solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip-hover {
  background: #e2e8f0;
  transform: translateY(-2rpx);
}

.chip-icon {
  font-size: 24rpx;
}

.chip-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #334155;
}

.tile-switch-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14rpx;
}

.layer-card {
  display: flex;
  flex-direction: column;
  padding: 20rpx 24rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  border: 2rpx solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-hover {
  background: #f1f5f9;
}

.layer-card.active {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.15);
}

.layer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6rpx;
}

.layer-title-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.tag-group {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.layer-tag-badge {
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 600;
}

.layer-tag-badge.tianditu {
  background: #fef3c7;
  color: #b45309;
}

.layer-tag-badge.gaode {
  background: #e0f2fe;
  color: #0369a1;
}

.layer-tag-badge.carto {
  background: #f3e8ff;
  color: #7e22ce;
}

.layer-tag-badge.osm {
  background: #dcfce7;
  color: #15803d;
}

.layer-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1e293b;
}

.layer-card.active .layer-name {
  color: #2563eb;
}

.overlay-tag {
  font-size: 20rpx;
  font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 4rpx 10rpx;
  border-radius: 20rpx;
}

.active-tag {
  font-size: 20rpx;
  font-weight: 600;
  color: #2563eb;
  background: #dbeafe;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.layer-desc {
  font-size: 22rpx;
  color: #64748b;
}
</style>
