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
]);

// 2. 路线折线 (带虚线与中点 Label)
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
| `width` | `string` | `'100%'` | 地图宽度 |
| `height` | `string` | `'100%'` | 地图高度 |
| `show-controls` | `boolean` | `true` | 是否显示右上方缩放控件按钮（H5/App 为悬浮组件，小程序为 Canvas 2D 顶层渲染） |

---

### MarkerIconOptions (图标详细配置)

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `text` | `string` | `undefined` | Emoji 字符或文字图标，如 `'🏛️'`, `'🚩'`, `'☕'` |
| `url` | `string` | `undefined` | PNG / JPG / SVG 文件路径、网络 URL 或 Base64 Data URI，如 `'/static/icons/pin-blue.png'`、`'/static/icons/camera.svg'` |
| `svg` | `string` | `undefined` | 原始 SVG XML 字符串，支持动态渐变与任意矢量图形，如 `'<svg viewBox="0 0 36 36">...</svg>'` |
| `html` | `string` | `undefined` | 自定义 HTML 结构 (仅 H5 与 App renderjs 生效) |
| `color` | `string` | `'#ef4444'` | 默认矢量 Pin 图钉的主题填充色 |
| `size` | `[number, number]` | `[32, 32]` | 图标渲染尺寸 `[宽, 高]` (px) |
| `anchor` | `[number, number]` | 居中或底部 | 图标锚点 `[x, y]`。图钉尖部对齐常用 `[width/2, height]`，圆形徽章居中对齐常用 `[width/2, height/2]` |

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
| `setTileUrl` | `(url: string, subdomains?: string[])` | 切换单底图源 |
| `setLayers` | `(layers: TileLayerConfig[])` | 动态切换多图层源 |
| `setMarkers` | `(markers: MarkerOptions[])` | 动态更新点标注 |
| `setPolylines`| `(polylines: PolylineOptions[])` | 动态更新折线 |
| `setPolygons` | `(polygons: PolygonOptions[])` | 动态更新多边形 |
| `setCircles`  | `(circles: CircleOptions[])` | 动态更新圆形 |
| `clearOverlays`| `()` | 清空所有覆盖物 |
| `resize` | `(width?: number, height?: number)` | 重新计算视口尺寸与 DPR 适配 |
| `getCenter` | `()` | 获取当前中心点 `[lat, lng]` |
| `getZoom` | `()` | 获取当前缩放层级 |
| `getNativeInstance` | `()` | 获取底层原生实例（H5/App 为 Leaflet `L.map`，小程序为 `canvas` 节点） |

---

## 📄 开源协议

[MIT License](LICENSE)
