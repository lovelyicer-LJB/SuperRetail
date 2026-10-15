// ============================================================================
// 🔴 改动 2026-10-13 · 拆分画板状态 · 树形模型 · localStorage 持久化
// 键 superretail.atlas.split.v1（结构兼容 v1 旧格式，自动迁移）：
// 画板区 = 一棵拆分树：叶子 = 主画板（tab:-1）或拆分画板（boards 下标），
// 分组节点 = 一个方向（vertical 左右 / horizontal 上下）+ 边界比例。
// 支持继续拆分（分隔线右键同时拆两块成四块 / 单画板空白右键拆自己），
// 叶子可「收起」（collapsed，被覆盖的画板进入收起态；点 Tab 复位显示）。
// 🔴 改动 2026-10-16 · 持久化规则：只要有拆分画板就持久化（空白新建 Tab 刷新后也保留）；
// 保存的 JSON 额外带 view 字段（split 同屏拆分 / solo 独占全屏 / main 主画板全屏），刷新原样恢复视图。
// 旧「有卡片才固定」规则已停用（isSplitFixed 保留但恒等于 boards.length > 0）。
// pinned（屏幕钉）：技能激活的子画板默认钉在屏幕上，以浮动窗口显示。
// 🔴 改动 2026-10-13 · 本文件是【框架约定 · 画板与 Tab 一体】的落点之一（约定全文见 engine.ts
// 头注）：Tab 坞标签与 boards 数组一一对应（下标即身份），Tab 只是画板在坞中的把手——
// 激活/重命名/新建/删除 Tab 全部直接落在画板文档上，画板侧状态（钉/收起/主画板）同步反映到 Tab。
// Tab 撕离（拖到画板 = 画中画 / 拖出浏览器 = 独立窗口）的拆出身份 detachId 挂在 BoardDoc 上
// （types.ts），本文件只管 boards 数组与拆分树的持久化。
// ============================================================================
import type { BoardDoc } from './types'
import { clamp, uid } from './types'
import { sanitizeDoc } from './storage'

export type SplitDirection = 'vertical' | 'horizontal'

/** 拆分树节点：叶子 = 画板（tab -1 = 主画板，>=0 = boards 下标）；分组 = 方向 + 比例 */
export type SplitNode =
  | { kind: 'board'; tab: number; collapsed?: boolean }
  | { kind: 'group'; direction: SplitDirection; ratio: number; first: SplitNode; second: SplitNode }

/** 拆分视图状态（本地存储单元） */
export interface AtlasSplitState {
  /** 当前激活的拆分画板下标（Tab 坞高亮 / 次窗格切换用） */
  activeSplit: number
  /** 拆分出来的独立画板列表（Tab1、Tab2…；不含主画板） */
  boards: BoardDoc[]
  /** 拆分树根（始终含主画板叶子 tab:-1） */
  root: SplitNode
  /** 屏幕钉标记（与 boards 对齐）：true = 该 Tab 钉在屏幕上（浮动窗口），默认非钉 */
  pinned: boolean[]
  /** 🔴 改动 2026-10-16 · 保存时的视图态：split = 同屏拆分 / solo = 某块画板独占全屏 / main = 主画板全屏；
   *  旧数据无此字段加载时按 'split' 处理（兼容旧行为） */
  view?: 'split' | 'solo' | 'main'
  /** 🔴 改动 2026-10-16 · 屏幕钉浮动窗口位置（与 boards 下标对齐；null/缺省 = 默认错位排布），
   *  刷新后画中画窗口保持保存时的位置 */
  pinPos?: ({ x: number; y: number } | null)[]
}

const SPLIT_STORAGE_KEY = 'superretail.atlas.split.v1'
// 🔴 改动 2026-10-13 · 导出存储键：拆出窗口（?boardwin=）与主窗口经同源 localStorage + storage 事件同步
export { SPLIT_STORAGE_KEY }
/** 树最大深度（防御坏数据无限递归） */
const MAX_TREE_DEPTH = 8

export const mainBoardNode = (): SplitNode => ({ kind: 'board', tab: -1 })
export const boardNode = (tab: number, collapsed = false): SplitNode => ({ kind: 'board', tab, ...(collapsed ? { collapsed: true } : {}) })
export const groupNode = (direction: SplitDirection, ratio: number, first: SplitNode, second: SplitNode): SplitNode =>
  ({ kind: 'group', direction, ratio: clamp(ratio, 0, 1), first, second })

