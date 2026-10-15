// 🔴 改动 2026-10-11 · 侧边栏功能模块化注册表 + 上栏配置存储。
// 上半部分按钮全部登记为模块（RAIL_MODULES）；「工具」浮窗据此列出全部功能：
// 已在栏的灰显禁拖，未上栏的可拖入侧边栏。栏内顺序/成员持久化 localStorage('sr.rail.modules')。
// 后续新功能：在 RAIL_MODULES 末尾追加一项即可——默认不上栏，自动以「可拖入」形态出现在工具面板。
import { useSyncExternalStore } from 'react'
import {
  BarChart3,
  ChefHat,
  CookingPot,
  Newspaper,
  Repeat,
  ScrollText,
  SquareDashed,
  Store,
  Users,
  Wheat,
  type LucideIcon,
} from 'lucide-react'
import type { DictKey } from '@/lib/i18n'

/** 侧边栏浮窗面板 key（图表 / 品牌 / 循环 / 实物 / 角色 / 配方 / 菜品 / 市场 / 工具） */
export type PanelKey = 'charts' | 'brands' | 'loop' | 'physical' | 'characters' | 'recipes' | 'dishes' | 'market' | 'tools'

/** 拖放 MIME：面板 → 侧边栏（添加）；侧边栏内（排序移动）。自定义类型避免与画板/循环浮窗的 text/plain 拖放串线 */
export const RAIL_ADD_MIME = 'application/x-sr-rail-add'
export const RAIL_MOVE_MIME = 'application/x-sr-rail-move'

export interface RailModule {
  key: string
  labelKey: DictKey
  icon: LucideIcon
  /** 对应浮窗面板；无则仅导航高亮 */
  panel?: PanelKey
}

/** 全部已模块化功能（登记即进「工具」面板；不在上栏配置里的默认只在面板中可拖入） */
export const RAIL_MODULES: readonly RailModule[] = [
  { key: 'overview', labelKey: 'rail.overview', icon: SquareDashed },
  { key: 'charts', labelKey: 'rail.charts', icon: BarChart3, panel: 'charts' },
  { key: 'brands', labelKey: 'rail.brands', icon: Store, panel: 'brands' },
  { key: 'news', labelKey: 'rail.news', icon: Newspaper },
  { key: 'loop', labelKey: 'rail.loop', icon: Repeat, panel: 'loop' },
  { key: 'physical', labelKey: 'rail.physical', icon: Wheat, panel: 'physical' },
  // 🔴 改动 2026-10-12 · 「角色」「配方」侧栏入口（工坊角色卡 / 配方卡列表浮窗）
  { key: 'characters', labelKey: 'rail.characters', icon: ChefHat, panel: 'characters' },
  { key: 'recipes', labelKey: 'rail.recipes', icon: ScrollText, panel: 'recipes' },
  // 🔴 改动 2026-10-12 · 「菜品」侧栏入口（工坊菜品卡列表浮窗）
  { key: 'dishes', labelKey: 'rail.dishes', icon: CookingPot, panel: 'dishes' },
  // 🔴 改动 2026-10-12 · 「市场」侧栏入口（工坊市场卡列表浮窗：用户 / 采购方）
  { key: 'market', labelKey: 'rail.market', icon: Users, panel: 'market' },
]

const MODULE_MAP = new Map(RAIL_MODULES.map((m) => [m.key, m]))

export function getRailModule(key: string): RailModule | undefined {
  return MODULE_MAP.get(key)
}

/** 首次运行的默认上栏（保持模块化前的 6 个入口与顺序）；一旦落盘，后续完全以用户配置为准 */
const DEFAULT_ORDER = RAIL_MODULES.map((m) => m.key)
const STORAGE_KEY = 'sr.rail.modules'
// 🔴 改动 2026-10-12 · 用户手动移除记录：注册表新增模块（如角色/配方）默认自动上栏，
// 但被用户移除过的模块不复活（避免升级后反复出现）。
const REMOVED_KEY = 'sr.rail.modules.removed'

function loadRemoved(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(REMOVED_KEY) || '[]')
    return Array.isArray(parsed) ? [...new Set(parsed.filter((k): k is string => typeof k === 'string'))] : []
  } catch {
    return []
  }
}

