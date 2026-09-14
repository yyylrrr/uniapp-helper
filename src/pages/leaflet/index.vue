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
        :polylines="activePolylines"
        :polygons="showPolygons ? samplePolygons : []"
        :circles="showCircles ? sampleCircles : []"
        :enable-cluster="enableCluster"
        :cluster-radius="clusterRadius"
        :cluster-max-zoom="17"
        :geojson="showGeoJson ? sampleGeoJson : null"
        :geojson-style="currentGeoJsonStyle"
        height="100%"
        @ready="onMapReady"
        @click="onMapClick"
        @move="onMapMove"
        @zoom="onMapZoom"
        @overlay-click="onOverlayClick"
        @cluster-click="onClusterClick"
        @geojson-click="onGeoJsonClick"
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
      <view class="section-title">点、线、面要素选择展示与自适应视野 (fitBounds)</view>
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
          <text class="toggle-text">路线/折线 ({{ activePolylines.length }})</text>
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

      <!-- Quick Preset Selection: 点 / 线 / 面 -->
      <view class="preset-mode-row" style="margin-top: 14rpx;">
        <view class="preset-chip" hover-class="btn-hover" @click="selectOnlyAndFit('markers')">
          <text class="chip-text">📍 仅选【点】并包裹</text>
        </view>
        <view class="preset-chip" hover-class="btn-hover" @click="selectOnlyAndFit('polylines')">
          <text class="chip-text">🛣️ 仅选【线】并包裹</text>
        </view>
        <view class="preset-chip" hover-class="btn-hover" @click="selectOnlyAndFit('polygons')">
          <text class="chip-text">🟦 仅选【面】并包裹</text>
        </view>
        <view class="preset-chip primary" hover-class="btn-hover" @click="selectOnlyAndFit('all')">
          <text class="chip-text">🌈 全选点线面并包裹</text>
        </view>
      </view>

      <view style="margin-top: 14rpx;">
        <view class="action-btn fit-btn full-width" hover-class="btn-hover" @click="fitCurrentlySelectedOverlays">
          <text class="action-btn-icon">🎯</text>
          <text class="action-btn-text">视野自适应包裹当前勾选要素 (fitBounds)</text>
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

    <!-- Marker Clustering Panel -->
    <view class="panel-card">
      <view class="switch-row">
        <view class="switch-label-group">
          <text class="switch-title">🧲 点聚合功能 (:enable-cluster)</text>
          <text class="switch-subtitle">视口内相近点自动合并为圆形数字气泡(挂右上角+N角标)，点击局部放大展开</text>
        </view>
        <switch
          :checked="enableCluster"
          color="#3b82f6"
          @change="toggleCluster"
        />
      </view>

      <view class="action-btn-row" style="margin-top: 16rpx;">
        <view class="action-btn primary full-width" hover-class="btn-hover" @click="generateDenseClusteredPOIs">
          <text class="action-btn-icon">⚡</text>
          <text class="action-btn-text">生成 4 组密集打卡点群 (40个点) 体验自动聚合与点击展开</text>
        </view>
      </view>

      <view style="margin-top: 14rpx; display: flex; align-items: center; justify-content: flex-start; gap: 12rpx;">
        <text style="font-size: 24rpx; color: #64748b;">聚合距离阈值:</text>
        <view
          v-for="r in [40, 60, 90]"
          :key="r"
          class="preset-chip"
          :class="{ primary: clusterRadius === r }"
          @click="clusterRadius = r"
        >
          <text class="chip-text">{{ r }}px</text>
        </view>
      </view>
    </view>

    <!-- GeoJSON Vector Layer Panel -->
    <view class="panel-card">
      <view class="switch-row">
        <view class="switch-label-group">
          <text class="switch-title">🗺️ GeoJSON 行政区划与城市边界 (:geojson)</text>
          <text class="switch-subtitle">标准 GeoJSON 数据驱动，支持多边形填充、边框色、线宽与虚线配置</text>
        </view>
        <switch
          :checked="showGeoJson"
          color="#3b82f6"
          @change="toggleGeoJson"
        />
      </view>

      <view v-if="showGeoJson" style="margin-top: 18rpx;">
        <!-- Dataset Selector -->
        <view style="display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; flex-wrap: wrap;">
          <text style="font-size: 24rpx; color: #64748b; font-weight: 600;">边界样本:</text>
          <view
            v-for="(item, idx) in sampleGeoJsonList"
            :key="idx"
            class="preset-chip"
            :class="{ primary: currentGeoJsonIndex === idx }"
            @click="currentGeoJsonIndex = idx"
          >
            <text class="chip-text">{{ item.name }}</text>
          </view>
        </view>

        <!-- Color Preset Selector -->
        <view style="display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; flex-wrap: wrap;">
          <text style="font-size: 24rpx; color: #64748b; font-weight: 600;">填充主题:</text>
          <view
            v-for="c in geoJsonColors"
            :key="c.name"
            class="preset-chip"
            :style="{
              background: selectedGeoJsonColor.name === c.name ? c.fillColor : '#f1f5f9',
              borderColor: c.color,
            }"
            @click="selectedGeoJsonColor = c"
          >
            <text class="chip-text" :style="{ color: selectedGeoJsonColor.name === c.name ? '#ffffff' : '#334155' }">
              ● {{ c.name }}
            </text>
          </view>
        </view>

        <!-- Fill Opacity & Stroke Width Controls -->
        <view style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx;">
          <view style="display: flex; align-items: center; gap: 8rpx;">
            <text style="font-size: 24rpx; color: #64748b;">透明度:</text>
            <view
              v-for="op in [0.15, 0.35, 0.6]"
              :key="op"
              class="preset-chip"
              :class="{ primary: geoJsonFillOpacity === op }"
              @click="geoJsonFillOpacity = op"
            >
              <text class="chip-text">{{ Math.round(op * 100) }}%</text>
            </view>
          </view>

          <view style="display: flex; align-items: center; gap: 8rpx;">
            <text style="font-size: 24rpx; color: #64748b;">描边粗细:</text>
            <view
              v-for="w in [1, 2, 4]"
              :key="w"
              class="preset-chip"
              :class="{ primary: geoJsonWeight === w }"
              @click="geoJsonWeight = w"
            >
              <text class="chip-text">{{ w }}px</text>
            </view>
          </view>

          <view style="display: flex; align-items: center; gap: 8rpx;">
            <text style="font-size: 24rpx; color: #64748b;">虚线边框:</text>
            <view
              class="preset-chip"
              :class="{ primary: isGeoJsonDashed }"
              @click="isGeoJsonDashed = !isGeoJsonDashed"
            >
              <text class="chip-text">{{ isGeoJsonDashed ? '虚线 (6,6)' : '实线' }}</text>
            </view>
          </view>
        </view>

        <!-- Action Button: fitBounds('geojson') -->
        <view class="action-btn-row">
          <view class="action-btn fit-btn full-width" hover-class="btn-hover" @click="fitGeoJsonBounds">
            <text class="action-btn-icon">🎯</text>
            <text class="action-btn-text">视野自适应包裹城市边界 (fitBounds('geojson'))</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Curved Travel Routes & Flowing Lines Panel -->
    <view class="panel-card">
      <view class="switch-row">
        <view class="switch-label-group">
          <text class="switch-title">✈️ 弧线旅行航线与流动虚线 (Curved & Flowing)</text>
          <text class="switch-subtitle">基于二次贝塞尔曲线的航线弧度计算，结合 CSS/Canvas 2D 蚂蚁线粒子流光动效</text>
        </view>
        <switch
          :checked="showFlightRoutes"
          color="#3b82f6"
          @change="toggleFlightRoutes"
        />
      </view>

      <view v-if="showFlightRoutes" style="margin-top: 18rpx;">
        <!-- Flowing Animation Toggle & Speed -->
        <view style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx;">
          <text style="font-size: 26rpx; color: #334155; font-weight: 600;">流光动效 (flowing):</text>
          <switch
            :checked="isFlowingActive"
            color="#06b6d4"
            @change="toggleFlowingActive"
          />
        </view>

        <!-- Curvature Preset Selector -->
        <view style="display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; flex-wrap: wrap;">
          <text style="font-size: 24rpx; color: #64748b; font-weight: 600;">航线曲率:</text>
          <view
            v-for="curv in [-0.25, 0, 0.15, 0.25, 0.4]"
            :key="curv"
            class="preset-chip"
            :class="{ primary: currentCurvature === curv }"
            @click="setCurvature(curv)"
          >
            <text class="chip-text">{{ curv === 0 ? '直线(0)' : curv > 0 ? `上弧 +${curv}` : `下弧 ${curv}` }}</text>
          </view>
        </view>

        <!-- Flow Speed Selector -->
        <view style="display: flex; align-items: center; gap: 10rpx; margin-bottom: 14rpx; flex-wrap: wrap;">
          <text style="font-size: 24rpx; color: #64748b; font-weight: 600;">流动速度:</text>
          <view
            v-for="spd in [0.5, 1, 1.8, 3]"
            :key="spd"
            class="preset-chip"
            :class="{ primary: currentFlowSpeed === spd }"
            @click="setFlowSpeed(spd)"
          >
            <text class="chip-text">{{ spd }}x 速度</text>
          </view>
        </view>

        <!-- Fit Bounds for Flight Routes -->
        <view class="action-btn-row">
          <view class="action-btn fit-btn full-width" hover-class="btn-hover" @click="fitFlightRoutesBounds">
            <text class="action-btn-icon">🎯</text>
            <text class="action-btn-text">自适应包裹弧线航线 (包含弧顶范围)</text>
          </view>
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
        <view class="action-btn primary" hover-class="btn-hover" @click="addAvatarMarker">
          <text class="action-btn-icon">👤</text>
          <text class="action-btn-text">追加头像气泡</text>
        </view>
      </view>
      <view class="action-btn-row" style="margin-top: 14rpx;">
        <view class="action-btn track-btn" hover-class="btn-hover" @click="generateScatteredTracksAndFit">
          <text class="action-btn-icon">📍</text>
          <text class="action-btn-text">生成分散足迹点并包裹(纯点)</text>
        </view>
        <view class="action-btn fit-btn" hover-class="btn-hover" @click="fitAllTrackPoints">
          <text class="action-btn-icon">🎯</text>
          <text class="action-btn-text">视野包裹足迹点 (fitBounds)</text>
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
import { generateCurvedPolyline } from '@/components/uni-leaflet';
import type {
  LatLngTuple,
  Point,
  TileLayerConfig,
  MarkerOptions,
  PolylineOptions,
  PolygonOptions,
  CircleOptions,
  OverlayClickEvent,
  GeoJsonStyleOptions,
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

// Marker Clustering
const enableCluster = ref(true);
const clusterRadius = ref(60);

// GeoJSON Feature Layers & Styling
const showGeoJson = ref(true);
const currentGeoJsonIndex = ref(0);

const sampleGeoJsonList = [
  {
    name: '北京核心二环行政区 (东城/西城)',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: '北京东城区行政区划边界',
            adcode: '110101',
            level: 'district',
            area: '41.84 km²',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [116.3985, 39.9575],
                [116.4350, 39.9560],
                [116.4420, 39.9320],
                [116.4435, 39.8960],
                [116.4180, 39.8680],
                [116.3985, 39.8700],
                [116.3985, 39.9575],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            name: '北京西城区行政区划边界',
            adcode: '110102',
            level: 'district',
            area: '50.70 km²',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [116.3985, 39.9575],
                [116.3985, 39.8700],
                [116.3450, 39.8700],
                [116.3400, 39.9050],
                [116.3480, 39.9450],
                [116.3750, 39.9580],
                [116.3985, 39.9575],
              ],
            ],
          },
        },
      ],
    },
  },
  {
    name: '朝阳奥森与 CBD 示范区',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: '奥林匹克中心区公园带',
            adcode: '110105-01',
            level: 'subdistrict',
            area: '11.59 km²',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [116.3750, 40.0150],
                [116.4100, 40.0150],
                [116.4100, 39.9700],
                [116.3750, 39.9700],
                [116.3750, 40.0150],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            name: '北京 CBD 国际商务核心区',
            adcode: '110105-02',
            level: 'subdistrict',
            area: '7.04 km²',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [116.4450, 39.9250],
                [116.4800, 39.9250],
                [116.4800, 39.8950],
                [116.4450, 39.8950],
                [116.4450, 39.9250],
              ],
            ],
          },
        },
      ],
    },
  },
];