/** 空拆分状态：只有主画板（默认画板为主画板，框架写死必须存在） */
export function emptySplitState(): AtlasSplitState {
  return { activeSplit: 0, boards: [], root: mainBoardNode(), pinned: [] }
}

/** 是否「固定」：任一拆分画板已有卡片（🔴 改动 2026-10-16 · 已停用：落盘不再要求有卡片，
 *  空白画板同样跨启动保留；函数保留仅供外部调试/潜在调用） */
export function isSplitFixed(state: AtlasSplitState): boolean {
  return state.boards.length > 0
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 清洗树节点：叶子 tab 必须合法；未知结构回退为 null（上层用主画板叶兜底） */
function sanitizeNode(raw: unknown, tabCount: number, depth: number): SplitNode | null {
  if (!isRecord(raw) || depth > MAX_TREE_DEPTH) return null
  if (raw.kind === 'board') {
    const tab = typeof raw.tab === 'number' && Number.isFinite(raw.tab) ? Math.trunc(raw.tab) : -1
    if (tab < -1 || tab >= tabCount) return null
    return raw.collapsed === true ? { kind: 'board', tab, collapsed: true } : { kind: 'board', tab }
  }
  if (raw.kind === 'group') {
    const first = sanitizeNode(raw.first, tabCount, depth + 1)
    const second = sanitizeNode(raw.second, tabCount, depth + 1)
    if (!first || !second) return null
    const ratio = typeof raw.ratio === 'number' && Number.isFinite(raw.ratio) ? clamp(raw.ratio, 0, 1) : 0.5
    return { kind: 'group', direction: raw.direction === 'horizontal' ? 'horizontal' : 'vertical', ratio, first, second }
  }
  return null
}

/** 树内是否包含指定 tab（-1 = 主画板） */
export function containsTab(node: SplitNode, tab: number): boolean {
  return node.kind === 'board' ? node.tab === tab : containsTab(node.first, tab) || containsTab(node.second, tab)
}

/** 读取本地拆分状态；无数据/坏数据/画板列表为空时返回 null。兼容 v1 旧格式自动迁移为树 */
export function loadSplitState(): AtlasSplitState | null {
  try {
    const raw = window.localStorage.getItem(SPLIT_STORAGE_KEY)
    if (!raw) return null
    const v: unknown = JSON.parse(raw)
    if (!isRecord(v) || !Array.isArray(v.boards) || v.boards.length === 0) return null
    const boards = v.boards.map((b) => sanitizeDoc(b, 0))
    // 🔴 改动 2026-10-15 · 旧数据补发 Tab 稳定身份（坞内拖动换位依赖 tid 作 React key；补发后不立即落盘，
    //  下次 commitSplit 自然写回；两窗口各自补发互不影响——key 只在本窗口 reconciliation 用）
    for (const b of boards) {
      if (!b.tid) b.tid = uid()
    }
    // 🔴 改动 2026-10-16 · 不再要求「有卡片才恢复」：空白新建 Tab 刷新后也保留
    const activeSplit = typeof v.activeSplit === 'number' && Number.isFinite(v.activeSplit)
      ? clamp(Math.trunc(v.activeSplit), 0, Math.max(0, boards.length - 1))
      : 0
    const pinnedRaw = Array.isArray(v.pinned) ? v.pinned : []
    const pinned = boards.map((_, i) => pinnedRaw[i] === true)
    // 🔴 改动 2026-10-16 · 浮动窗口位置：与 boards 下标对齐清洗（坏值归 null = 默认排布）
    const pinPosRaw = Array.isArray(v.pinPos) ? v.pinPos : []
    const pinPos = boards.map((_, i) => {
      const p = pinPosRaw[i]
      if (isRecord(p) && typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y)) {
        return { x: p.x, y: p.y }
      }
      return null
    })
    // 🔴 改动 2026-10-16 · 视图态（旧数据无此字段按 'split' 处理，兼容旧行为）
    const view = v.view === 'solo' || v.view === 'main' ? v.view : 'split'
    // 树：新格式优先；v1 旧格式 { direction, ratio, boards, activeSplit } 迁移为 [主画板 | activeSplit 画板] 两叶
    let root = sanitizeNode(v.root, boards.length, 0)
    // 框架写死：必须有一个主画板（tab:-1）；缺失时兜底重建为 [主画板 | 激活画板]
    if (!root || !containsTab(root, -1)) {
      const direction = isRecord(v) && v.direction === 'horizontal' ? 'horizontal' : 'vertical'
      const ratio = isRecord(v) && typeof v.ratio === 'number' && Number.isFinite(v.ratio) ? clamp(v.ratio, 0, 1) : 0.5
      root = groupNode(direction, ratio, mainBoardNode(), boardNode(activeSplit))
    }
    return { activeSplit, boards, root, pinned, view, pinPos }
  } catch {
    return null
  }
}