let removed = loadRemoved()

function persistRemoved() {
  try {
    window.localStorage.setItem(REMOVED_KEY, JSON.stringify(removed))
  } catch {
    /* localStorage 不可用时仅内存态 */
  }
}

function load(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_ORDER]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DEFAULT_ORDER]
    // 只认已登记模块，去重保序（注册表删掉某模块后旧配置自动失效）
    const keys = [...new Set(parsed.filter((k): k is string => typeof k === 'string' && MODULE_MAP.has(k)))]
    // 🔴 改动 2026-10-12 · 注册表里的新模块（不在已存配置、也未被用户移除过）自动补到栏尾
    const fresh = RAIL_MODULES.map((m) => m.key).filter((k) => !keys.includes(k) && !removed.includes(k))
    return [...keys, ...fresh]
  } catch {
    return [...DEFAULT_ORDER]
  }
}

let order = load()
const listeners = new Set<() => void>()

function commit(next: string[]) {
  order = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* localStorage 不可用时仅内存态 */
  }
  for (const fn of listeners) fn()
}

export function subscribeRailModules(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getRailOrder(): readonly string[] {
  return order
}

export function isOnRail(key: string): boolean {
  return order.includes(key)
}

/** 增：把模块插入侧边栏指定位置（默认追加到末尾）；已上栏或未登记的忽略 */
export function addRailModule(key: string, index = order.length) {
  if (!MODULE_MAP.has(key) || order.includes(key)) return
  // 🔴 改动 2026-10-12 · 手动加回时清除移除记录（与自动上栏逻辑对称）
  if (removed.includes(key)) {
    removed = removed.filter((k) => k !== key)
    persistRemoved()
  }
  const next = [...order]
  next.splice(Math.max(0, Math.min(index, next.length)), 0, key)
  commit(next)
}

/** 删：从侧边栏移除模块（模块仍留在「工具」面板，可再拖回） */
export function removeRailModule(key: string) {
  // 🔴 改动 2026-10-12 · 记录手动移除，刷新后不再被「新模块自动上栏」补回
  if (!removed.includes(key)) {
    removed = [...removed, key]
    persistRemoved()
  }
  commit(order.filter((k) => k !== key))
}

/** 改：把栏内模块移动到新下标（拖拽排序） */
export function moveRailModule(key: string, index: number) {
  const from = order.indexOf(key)
  if (from < 0) return
  const next = [...order]
  next.splice(from, 1)
  // 先摘除后插入：原位置在目标下标之前时，目标下标回退一格
  const to = from < index ? index - 1 : index
  next.splice(Math.max(0, Math.min(to, next.length)), 0, key)
  commit(next)
}

/** 查：React 订阅当前上栏配置（SideRail 渲染、ToolsPanel 灰显共用） */
export function useRailOrder(): readonly string[] {
  return useSyncExternalStore(subscribeRailModules, getRailOrder)
}

// 🔴 改动 2026-10-13 · 「正在被拖拽的栏内模块」临时内存态 + 订阅（不持久化、不写 localStorage）。
// HTML5 拖放在 dragover 阶段（Chrome/Firefox）读不到 dataTransfer 里的数据，工具浮窗只能靠这份内存态
// 判断「现在被拖的是哪个模块」，从而给出准确的「可落点 / 拖回移除」反馈；值相同不通知，避免多余渲染。
let draggingKey: string | null = null
const draggingListeners = new Set<() => void>()

export function setDraggingRailModule(key: string | null) {
  if (key === draggingKey) return
  draggingKey = key
  for (const fn of draggingListeners) fn()
}

function subscribeDraggingRailModule(fn: () => void): () => void {
  draggingListeners.add(fn)
  return () => {
    draggingListeners.delete(fn)
  }
}

function getDraggingRailModule(): string | null {
  return draggingKey
}

/** 查：React 订阅「当前被拖拽的栏内模块」（ToolsPanel 落点反馈用） */
export function useDraggingRailModule(): string | null {
  return useSyncExternalStore(subscribeDraggingRailModule, getDraggingRailModule)
}