const sampleGeoJson = computed(() => sampleGeoJsonList[currentGeoJsonIndex.value].data);

const geoJsonColors = [
  { name: '科技蓝', color: '#1d4ed8', fillColor: '#3b82f6' },
  { name: '翡翠绿', color: '#047857', fillColor: '#10b981' },
  { name: '珊瑚红', color: '#be123c', fillColor: '#f43f5e' },
  { name: '炫彩紫', color: '#6d28d9', fillColor: '#8b5cf6' },
  { name: '琥珀金', color: '#b45309', fillColor: '#f59e0b' },
];

const selectedGeoJsonColor = ref(geoJsonColors[0]);
const geoJsonFillOpacity = ref(0.25);
const geoJsonWeight = ref(2);
const isGeoJsonDashed = ref(false);

const currentGeoJsonStyle = computed<GeoJsonStyleOptions>(() => ({
  color: selectedGeoJsonColor.value.color,
  weight: geoJsonWeight.value,
  opacity: 1,
  fillColor: selectedGeoJsonColor.value.fillColor,
  fillOpacity: geoJsonFillOpacity.value,
  dashArray: isGeoJsonDashed.value ? [6, 6] : undefined,
}));

// Tianditu Token
const tiandituKey = ref('56b81006f361f6406d0e940d2f89a39c');

