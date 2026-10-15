// 🔴 改动 2026-10-10 · 画板引擎句柄桥：BoardCanvas 挂载时注册，侧边栏浮窗（循环/实物）经此向底层画板发「添加卡片」指令。
// 🔴 改动 2026-10-11 · 「规划」浮窗删除后，桥的调用方剩 LoopPanel / PhysicalPanel / BoardTitleBar。
// 🔴 改动 2026-10-11 · 订阅中心：引擎注册 / 文档变更 / 视口缩放（顶栏 process 计数、View 百分比、sync 状态跟随）。
// 🔴 改动 2026-10-16 · 活跃引擎追踪：侧边栏「加入画板」优先落到用户最近交互的那块画板
// （画中画子画板浮窗在最上层时，点击加入应进子画板，而不是固定进 bridge 主实例的父画板——
//   父画板被浮窗遮住看不见，用户会再拖一张进子画板，刷新后两块画板各一张 = 「父画板也多了一个」）
import type { BoardEngine } from './engine'
import type { Viewport } from './types'

let current: BoardEngine | null = null
let active: BoardEngine | null = null

const engineListeners = new Set<() => void>()
const docListeners = new Set<() => void>()
// 🔴 改动 2026-10-13 · 视口广播全量化（x/y/zoom）：页面层放置物按画板坐标换算定位需要完整视口
const viewListeners = new Set<(view: Viewport) => void>()

/** BoardCanvas 挂载/卸载时调用 */
export function registerBoardEngine(engine: BoardEngine | null) {
  current = engine
  for (const fn of engineListeners) fn()
}

/** 取当前画板引擎（不在版图页或未挂载时为 null） */
export function getBoardEngine(): BoardEngine | null {
  return current
}

/** 🔴 改动 2026-10-16 · 记录「用户最近交互的画板引擎」（引擎根节点 pointerdown 时调用） */
export function setActiveBoardEngine(engine: BoardEngine | null) {
  active = engine
}

/** 🔴 改动 2026-10-16 · 取最近交互的画板引擎（侧边栏点击加卡用）：已销毁则回落 bridge 主实例 */
export function getActiveBoardEngine(): BoardEngine | null {
  if (active && !active.isDisposed()) return active
  return current
}

/** 引擎注册/注销通知（useSyncExternalStore 订阅源） */
export function subscribeEngineRegistry(fn: () => void): () => void {
  engineListeners.add(fn)
  return () => {
    engineListeners.delete(fn)
  }
}

/** 主画板文档变更通知（每次 scheduleSave 触发，800ms 防抖落盘不影响广播时机） */
export function subscribeBoardDoc(fn: () => void): () => void {
  docListeners.add(fn)
  return () => {
    docListeners.delete(fn)
  }
}
export function notifyBoardDocChanged(): void {
  for (const fn of docListeners) fn()
}

/** 主画板视口通知（applyViewport 每次应用触发；全量 x/y/zoom，取缩放用 view.zoom） */
export function subscribeBoardView(fn: (view: Viewport) => void): () => void {
  viewListeners.add(fn)
  return () => {
    viewListeners.delete(fn)
  }
}
export function notifyBoardView(view: Viewport): void {
  for (const fn of viewListeners) fn(view)
}