/** 写入本地拆分状态（storage 不可用/超配额时静默丢弃） */
export function saveSplitState(state: AtlasSplitState): void {
  try {
    window.localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* best effort */
  }
}

/** 清除本地拆分状态（拆分画板全被清空 → 取消固定） */
export function removeSplitState(): void {
  try {
    window.localStorage.removeItem(SPLIT_STORAGE_KEY)
  } catch {
    /* best effort */
  }
}

// ---------- 树操作纯函数 ----------

/** 沿路径取节点（path：0 = first / 1 = second，逐级向下；空数组 = 根） */
export function nodeAt(root: SplitNode, path: number[]): SplitNode | null {
  let cur: SplitNode = root
  for (const p of path) {
    if (cur.kind !== 'group') return null
    cur = p === 0 ? cur.first : cur.second
  }
  return cur
}

/** 沿路径写节点（返回新树） */
export function setNodeAt(root: SplitNode, path: number[], node: SplitNode): SplitNode {
  if (path.length === 0) return node
  if (root.kind !== 'group') return root
  const [head, ...rest] = path
  return head === 0
    ? { ...root, first: setNodeAt(root.first, rest, node) }
    : { ...root, second: setNodeAt(root.second, rest, node) }
}

/** 叶子路径的父分组路径（最后一段指向分组自身）：不存在（根即叶）返回 null */
export function parentGroupPath(_root: SplitNode, path: number[]): number[] | null {
  return path.length > 0 ? path.slice(0, -1) : null
}

/** 收集全部叶子：{ path, tab, collapsed }（先序） */
export function collectLeaves(root: SplitNode): { path: number[]; tab: number; collapsed: boolean }[] {
  const out: { path: number[]; tab: number; collapsed: boolean }[] = []
  const walk = (node: SplitNode, path: number[]) => {
    if (node.kind === 'board') out.push({ path, tab: node.tab, collapsed: node.collapsed === true })
    else {
      walk(node.first, [...path, 0])
      walk(node.second, [...path, 1])
    }
  }
  walk(root, [])
  return out
}

/** 移除叶子：若其父分组只剩一个孩子，用该孩子上提替代分组；根自身为叶时返回主画板叶 */
export function removeLeaf(root: SplitNode, path: number[]): SplitNode {
  if (path.length === 0) return mainBoardNode()
  const parentPath = parentGroupPath(root, path)!
  const parent = nodeAt(root, parentPath)
  if (!parent || parent.kind !== 'group') return root
  const side = path[path.length - 1]
  const sibling = side === 0 ? parent.second : parent.first
  // 父分组提升：用兄弟替代父分组（兄弟可能是分组，直接整棵上提）
  const withoutParent = parentPath.length === 0 ? sibling : setNodeAt(root, parentPath, sibling)
  // 上提后路径不变（兄弟占据原父位置）
  return withoutParent
}

/** 叶子所在分组的兄弟方向：拆分所在画板时取与所在分组垂直的方向（根/无分组时 vertical） */
export function splitDirectionForLeaf(root: SplitNode, path: number[]): SplitDirection {
  const parentPath = parentGroupPath(root, path)
  if (parentPath === null) return 'vertical'
  const parent = nodeAt(root, parentPath)
  return parent?.kind === 'group' && parent.direction === 'vertical' ? 'horizontal' : 'vertical'
}

/** 叶子是否已被收起（被覆盖） */
export function isLeafCollapsed(root: SplitNode, path: number[]): boolean {
  const node = nodeAt(root, path)
  return node?.kind === 'board' && node.collapsed === true
}

/** 树的叶子数（>0；主画板恒存在） */
export function leafCount(root: SplitNode): number {
  return collectLeaves(root).length
}