// Marker Icon Filter Tab
type IconTypeFilter = 'all' | 'emoji' | 'png' | 'svg_file' | 'svg_inline' | 'avatar';
const currentIconType = ref<IconTypeFilter>('all');

const iconFilterTabs = [
  { type: 'all' as IconTypeFilter, name: '全部图标', icon: '🌟' },
  { type: 'avatar' as IconTypeFilter, name: '头像气泡', icon: '👤' },
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

  // --- 5. Avatar Bubble Icons (Photo + Badge + Pulse Halo) ---
  {
    id: 'm11_avatar_heart',
    latLng: [39.9195, 116.3972],
    title: '旅行博主 小羽 (足迹打卡中)',
    icon: {
      type: 'avatar',
      url: '/static/icons/pin-purple.png',
      badgeText: '❤️',
      pulse: true,
      borderColor: '#f43f5e',
    },
    label: { text: '小羽 (❤️ 实时足迹)' },
    data: { iconType: 'avatar' },
  },
  {
    id: 'm12_avatar_crown',
    latLng: [39.9142, 116.4045],
    title: '城市探索官 Leo (VIP 打卡达人)',
    icon: {
      type: 'avatar',
      url: '/static/icons/pin-blue.png',
      badgeText: '👑',
      pulse: true,
      borderColor: '#f59e0b',
    },
    label: { text: '探索官 Leo (👑 VIP)' },
    data: { iconType: 'avatar' },
  },
  {
    id: 'm13_avatar_fire',
    latLng: [39.9080, 116.3930],
    title: '摄影达人 Mia',
    icon: {
      type: 'avatar',
      url: '/static/icons/marker-star.png',
      badgeText: '🔥',
      pulse: false,
      borderColor: '#10b981',
    },
    label: { text: '摄影达人 Mia (🔥 热门)' },
    data: { iconType: 'avatar' },
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
    dashArray: [8, 8],
    flowing: true,
    flowSpeed: 1.2,
    label: '长安街主干道 (流动虚线)',
  },
  {
    id: 'l3',
    latLngs: [
      [39.9163, 116.3972],
      [39.9928, 116.3965],
    ],
    color: '#06b6d4',
    width: 4,
    dashArray: [10, 8],
    curved: true,
    curvature: 0.25,
    flowing: true,
    flowSpeed: 1.5,
    label: '故宫至奥森公园 (弧线流光)',
  },
]);

