// 🔴 改动 2026-10-12 · 高德 JS API 加载器：Key 三处来源（优先级从高到低）
//  1. localStorage 'sr.amap.key' / 'sr.amap.sec'（免打包直接试用）
//  2. 下方常量 AMAP_KEY / AMAP_SECURITY_CODE（申请后粘贴，个人认证开发者 JS API 有免费额度）
//  3. 环境变量 VITE_AMAP_KEY / VITE_AMAP_SECURITY_CODE
// 未配置或加载失败时 resolve null —— 地图显示加载失败状态（三级 LOD 与 SVG 兜底引擎已移除）。
const AMAP_KEY = 'e84f97876c3f548e5efb0cc56f2520a4'
const AMAP_SECURITY_CODE = '967c609c07b9ba5e074875769dfdac47'

declare global {
  interface Window {
    AMap?: unknown
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

function resolveKey(): { key: string; sec: string } | null {
  const lsKey = window.localStorage.getItem('sr.amap.key') ?? ''
  const lsSec = window.localStorage.getItem('sr.amap.sec') ?? ''
  const key = lsKey || AMAP_KEY || ((import.meta.env.VITE_AMAP_KEY as string | undefined) ?? '')
  const sec = lsSec || AMAP_SECURITY_CODE || ((import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined) ?? '')
  return key ? { key, sec } : null
}

let loading: Promise<unknown | null> | null = null

/** 加载高德 JS API 2.0（含 DistrictSearch 插件）；未配置 Key 或加载失败时 resolve null */
export function loadAmap(): Promise<unknown | null> {
  if (window.AMap) return Promise.resolve(window.AMap)
  if (loading) return loading
  const auth = resolveKey()
  if (!auth) return Promise.resolve(null)
  loading = new Promise((resolve) => {
    window._AMapSecurityConfig = { securityJsCode: auth.sec }
    const script = document.createElement('script')
    // 🔴 改动 2026-10-14 · 聚合已改自绘（AmapView 网格聚合），不再加载 MarkerCluster / DistrictSearch 插件
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${auth.key}`
    script.async = true
    script.onload = () => resolve(window.AMap ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return loading
}

/** 当前是否配置了高德 Key（UI 据此显示「内置边界模式」角标） */
export function hasAmapKey(): boolean {
  return resolveKey() !== null
}
