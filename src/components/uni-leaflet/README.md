# uni-leaflet

🚀 跨端、高性能的 Uni-App (Vue 3 + TypeScript) 地图组件。

在 **H5 端** 与 **App 端 (APP-PLUS)** 自动加载成熟强大的 **Leaflet.js** 生态（App 端基于 `renderjs` 独立视图层驱动与手势防抖锁）；在 **微信小程序端** 自动无缝切换为纯原生 **Canvas 2D** 瓦片与矢量渲染引擎。一套代码，三端极致体验！

> 📖 **完整使用文档与进阶教程请访问：[uni-leaflet 官方文档](https://jike.dev/posts/uni-leaflet-doc)**

---

## ✨ 核心特性

- 🌐 **一套代码，跨端自适应**：
  - **H5 端**：采用标准 Leaflet.js DOM 渲染，支持完整 GIS 坐标变换与图层生态。
  - **App 端 (iOS / Android)**：采用 Leaflet.js + Uni-App `renderjs` 架构，配合**手势互斥锁（Anti-Feedback Loop）**与**图层增量 Diff 缓存**，彻底杜绝手势抖动与白屏闪烁，体验媲美原生。
  - **微信小程序端**：采用底层 Canvas 2D 高性能离屏/视口瓦片调度，支持 DPR 高分屏自适应，内置 Canvas 原生矢量缩放控件（零 DOM 遮挡）。
- 🫧 **高性能海量点聚合 (Marker Clustering)**：
  - 支持屏幕像素距离阈值自适应网格聚类，动态渲染精致圆形数字气泡徽标。
  - 点击聚合点自动局部平滑缩放并展开下钻，超过最大缩放层级自动散开为独立散点。
- 👤 **精美头像/照片气泡与脉冲光晕动效 (Avatar Marker Bubbles)**：
  - 内置开箱即用的头像气泡模板 (`type: 'avatar'`)，支持圆形头像裁剪、自定义边框色与线宽。
  - 支持右上角自定义 Emoji 或文字角标 (`badgeText` / `badgeColor`，如 `'❤️'`, `'VIP'`, `'👑'`)。
  - 支持呼吸心跳脉冲光晕微动效 (`pulse: true`)，全端流畅硬件加速渲染。
- ✈️ **二次贝塞尔弧线旅行航线与粒子流光动效 (Curved Routes & Flowing Dashlines)**：
  - 路线支持开启贝塞尔平滑弧线 (`curved: true`)，自动计算旅行航线/航迹的大圆拱起曲率。
  - 支持从起点向终点持续流动的虚线粒子流光动效 (`flowing: true`)，H5/App 端 GPU CSS 关键帧加速，小程序端 Canvas 2D 高效补帧。
- 🌐 **GeoJSON 矢量图层全端跨端渲染**：
  - 支持标准 GeoJSON (FeatureCollection / Feature / Point / LineString / Polygon / MultiPolygon)。
  - 微信小程序 Canvas 2D 与 H5 / App Leaflet 端全功能对齐，支持动态响应式更新、样式函数与要素点击事件。
- 🎯 **智能视野自适应包裹 (Auto fitBounds)**：
  - 一键计算四至范围并平滑缓动平移缩放至最佳视口，支持设置内边距 (`padding`) 与最大层级 (`maxZoom`)。
  - 支持一键快捷包裹全部要素 (`'all'`)、点 (`'markers'`)、线 (`'polylines'`)、面 (`'polygons'`)、行政区划 (`'geojson'`) 或任意自定义足迹坐标集合。
- 🎨 **丰富多样的图标样式支持 (Marker Icons)**：
  - **Emoji 字符图标**：免网络请求，轻量生动（如 `🏛️`, `🚩`, `☕`）。
  - **PNG / JPG / 本地图片 / 网络 URL**：支持本地 `/static/icons/xxx.png` 相对路径、网络图片或 Base64 Data URI。
  - **SVG 矢量文件**：支持引用 `.svg` 静态文件，无损缩放，高分屏超清晰。
  - **SVG 内联代码**：支持直接传入 `<svg>...</svg>` XML 字符串，支持动态渐变（Gradient）、自定义矢量图案与阴影。
  - **默认矢量 Pin**：内置优雅水滴 Pin，支持自定义主题填充色 (`color`)。
- 🗺️ **多源底图即开即用**：
  - **高德地图 (AutoNavi)**：道路矢量、卫星影像、路网注记（免 Token 极速加载）。
  - **天地图 (Tianditu)**：矢量/影像/地形底图 + 透明地名道路注记图层叠加（WMTS 标准）。
  - **OpenStreetMap / CartoDB**：浅色/深色极简底图。
- 📑 **多图层叠加与混合渲染**：支持卫星影像底图 + 透明地名道路注记图层叠加（如天地图 `img_w + cia_w`、高德 `style=6 + style=8`）。
- 📍 **完整矢量要素与 Label 气泡标注**：
  - **点与图标 (Markers)**：支持自定义尺寸 `size`、精准锚点 `anchor` 与永久/动态悬浮 Label。
  - **折线路线 (Polylines)**：支持实线、虚线 (`dashArray`)、颜色、线宽及中点 Label 标注。
  - **多边形区域 (Polygons)**：支持半透明填充、边框色及几何质心居中 Label 标注。
  - **辐射圆形 (Circles)**：基于米制半径换算像素，支持居中 Label 标注。
- 👆 **全手势与交互体验**：
  - 单指拖拽平移、双指多点缩放（Pinch Zoom）、双击居中放大、平滑动画平移 (`panTo`)。
  - **PC 端 / 开发者工具鼠标滚轮精准缩放**：以鼠标光标为锚点（Pivot Point），并自动阻止外层页面联动滚动。
- ⚡ **动态响应式驱动**：深度响应 Vue 3 响应式数据变化，支持接口异步请求后直接更新、追加或清空标注要素。
- 🛡️ **TypeScript 严格类型支持**：内置完整的类型声明定义。

---

## 📱 平台支持

| 平台 | 渲染引擎 | 底层机制 | 状态 |
| :--- | :--- | :--- | :---: |
| **H5 (Web / Mobile Browser)** | Leaflet.js | 标准 DOM / SVG / Canvas | ✅ 完美支持 |
| **App (iOS / Android)** | Leaflet.js | `renderjs` 独立 Webview 视图层 + 手势防抖锁 | ✅ 完美支持 |
| **微信小程序 (MP-WEIXIN)** | Canvas 2D Engine | 原生 Canvas 2D + 视口瓦片调度 | ✅ 完美支持 |

---

## 📦 安装

```bash
# npm
npm install uni-leaflet leaflet

# pnpm
pnpm add uni-leaflet leaflet

# yarn
yarn add uni-leaflet leaflet
```

---

## 🚀 快速上手

### 1. 基础用法 (单文件组件内局部引入)

```vue
<template>
  <view class="map-container">
    <UniLeafletMap
      v-model:center="center"
      v-model:zoom="zoom"
      :tile-url="tileUrl"
      :subdomains="subdomains"
      height="600rpx"
      @click="onMapClick"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UniLeafletMap } from 'uni-leaflet';
import type { LatLngTuple } from 'uni-leaflet';

const center = ref<LatLngTuple>([39.9042, 116.4074]); // 北京
const zoom = ref(13);

// 高德地图道路矢量切片（免 Token，极速加载）
const tileUrl = ref('https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7');
const subdomains = ref(['1', '2', '3', '4']);

function onMapClick(e: any) {
  console.log('点击坐标:', e.latLng);
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 600rpx;
}
</style>
```

---

### 2. 全局注册 (`main.ts`)

```typescript
import { createSSRApp } from 'vue';
import App from './App.vue';
import UniLeaflet from 'uni-leaflet';

export function createApp() {
  const app = createSSRApp(App);
  app.use(UniLeaflet); // 全局注册 <UniLeafletMap> 组件
  return { app };
}
```

---

### 3. 多图层叠加 (例如：天地图卫星影像 + 文字地名注记)

```vue
<template>
  <UniLeafletMap
    :center="[39.9163, 116.3972]"
    :zoom="13"
    :layers="layers"
    height="100vh"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UniLeafletMap } from 'uni-leaflet';
import type { TileLayerConfig } from 'uni-leaflet';

const myTiandituToken = 'YOUR_TIANDITU_TOKEN';

const layers = ref<TileLayerConfig[]>([
  // 1. 底层：天地图卫星影像底图 (img_w)
  {
    id: 'img',
    url: `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${myTiandituToken}`,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
  },
  // 2. 顶层：天地图文字地名注记 (cia_w - 透明 PNG)
  {
    id: 'cia',
    url: `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${myTiandituToken}`,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    zIndex: 10,
  },
]);
</script>
```

---

### 4. 点图标 (Emoji / PNG / SVG 文件 / SVG 内联代码) 及矢量要素

```vue
<template>
  <UniLeafletMap
    ref="mapRef"
    :center="[39.9163, 116.3972]"
    :zoom="14"
    :markers="markers"
    :polylines="polylines"
    :polygons="polygons"
    :circles="circles"
    @overlay-click="onOverlayClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UniLeafletMap } from 'uni-leaflet';
import type {
  MarkerOptions,
  PolylineOptions,
  PolygonOptions,
  CircleOptions,
  OverlayClickEvent,
} from 'uni-leaflet';

// 1. 点标注 (支持 Emoji / PNG 图片 / SVG 矢量文件 / SVG 内联代码)
const markers = ref<MarkerOptions[]>([
  // A. Emoji 字符图标
  {
    id: 'm1',
    latLng: [39.9163, 116.3972],
    title: '故宫博物院',
    icon: { text: '🏛️', size: [34, 34] },
    label: { text: '故宫博物院 (Emoji)', offset: [0, -28] },
  },

  // B. PNG 图片图标 (支持 static 相对路径、网络 URL 或 Base64)
  {
    id: 'm2',
    latLng: [39.9242, 116.3995],
    title: '景山公园万春亭',
    icon: {
      url: '/static/icons/pin-purple.png',
      size: [32, 40],
      anchor: [16, 40], // 底部尖端对齐
    },
    label: { text: '景山公园万春亭 (PNG)', offset: [0, -32] },
  },

  // C. SVG 矢量文件图标 (无损缩放，高分屏超清晰)
  {
    id: 'm3',
    latLng: [39.9100, 116.3910],
    title: '中山公园摄影打卡点',
    icon: {
      url: '/static/icons/camera.svg',
      size: [36, 36],
      anchor: [18, 36],
    },
    label: { text: '摄影打卡点 (SVG)', offset: [0, -30] },
  },

  // D. SVG 内联代码 (直接传入 SVG 标签字符串，支持动态渐变与任意矢量图形)
  {
    id: 'm4',
    latLng: [39.9045, 116.3895],
    title: '国家大剧院',
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
      anchor: [18, 18], // 中心对齐
    },
    label: { text: '国家大剧院 (内联SVG)', offset: [0, -26] },
  },
  // E. 头像/照片气泡 (开箱即用头像气泡模板，带角标与心跳光晕动效)
  {
    id: 'm5_avatar',
    latLng: [39.9195, 116.3972],
    title: '旅行博主 小羽',
    icon: {
      type: 'avatar',
      url: '/static/icons/pin-purple.png',
      size: [32, 32],         // 默认与其它点状要素一致 [32, 32]，亦可自定义如 [48, 48]
      badgeText: '❤️',        // 角标 Emoji 或文字
      pulse: true,            // 呼吸脉冲光晕微动效
      borderColor: '#f43f5e', // 外边框颜色
    },
    label: { text: '小羽 (❤️ 实时足迹)' },
  },
]);

// 2. 路线折线 (支持弧线旅行航线、流动虚线动效与中点 Label)
const polylines = ref<PolylineOptions[]>([
  {
    id: 'l1',
    latLngs: [
      [39.9295, 116.3972],
      [39.9163, 116.3972],
      [39.8985, 116.3972],
    ],
    color: '#3b82f6',
    width: 5,
    label: '中轴线景观路线',
  },
  {
    id: 'l2',
    latLngs: [
      [39.9042, 116.4074], // 北京
      [31.2304, 121.4737], // 上海
    ],
    color: '#06b6d4',
    width: 4,
    curved: true,        // 开启二次贝塞尔弧线
    curvature: 0.25,     // 弧线曲率 (正数上弧，负数下弧)
    flowing: true,       // 开启粒子流光/流动蚂蚁线
    flowSpeed: 1.5,      // 流动速度
    dashArray: [10, 8],  // 虚线分段
    label: '京沪航线 (弧线流光)',
  },
]);

// 3. 多边形区域 (带质心 Label)
const polygons = ref<PolygonOptions[]>([
  {
    id: 'p1',
    latLngs: [
      [39.9240, 116.3915],
      [39.9240, 116.4025],
      [39.9115, 116.4025],
      [39.9115, 116.3915],
    ],
    color: '#ef4444',
    fillColor: 'rgba(239, 68, 68, 0.22)',
    label: '故宫紫禁城核心区',
  },
]);

// 4. 圆形辐射范围 (米制半径)
const circles = ref<CircleOptions[]>([
  {
    id: 'c1',
    latLng: [39.9055, 116.3976],
    radius: 1000, // 1000 米
    color: '#10b981',
    fillColor: 'rgba(16, 185, 129, 0.18)',
    label: '1km 核心辐射圈',
  },
]);

function onOverlayClick(e: OverlayClickEvent) {
  console.log('点击了要素:', e.type, e.data);
}
</script>
```

---

### 5. 海量点聚合 (Marker Clustering)

当页面存在成百上千个点要素时，开启 `enable-cluster` 可大幅提升渲染性能并避免视觉杂乱。聚合气泡不仅支持自适应计算数量，还支持点击局部展开下钻：

```vue
<template>
  <UniLeafletMap
    :center="[39.9042, 116.4074]"
    :zoom="12"
    :markers="markers"
    :enable-cluster="true"
    :cluster-radius="60"
    :cluster-max-zoom="17"
    @cluster-click="onClusterClick"
    @marker-click="onMarkerClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UniLeafletMap } from 'uni-leaflet';
import type { MarkerOptions, ClusterGroup } from 'uni-leaflet';

const markers = ref<MarkerOptions[]>([
  // 传入数十至成千上万个 Marker 均可流畅运行
  { id: 'p1', latLng: [39.9042, 116.4074], title: '站点 1' },
  { id: 'p2', latLng: [39.9055, 116.4085], title: '站点 2' },
  { id: 'p3', latLng: [39.9080, 116.4110], title: '站点 3' },
]);

function onClusterClick(cluster: ClusterGroup) {
  console.log('点击了聚合气泡，包含点数:', cluster.count, '范围:', cluster.bounds);
}

function onMarkerClick(marker: MarkerOptions) {
  console.log('点击了独立点:', marker.title);
}
</script>
```

---

### 6. GeoJSON 矢量图层与行政区划边界

支持直接载入中国行政区划、省市区边界或自定义地理要素 GeoJSON。全端（H5 / App / 微信小程序）无缝支持，支持动态样式函数与点击事件：

```vue
<template>
  <UniLeafletMap
    ref="mapRef"
    :geojson="districtGeoJson"
    :geojson-style="getDistrictStyle"
    @geojson-click="onGeoJsonClick"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { UniLeafletMap } from 'uni-leaflet';
import type { GeoJsonStyleOptions } from 'uni-leaflet';

const mapRef = ref<InstanceType<typeof UniLeafletMap> | null>(null);
const districtGeoJson = ref<any>(null);

// 动态自定义样式配置或样式函数
function getDistrictStyle(feature: any): GeoJsonStyleOptions {
  const isSelected = feature.properties?.name === '朝阳区';
  return {
    color: isSelected ? '#ef4444' : '#3b82f6',
    weight: isSelected ? 3 : 1.5,
    fillColor: isSelected ? '#ef4444' : '#60a5fa',
    fillOpacity: isSelected ? 0.35 : 0.12,
  };
}

function onGeoJsonClick(feature: any) {
  uni.showToast({
    title: `选中区域: ${feature.properties?.name || '未知区域'}`,
    icon: 'none',
  });
}

onMounted(async () => {
  // 模拟异步拉取行政区划 GeoJSON 数据
  // const res = await uni.request({ url: 'https://geo.datav.aliyun.com/areas_v3/bound/110000_full.json' });
  // districtGeoJson.value = res.data;
  // 载入完成后一键自适应缩放以包裹整个行政边界：
  // mapRef.value?.fitBounds('geojson', { padding: [40, 40] });
});
</script>
```

---

## 📖 API 参考

### Props

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `v-model:center` | `[number, number]` | `[39.9042, 116.4074]` | 地图中心点经纬度 `[纬度, 经度]` |
| `v-model:zoom` | `number` | `13` | 地图缩放级别 |
| `min-zoom` | `number` | `3` | 最小缩放层级 |
| `max-zoom` | `number` | `18` | 最大缩放层级 |
| `tile-url` | `string` | OSM URL | 单图层瓦片模板地址 |
| `subdomains` | `string[]` | `['a', 'b', 'c']` | 瓦片子域名轮换配置 |
| `layers` | `TileLayerConfig[]` | `undefined` | 多图层叠加配置数组（按顺序自底向上叠加） |
| `markers` | `MarkerOptions[]` | `[]` | 点标注数组 |
| `polylines` | `PolylineOptions[]` | `[]` | 折线路线数组 |
| `polygons` | `PolygonOptions[]` | `[]` | 多边形面数组 |
| `circles` | `CircleOptions[]` | `[]` | 圆形范围数组 |
| `overlays` | `MapOverlays` | `undefined` | 综合覆盖物对象 |
| `geojson` | `any` | `null` | 标准 GeoJSON 数据对象 (支持 FeatureCollection / Feature / 几何对象)，自动渲染城市或行政区边界 |
| `geojson-style` | `GeoJsonStyleOptions \| ((feature: any) => GeoJsonStyleOptions)` | `undefined` | GeoJSON 矢量样式配置 (可设置描边色 `color`、线宽 `weight`、填充色 `fillColor`、填充透明度 `fillOpacity`、虚线 `dashArray` 等) |
| `enable-cluster` | `boolean` | `false` | 是否开启点聚合功能。开启后在当前缩放级别下像素距离接近的点自动合并为圆形数字气泡 |
| `cluster-radius` | `number` | `60` | 点聚合的屏幕像素距离阈值 (px) |
| `cluster-max-zoom` | `number` | `18` | 最大聚合层级，超过此缩放层级不再聚合，显示为独立散点 |
| `cluster-options` | `ClusterOptions` | `undefined` | 高级点聚合配置对象 (包含 `radius`, `maxZoom`, `zoomOnClick` 等) |
| `width` | `string` | `'100%'` | 地图宽度 |
| `height` | `string` | `'100%'` | 地图高度 |
| `show-controls` | `boolean` | `true` | 是否显示右上方缩放控件按钮（H5/App 为悬浮组件，小程序为 Canvas 2D 顶层渲染） |

---

### MarkerIconOptions (图标详细配置)

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `type` | `'default' \| 'image' \| 'emoji' \| 'svg' \| 'html' \| 'avatar'` | `'default'` | 图标模板类型。设置为 `'avatar'` 时自动启用头像/照片气泡快捷模板 |
| `url` | `string` | `undefined` | 图片/头像缩略图路径、网络 URL 或 Base64 Data URI，如 `'/static/icons/pin-blue.png'` |
| `text` | `string` | `undefined` | Emoji 字符或文字图标，如 `'🏛️'`, `'🚩'`, `'☕'` |
| `svg` | `string` | `undefined` | 原始 SVG XML 字符串，支持动态渐变与任意矢量图形，如 `'<svg viewBox="0 0 36 36">...</svg>'` |
| `html` | `string` | `undefined` | 自定义 HTML 结构 (仅 H5 与 App renderjs 生效) |
| `color` | `string` | `'#ef4444'` | 默认矢量 Pin 图钉的主题填充色 |
| `size` | `[number, number]` | `[32, 32]` | 图标渲染尺寸 `[宽, 高]` (px)，气泡头像默认也与其它点状要素一致为 `[32, 32]` |
| `anchor` | `[number, number]` | 居中或底部 | 图标锚点 `[x, y]` |
| `badgeText` | `string` | `undefined` | 头像气泡右上角角标文本或 Emoji，如 `'❤️'`, `'VIP'`, `'👑'` |
| `badgeColor` | `string` | `'#ffffff'` (白底) | 角标背景填充色，默认采用精致白底，也可自定义设置 |
| `pulse` | `boolean` | `false` | 头像气泡是否开启呼吸心跳脉冲光晕微动效 |
| `pulseColor` | `string` | 与 `borderColor` 一致 | 脉冲光晕波纹颜色 |
| `borderColor` | `string` | `'#3b82f6'` | 头像气泡外圆环边框颜色 |
| `borderWidth` | `number` | `3` | 头像气泡外圆环边框宽度 (px) |

---

### PolylineOptions (折线路线配置)

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string \| number` | `undefined` | 路线唯一标识 |
| `latLngs` | `LatLngTuple[]` | **必填** | 折线坐标点数组 `[[lat, lng], ...]` |
| `color` | `string` | `'#3b82f6'` | 路线颜色 |
| `width` | `number` | `4` | 路线线宽 (px) |
| `opacity` | `number` | `1.0` | 线条透明度 (0 ~ 1) |
| `dashArray` | `number[]` | `undefined` | 虚线分段配置，例如 `[10, 8]` |
| `dashOffset` | `number` | `0` | 静态虚线偏移量 |
| `curved` | `boolean` | `false` | 是否开启二次贝塞尔平滑弧线（旅行航线/航迹线） |
| `curvature` | `number` | `0.2` | 弧线曲率系数（正数向左/上一侧拱起，负数向右/下一侧拱起） |
| `flowing` | `boolean` | `false` | 是否开启粒子流光/虚线流动动效 |
| `flowSpeed` | `number` | `1.0` | 流动速度倍率（数值越大流动越快，负数反向流动） |
| `label` | `string \| MarkerLabelOptions` | `undefined` | 路线中点徽标文字配置 |

---

### PolygonOptions (多边形面配置)

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string \| number` | `undefined` | 多边形唯一标识 |
| `latLngs` | `LatLngTuple[]` | **必填** | 外轮廓顶点坐标数组 `[[lat, lng], ...]` |
| `color` | `string` | `'#3b82f6'` | 边界线条颜色 |
| `width` | `number` | `2` | 边界线宽 (px) |
| `fillColor` | `string` | `'#3b82f6'` | 填充色 (支持十六进制、`rgba(...)`) |
| `fillOpacity` | `number` | `0.2` | 填充透明度 (0 ~ 1) |
| `label` | `string \| MarkerLabelOptions` | `undefined` | 几何质心中心徽标文字配置 |

---

### CircleOptions (圆形范围配置)

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string \| number` | `undefined` | 圆形唯一标识 |
| `latLng` | `LatLngTuple` | **必填** | 圆心坐标 `[lat, lng]` |
| `radius` | `number` | **必填** | 真实地理半径 (单位：米) |
| `color` | `string` | `'#10b981'` | 边框线条颜色 |
| `width` | `number` | `2` | 边框线宽 (px) |
| `fillColor` | `string` | `'#10b981'` | 填充色 |
| `fillOpacity` | `number` | `0.2` | 填充透明度 (0 ~ 1) |
| `label` | `string \| MarkerLabelOptions` | `undefined` | 圆心徽标文字配置 |

---

### ClusterOptions (海量点聚合高级配置)

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `enable` | `boolean` | `true` | 是否启用点聚合 |
| `clusterRadius` | `number` | `60` | 点聚合的屏幕像素网格半径阈值 (px) |
| `clusterMaxZoom` | `number` | `17` | 最大聚合缩放级别，达到或超过该层级自动展开为单点 |

---

### GeoJsonStyleOptions (GeoJSON 样式配置)

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `color` | `string` | `'#3b82f6'` | 矢量边框描边颜色 |
| `weight` | `number` | `2` | 边框线宽 (px) |
| `opacity` | `number` | `0.8` | 边框透明度 |
| `fillColor` | `string` | `'#3b82f6'` | 面要素填充颜色 |
| `fillOpacity` | `number` | `0.15` | 面要素填充透明度 |
| `dashArray` | `number[]` | `undefined` | 虚线线型配置，例如 `[6, 6]` |

---

### Events

| 事件名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `@ready` | `(engine: IMapEngine) => void` | 地图引擎初始化完成时触发 |
| `@click` | `({ latLng, point }) => void` | 点击地图空白区域时触发 |
| `@move` | `({ center, zoom }) => void` | 地图平移漫游中持续触发 |
| `@moveend` | `({ center, zoom }) => void` | 地图平移结束时触发 |
| `@zoom` | `(zoom: number) => void` | 地图缩放中持续触发 |
| `@zoomend` | `(zoom: number) => void` | 地图缩放结束时触发 |
| `@overlay-click` | `(event: OverlayClickEvent) => void` | 点击任意点、线、面、圆要素时触发 |
| `@marker-click` | `(marker: MarkerOptions) => void` | 点击点图标时触发 |
| `@cluster-click` | `(cluster: ClusterGroup) => void` | 点击聚合气泡时触发 (默认自动缩放并局部展开包裹聚合点) |
| `@geojson-click` | `(feature: any) => void` | 点击 GeoJSON 矢量要素时触发 |
| `@polyline-click`| `(polyline: PolylineOptions) => void`| 点击折线时触发 |
| `@polygon-click` | `(polygon: PolygonOptions) => void` | 点击多边形时触发 |
| `@circle-click`  | `(circle: CircleOptions) => void`  | 点击圆形时触发 |

---

### Methods (通过 `ref` 获取实例)

| 方法名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `setCenter` | `(center: LatLngTuple, animate?: boolean)` | 设置地图中心点 |
| `setZoom` | `(zoom: number)` | 设置缩放层级 |
| `zoomIn` | `()` | 放大一级 |
| `zoomOut` | `()` | 缩小一级 |
| `panTo` | `(center: LatLngTuple, duration?: number)` | 平滑缓动平移至指定坐标 |
| `fitBounds` | `(bounds: LatLngBoundsExpression \| LatLngTuple[] \| MapBounds, options?: { padding?: [number, number]; maxZoom?: number; animate?: boolean })` | 自动缩放视野以包裹指定坐标点/足迹点集合，支持设置内边距与最大缩放层级 |
| `setTileUrl` | `(url: string, subdomains?: string[])` | 切换单底图源 |
| `setLayers` | `(layers: TileLayerConfig[])` | 动态切换多图层源 |
| `setMarkers` | `(markers: MarkerOptions[])` | 动态更新点标注 |
| `setPolylines`| `(polylines: PolylineOptions[])` | 动态更新折线 |
| `setPolygons` | `(polygons: PolygonOptions[])` | 动态更新多边形 |
| `setCircles`  | `(circles: CircleOptions[])` | 动态更新圆形 |
| `setGeoJSON`  | `(data: any, style?: GeoJsonStyle)` | 动态更新/替换 GeoJSON 矢量图层数据与样式 |
| `clearOverlays`| `()` | 清空所有覆盖物与矢量图层 |
| `resize` | `(width?: number, height?: number)` | 重新计算视口尺寸与 DPR 适配 |
| `getCenter` | `()` | 获取当前中心点 `[lat, lng]` |
| `getZoom` | `()` | 获取当前缩放层级 |
| `getNativeInstance` | `()` | 获取底层原生实例（H5/App 为 Leaflet `L.map`，小程序为 `canvas` 节点） |

#### 🎯 自动视野缩放包裹指定要素 (fitBounds 示例)

```vue
<template>
  <UniLeafletMap
    ref="mapRef"
    :markers="markers"
    :polylines="polylines"
    :polygons="polygons"
    :geojson="cityGeoJson"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UniLeafletMap from '@/components/uni-leaflet/UniLeafletMap.vue';

const mapRef = ref<InstanceType<typeof UniLeafletMap> | null>(null);

// 1. 快捷包裹【城市行政区划 GeoJSON 边界】(传入 'geojson' 或直接传入 GeoJSON 数据)
mapRef.value?.fitBounds('geojson', { padding: [50, 50] });

// 2. 快捷包裹【点】(传入 'markers' / 'points'，或传入点标记数组/经纬度数组)
mapRef.value?.fitBounds('markers', { padding: [40, 40] });

// 3. 快捷包裹【线】(传入 'polylines' / 'lines'，或传入折线对象列表)
mapRef.value?.fitBounds('polylines', { padding: [40, 40] });

// 4. 快捷包裹【面】(传入 'polygons'，或传入多边形对象列表)
mapRef.value?.fitBounds('polygons', { padding: [40, 40] });

// 5. 包裹【全部当前显示要素】(传入 'all' 或直接不传参)
mapRef.value?.fitBounds('all', { padding: [50, 50] });

// 5. 传入自定义足迹点经纬度数组
const trackPoints = [
  [39.9042, 116.4074],
  [39.9163, 116.3972],
  [39.9289, 116.3883],
];
mapRef.value?.fitBounds(trackPoints, {
  padding: [40, 40],
  maxZoom: 16,
  animate: true,
});
</script>
```

#### ✈️ 弧线旅行航线与流动虚线动效

支持将两点或多点折线基于二次贝塞尔曲线生成平滑的大圆/旅行航线弧度，并开启从起点向终点持续流动的虚线粒子感动效。全端统一实现（H5/App 端采用高效 GPU CSS `@keyframes` 动画，小程序端采用 Canvas 2D `lineDashOffset` 按需动画循环）：

```ts
interface PolylineOptions {
  id?: string | number;
  latLngs: LatLngTuple[];
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: number[];       // 虚线分段配置，例如 [10, 8]
  dashOffset?: number;        // 静态虚线偏移量
  curved?: boolean;           // 是否开启二次贝塞尔平滑弧线 (默认 false)
  curvature?: number;         // 弧线曲率 (默认 0.2，正数上弧/左凸，负数下弧/右凸)
  flowing?: boolean;          // 是否开启粒子流光/流动虚线动效 (默认 false)
  flowSpeed?: number;         // 流动速度倍率 (默认 1.0，支持正负数控制流动方向)
  label?: string | MarkerLabelOptions; // 路线中点徽标文字
}
```

> **提示**：当设置 `curved: true` 时，调用 `fitBounds('polylines')` 会自动包含二次贝塞尔弧顶的实际最高/最低经纬度，确保完整包裹航线全貌。

---

## 📄 开源协议

[MIT License](LICENSE)