// Flight Routes State & Computeds
const showFlightRoutes = ref(false);
const isFlowingActive = ref(true);
const currentCurvature = ref(0.25);
const currentFlowSpeed = ref(1.2);

const flightRoutePolylines = computed<PolylineOptions[]>(() => {
  return [
    {
      id: 'flight-bj-sh',
      latLngs: [
        [39.9042, 116.4074], // Beijing
        [31.2304, 121.4737], // Shanghai
      ],
      color: '#06b6d4',
      width: 4,
      curved: currentCurvature.value !== 0,
      curvature: currentCurvature.value,
      flowing: isFlowingActive.value,
      flowSpeed: currentFlowSpeed.value,
      dashArray: [10, 8],
      label: '北京-上海 (京沪航线)',
    },
    {
      id: 'flight-bj-gz',
      latLngs: [
        [39.9042, 116.4074], // Beijing
        [23.1291, 113.2644], // Guangzhou
      ],
      color: '#8b5cf6',
      width: 4,
      curved: currentCurvature.value !== 0,
      curvature: currentCurvature.value * 0.9,
      flowing: isFlowingActive.value,
      flowSpeed: currentFlowSpeed.value * 1.1,
      dashArray: [12, 8],
      label: '北京-广州 (京广航线)',
    },
    {
      id: 'flight-bj-cd',
      latLngs: [
        [39.9042, 116.4074], // Beijing
        [30.5728, 104.0668], // Chengdu
      ],
      color: '#ec4899',
      width: 4,
      curved: currentCurvature.value !== 0,
      curvature: -currentCurvature.value * 0.85,
      flowing: isFlowingActive.value,
      flowSpeed: currentFlowSpeed.value * 0.9,
      dashArray: [10, 8],
      label: '北京-成都 (京蓉航线)',
    },
    {
      id: 'flight-sh-sz',
      latLngs: [
        [31.2304, 121.4737], // Shanghai
        [22.5431, 114.0579], // Shenzhen
      ],
      color: '#10b981',
      width: 4,
      curved: currentCurvature.value !== 0,
      curvature: currentCurvature.value * 0.8,
      flowing: isFlowingActive.value,
      flowSpeed: currentFlowSpeed.value * 1.2,
      dashArray: [10, 8],
      label: '上海-深圳 (沿海航线)',
    },
  ];
});

