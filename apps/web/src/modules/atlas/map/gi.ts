// 🔴 改动 2026-10-13 · GI 地理标志点位层：数据加载（tools/build-gi-points.mjs 生成的 gi-points.json）。
// 🔴 改动 2026-10-14 · 去掉三级 LOD / SVG 兜底引擎后精简：仅保留点位类型、级别推断与加载器，
//  缩放聚合与悬停面板统一由 AmapView.tsx 的自绘网格聚合负责。
import type { Position } from './geo'

/** GI 点位记录（schema 见 tools/build-gi-points.mjs）：n=名称 t=GI/AGI c=落点区县 adcode p=[lng,lat]
 *  sr=1 为 12 款在册资产（sid=工坊卡片 id），f=1 为仅省级精度（当前数据已清零，保留字段兼容全量名录） */
export interface GiPoint {
  n: string
  t: 'GI' | 'AGI'
  c: number
  p: Position
  sr?: 1
  sid?: string
  f?: 1
}

let cache: Promise<GiPoint[]> | null = null

/** 加载 GI 点位（本地 JSON，构建期已由脚本生成）；失败时返回空数组，地图功能不受影响 */
export function loadGiPoints(): Promise<GiPoint[]> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}assets/atlas/gi-points.json`)
      .then((res) => (res.ok ? (res.json() as Promise<GiPoint[]>) : []))
      .catch(() => [] as GiPoint[])
  }
  return cache
}

/** 🔴 改动 2026-10-14 · 点位注册行政级别（由落点 adcode 粒度推断）：
 *  c%10000===0 省级（兜底精度）、c%100===0 市级、其余区县级 */
export type GiLevel = 'province' | 'city' | 'county'

export function giLevelOf(c: number): GiLevel {
  if (c % 10000 === 0) return 'province'
  if (c % 100 === 0) return 'city'
  return 'county'
}

/** 点击标记按注册级别缩放的目标准 zoom：省级 6 / 市级 9 / 区县级 11（高德原生级别） */
export const GI_LEVEL_ZOOM: Record<GiLevel, number> = { province: 6, city: 9, county: 11 }
