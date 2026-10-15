// 🔴 改动 2026-10-12 · LOD 地图 GeoJSON 工具层：行政区划边界加载（本地优先，DataV 国内 CDN 兜底）
// 与简易等距投影（lng/lat → SVG 坐标）。数据与高德同 adcode 体系（阿里云 DataV areas_v3）。
// GeoJSON 类型本地最小定义（项目未装 @types/geojson）
export type Position = [number, number]
export interface PolygonGeom { type: 'Polygon'; coordinates: Position[][] }
export interface MultiPolygonGeom { type: 'MultiPolygon'; coordinates: Position[][][] }
export interface DistrictFeature {
  type: 'Feature'
  properties: {
    /** 行政区代码；十段线要素为字符串 '100000_JD'（仅描边渲染，不参与交互） */
    adcode: number | string
    name: string
    center?: Position
    centroid?: Position
    level?: string
  }
  geometry: PolygonGeom | MultiPolygonGeom
}

const geoCache = new Map<number, Promise<DistrictFeature[]>>()

const localGeo = (adcode: number) => `${import.meta.env.BASE_URL}assets/atlas/geo/${adcode}_full.json`
const cdnGeo = (adcode: number) => `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`

/** 加载某 adcode 的下级行政区边界（100000=全国各省；省 adcode=省内各市）。本地文件优先，缺失时走 DataV CDN */
export function loadDistricts(adcode: number): Promise<DistrictFeature[]> {
  let cached = geoCache.get(adcode)
  if (!cached) {
    cached = (async () => {
      const extract = async (url: string): Promise<DistrictFeature[] | null> => {
        const res = await fetch(url)
        if (!res.ok) return null
        const fc = (await res.json()) as { features?: Array<DistrictFeature & { geometry?: { type?: string } }> }
        return (fc.features ?? [])
          .filter(
            (f): f is DistrictFeature =>
              (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') &&
              (typeof f.properties?.adcode === 'number' || f.properties?.adcode === '100000_JD'),
          )
          .map((f) => ({ ...f, properties: { ...f.properties, name: f.properties.name ?? '' } }))
      }
      const local = await extract(localGeo(adcode)).catch(() => null)
      if (local?.length) return local
      const remote = await extract(cdnGeo(adcode)).catch(() => null)
      if (remote?.length) return remote
      throw new Error(`行政区划数据加载失败（adcode=${adcode}）`)
    })()
    geoCache.set(adcode, cached)
  }
  return cached
}

/** 简易等距投影（经度按 cos(中纬) 压缩，接近墨卡托视觉效果且可逆），fit 到指定 viewBox 尺寸 */
export interface Projection {
  (lnglat: Position): [number, number]
  /** viewBox 尺寸与数据包围盒（调试用） */
  width: number
  height: number
}

export function fitProjection(features: DistrictFeature[], width: number, height: number, pad = 24): Projection {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  const scan = (coords: Position[]) => {
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }
  for (const f of features) {
    const geom = f.geometry
    if (geom.type === 'Polygon') geom.coordinates.forEach(scan)
    else geom.coordinates.forEach((poly) => poly.forEach(scan))
  }
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const w = Math.max(1e-6, (maxLng - minLng) * kx)
  const h = Math.max(1e-6, maxLat - minLat)
  const scale = Math.min((width - pad * 2) / w, (height - pad * 2) / h)
  const ox = (width - w * scale) / 2
  const oy = (height - h * scale) / 2
  const project = ([lng, lat]: Position): [number, number] => [
    ox + (lng - minLng) * kx * scale,
    oy + (maxLat - lat) * scale,
  ]
  project.width = width
  project.height = height
  return project
}

/** 单个行政区 → SVG path（Polygon / MultiPolygon，多环用 fill-rule:evenodd 挖洞） */
export function featurePath(feature: DistrictFeature, project: Projection): string {
  const ring = (coords: Position[]) =>
    coords.map((c, i) => {
      const [x, y] = project(c)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join('') + 'Z'
  const geom = feature.geometry
  return geom.type === 'Polygon'
    ? geom.coordinates.map(ring).join('')
    : geom.coordinates.map((poly) => poly.map(ring).join('')).join('')
}

/** 标签锚点：优先 centroid，退而求其次 center，最后取第一个顶点 */
export function labelAnchor(feature: DistrictFeature, project: Projection): [number, number] {
  const anchor = feature.properties.centroid ?? feature.properties.center
  if (anchor) return project(anchor)
  const geom = feature.geometry
  const first = geom.type === 'Polygon' ? geom.coordinates[0][0] : geom.coordinates[0][0][0]
  return project(first)
}