const activePolylines = computed<PolylineOptions[]>(() => {
  const res: PolylineOptions[] = [];
  if (showPolylines.value) {
    res.push(...samplePolylines.value);
  }
  if (showFlightRoutes.value) {
    res.push(...flightRoutePolylines.value);
  }
  return res;
});

function toggleFlightRoutes() {
  showFlightRoutes.value = !showFlightRoutes.value;
  if (showFlightRoutes.value) {
    setTimeout(() => {
      fitFlightRoutesBounds();
    }, 100);
  }
}

function toggleFlowingActive() {
  isFlowingActive.value = !isFlowingActive.value;
}

function setCurvature(curv: number) {
  currentCurvature.value = curv;
}

function setFlowSpeed(spd: number) {
  currentFlowSpeed.value = spd;
}

function fitFlightRoutesBounds() {
  if (!mapRef.value || flightRoutePolylines.value.length === 0) return;
  mapRef.value.fitBounds(flightRoutePolylines.value, {
    padding: [60, 60],
    animate: true,
  });
  uni.showToast({
    title: '已聚焦包裹全国弧线航线网络',
    icon: 'none',
  });
}

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
  if (showFlightRoutes.value) count += flightRoutePolylines.value.length;
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

function addAvatarMarker() {
  const curLat = center.value[0];
  const curLng = center.value[1];
  const avatars = [
    { name: 'Alice', badge: '❤️', color: '#f43f5e', icon: '/static/icons/pin-purple.png' },
    { name: 'Bob', badge: '👑', color: '#f59e0b', icon: '/static/icons/pin-blue.png' },
    { name: 'Charlie', badge: '🔥', color: '#10b981', icon: '/static/icons/marker-star.png' },
    { name: 'Diana', badge: '⭐', color: '#8b5cf6', icon: '/static/icons/pin-red.png' },
  ];
  const sample = avatars[Math.floor(Math.random() * avatars.length)];
  const newMarker: MarkerOptions = {
    id: `avatar_${Date.now()}`,
    latLng: [
      curLat + (Math.random() - 0.5) * 0.015,
      curLng + (Math.random() - 0.5) * 0.02,
    ],
    title: `${sample.name} 的足迹打卡`,
    icon: {
      type: 'avatar',
      url: sample.icon,
      badgeText: sample.badge,
      pulse: true,
      borderColor: sample.color,
    },
    label: { text: `${sample.name} (${sample.badge})` },
    data: { iconType: 'avatar' },
  };
  dynamicMarkers.value.push(newMarker);
  uni.showToast({ title: `已追加 ${sample.name} 头像气泡`, icon: 'none' });
}

function clearAllMarkers() {
  dynamicMarkers.value = [];
  uni.showToast({ title: '已清空标记点', icon: 'none' });
}

function resetPresetMarkers() {
  dynamicMarkers.value = [...initialMarkers];
  currentIconType.value = 'all';
  uni.showToast({ title: `已重置 ${initialMarkers.length} 个示例标记`, icon: 'none' });
}

function toggleCluster(e?: any) {
  if (e && e.detail && typeof e.detail.value === 'boolean') {
    enableCluster.value = e.detail.value;
  } else {
    enableCluster.value = !enableCluster.value;
  }
}

function toggleGeoJson(e?: any) {
  if (e && e.detail && typeof e.detail.value === 'boolean') {
    showGeoJson.value = e.detail.value;
  } else {
    showGeoJson.value = !showGeoJson.value;
  }
}

function onGeoJsonClick(feature: any) {
  const name = feature?.properties?.name || 'GeoJSON 矢量要素';
  const area = feature?.properties?.area ? `(面积: ${feature.properties.area})` : '';
  lastClickedTarget.value = `GeoJSON 要素: ${name} ${area}`;
  uni.showToast({
    title: `点击: ${name}`,
    icon: 'none',
  });
}

function fitGeoJsonBounds() {
  if (!showGeoJson.value) {
    showGeoJson.value = true;
  }
  setTimeout(() => {
    mapRef.value?.fitBounds('geojson', { padding: [50, 50], animate: true });
    uni.showToast({
      title: '已自适应缩放到 GeoJSON 城市边界',
      icon: 'none',
    });
  }, 60);
}

function onClusterClick(cluster: any) {
  lastClickedTarget.value = `聚合气泡: 共合并 ${cluster.count} 个打卡点 (已自动放大展开)`;
  uni.showToast({
    title: `聚合点 (+${cluster.count}) 展开`,
    icon: 'none',
  });
}

function generateDenseClusteredPOIs() {
  const clusters = [
    { name: '王府井商业街群', center: [39.9142, 116.411], count: 12, icon: '🛍️' },
    { name: '西单大悦城打卡群', center: [39.9085, 116.373], count: 10, icon: '☕' },
    { name: '后海什刹海景区群', center: [39.9385, 116.388], count: 8, icon: '🚣' },
    { name: '三里屯时尚街区群', center: [39.9348, 116.455], count: 10, icon: '🎨' },
  ];

  const newMarkers: MarkerOptions[] = [];
  clusters.forEach((c, cIdx) => {
    for (let i = 0; i < c.count; i++) {
      const lat = c.center[0] + (Math.random() - 0.5) * 0.0035;
      const lng = c.center[1] + (Math.random() - 0.5) * 0.0045;
      newMarkers.push({
        id: `dense_${cIdx}_${i}`,
        latLng: [lat, lng],
        title: `${c.name} - 点位 #${i + 1}`,
        icon: { text: c.icon, size: [32, 32] },
        label: { text: `${c.name.slice(0, 3)} #${i + 1}` },
        data: { iconType: 'emoji' },
      });
    }
  });

  dynamicMarkers.value = newMarkers;
  showMarkers.value = true;
  enableCluster.value = true;
  currentIconType.value = 'all';

  setTimeout(() => {
    mapRef.value?.fitBounds(newMarkers, { padding: [60, 60], animate: true });
  }, 100);

  uni.showToast({
    title: `已生成 4 组密集聚合点群 (共 ${newMarkers.length} 个点)`,
    icon: 'none',
  });
}

/**
 * Selectively display Point / Line / Polygon and automatically fitBounds
 */
function selectOnlyAndFit(type: 'markers' | 'polylines' | 'polygons' | 'all') {
  if (type === 'markers') {
    showMarkers.value = true;
    showPolylines.value = false;
    showPolygons.value = false;
    showCircles.value = false;
    setTimeout(() => {
      mapRef.value?.fitBounds(filteredMarkers.value, { padding: [50, 50], animate: true });
    }, 60);
    uni.showToast({ title: '已切换为仅显示【点】，并自动聚焦包裹', icon: 'none' });
  } else if (type === 'polylines') {
    showMarkers.value = false;
    showPolylines.value = true;
    showPolygons.value = false;
    showCircles.value = false;
    setTimeout(() => {
      mapRef.value?.fitBounds(activePolylines.value, { padding: [50, 50], animate: true });
    }, 60);
    uni.showToast({ title: '已切换为仅显示【线】，并自动聚焦包裹', icon: 'none' });
  } else if (type === 'polygons') {
    showMarkers.value = false;
    showPolylines.value = false;
    showPolygons.value = true;
    showCircles.value = false;
    setTimeout(() => {
      mapRef.value?.fitBounds(samplePolygons.value, { padding: [50, 50], animate: true });
    }, 60);
    uni.showToast({ title: '已切换为仅显示【面】，并自动聚焦包裹', icon: 'none' });
  } else if (type === 'all') {
    showMarkers.value = true;
    showPolylines.value = true;
    showPolygons.value = true;
    showCircles.value = true;
    setTimeout(() => {
      fitCurrentlySelectedOverlays();
    }, 60);
    uni.showToast({ title: '已显示全部点、线、面，并自动包裹全景', icon: 'none' });
  }
}

/**
 * Auto-fit bounds to all currently selected/checked overlays (points, lines, polygons)
 */
function fitCurrentlySelectedOverlays() {
  const points: LatLngTuple[] = [];

  if (showMarkers.value) {
    for (const m of filteredMarkers.value) {
      if (m && m.latLng) points.push(m.latLng);
    }
  }
  if (showPolylines.value || showFlightRoutes.value) {
    for (const p of activePolylines.value) {
      if (p.curved) {
        points.push(...generateCurvedPolyline(p.latLngs, p.curvature ?? 0.2));
      } else if (p && p.latLngs) {
        points.push(...p.latLngs);
      }
    }
  }
  if (showPolygons.value) {
    for (const pg of samplePolygons.value) {
      if (pg && pg.latLngs) points.push(...pg.latLngs);
    }
  }
  if (showCircles.value) {
    for (const c of sampleCircles.value) {
      if (c && c.latLng) points.push(c.latLng);
    }
  }

  if (points.length === 0) {
    uni.showToast({ title: '当前未勾选任何要素，请先勾选', icon: 'none' });
    return;
  }

  mapRef.value?.fitBounds(points, { padding: [50, 50], animate: true });

  const activeNames: string[] = [];
  if (showMarkers.value) activeNames.push('点');
  if (showPolylines.value) activeNames.push('线');
  if (showPolygons.value) activeNames.push('面');
  if (showCircles.value) activeNames.push('圆');

  uni.showToast({
    title: `已包裹当前选中的[${activeNames.join('/')}]要素`,
    icon: 'none',
    duration: 1500,
  });
}

/**
 * Auto-fit map viewport to bound all markers (pure points)
 */
function fitAllTrackPoints() {
  const points: LatLngTuple[] = [];

  // 只计算并包裹点标注 (Markers / Footprints)
  for (const m of filteredMarkers.value) {
    if (m && m.latLng) points.push(m.latLng);
  }

  if (points.length === 0) {
    uni.showToast({ title: '暂无足迹点可供包裹', icon: 'none' });
    return;
  }

  // 确保点标记可见
  showMarkers.value = true;

  // Call fitBounds on UniLeafletMap instance with points only
  mapRef.value?.fitBounds(points, { padding: [40, 40], animate: true });
  uni.showToast({
    title: `已视野自适应包裹 ${points.length} 个足迹点`,
    icon: 'success',
  });
}

/**
 * Generate wide-spread footprint points across Beijing and auto fitBounds (points only, no lines)
 */
function generateScatteredTracksAndFit() {
  const tourSpots: MarkerOptions[] = [
    {
      id: `spot_tour_1_${Date.now()}`,
      latLng: [39.9998, 116.2755], // 颐和园 (西北点)
      title: '颐和园足迹',
      icon: { text: '🏯', size: [34, 34] },
      label: { text: '颐和园足迹' },
      data: { iconType: 'emoji' },
    },
    {
      id: `spot_tour_2_${Date.now()}`,
      latLng: [40.0165, 116.3888], // 奥林匹克森林公园 (北侧点)
      title: '奥森公园足迹',
      icon: { text: '🌲', size: [34, 34] },
      label: { text: '奥森公园足迹' },
      data: { iconType: 'emoji' },
    },
    {
      id: `spot_tour_3_${Date.now()}`,
      latLng: [39.9075, 116.4590], // 国贸 CBD (东侧点)
      title: '国贸CBD足迹',
      icon: { text: '🏙️', size: [34, 34] },
      label: { text: '国贸CBD足迹' },
      data: { iconType: 'emoji' },
    },
    {
      id: `spot_tour_4_${Date.now()}`,
      latLng: [39.8822, 116.4066], // 天坛 (南侧点)
      title: '天坛足迹',
      icon: { text: '⛩️', size: [34, 34] },
      label: { text: '天坛足迹' },
      data: { iconType: 'emoji' },
    },
    {
      id: `spot_tour_5_${Date.now()}`,
      latLng: [39.9163, 116.3972], // 故宫 (中心点)
      title: '故宫中心足迹',
      icon: { text: '🏛️', size: [34, 34] },
      label: { text: '故宫中心足迹' },
      data: { iconType: 'emoji' },
    },
  ];

  dynamicMarkers.value = [...tourSpots];
  currentIconType.value = 'all';

  // 只显示足迹点，隐藏折线、多边形与圆形
  showMarkers.value = true;
  showPolylines.value = false;
  showPolygons.value = false;
  showCircles.value = false;

  const trackPoints: LatLngTuple[] = tourSpots.map((s) => s.latLng);

  // Perform fitBounds to smoothly wrap all 5 points
  setTimeout(() => {
    mapRef.value?.fitBounds(trackPoints, { padding: [50, 50], animate: true });
  }, 50);

  uni.showToast({
    title: '已生成 5 个足迹点，正在自适应包裹视野...',
    icon: 'none',
    duration: 2000,
  });
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

.action-btn.track-btn {
  background: #f5f3ff;
  border: 1rpx solid #ddd6fe;
  color: #6d28d9;
  font-weight: 600;
}

.action-btn.fit-btn {
  background: #eff6ff;
  border: 1rpx solid #bfdbfe;
  color: #1d4ed8;
  font-weight: 600;
}

.action-btn.full-width {
  width: 100%;
  box-sizing: border-box;
  justify-content: center;
}

.preset-mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.preset-chip {
  flex: 1;
  min-width: 140rpx;
  background: #f1f5f9;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  padding: 12rpx 14rpx;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preset-chip:hover {
  background: #e2e8f0;
}

.preset-chip.primary {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.preset-chip.primary:hover {
  background: #dbeafe;
}

.preset-chip .chip-text {
  font-size: 22rpx;
  color: #334155;
  font-weight: 500;
}

.preset-chip.primary .chip-text {
  color: #1d4ed8;
  font-weight: 600;
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
