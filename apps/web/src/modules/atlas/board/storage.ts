// 🔴 改动 2026-10-10 · 画板 localStorage 持久化（键 superretail.atlas.board.v1，含字段校验与坏数据回退；不接任何后端）
import type { BoardCard, BoardDoc, BoardLine, CardMeta, CardType } from './types'
import { clamp, emptyBoard, uid, ZOOM_MAX, ZOOM_MIN } from './types'

/** 主画板文档的 localStorage 键（版本号 v1，结构变更时递增） */
export const BOARD_STORAGE_KEY = 'superretail.atlas.board.v1'

// 🔴 改动 2026-10-11 · 卡片类型白名单新增 food（实物原材料卡）
// 🔴 改动 2026-10-12 · 卡片类型白名单新增 character（角色卡）/ recipe（配方卡）/ dish（菜品卡）/ revenue（收益节点）
// 🔴 改动 2026-10-12 · 卡片类型白名单新增 market（市场卡：用户 / 采购方）
const CARD_TYPES: readonly CardType[] = ['note', 'todo', 'board', 'food', 'character', 'recipe', 'dish', 'revenue', 'market']

/** 子画板最大嵌套深度（防御坏数据导致的无限递归） */
const MAX_SUB_DEPTH = 8

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function finiteNum(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** 清洗卡片 meta：逐项提取已知字段，未知字段直接丢弃 */
function sanitizeMeta(raw: unknown, depth: number): CardMeta {
  const meta: CardMeta = {}
  if (!isRecord(raw)) return meta
  if (typeof raw.title === 'string') meta.title = raw.title
  if (raw.manualW === true) meta.manualW = true
  // 🔴 改动 2026-10-11 · food 卡的原材料 id 白名单放行
  if (typeof raw.foodId === 'string') meta.foodId = raw.foodId
  // 🔴 改动 2026-10-12 · character / recipe 卡的资产 id 白名单放行
  if (typeof raw.characterId === 'string') meta.characterId = raw.characterId
  if (typeof raw.recipeId === 'string') meta.recipeId = raw.recipeId
  // 🔴 改动 2026-10-12 · dish 卡的菜品 id 白名单放行
  if (typeof raw.dishId === 'string') meta.dishId = raw.dishId
  // 🔴 改动 2026-10-12 · market 卡的市场资产 id 白名单放行
  if (typeof raw.marketId === 'string') meta.marketId = raw.marketId
  // 🔴 改动 2026-10-12 · food 卡的展示形态白名单放行（未知值丢弃，渲染回退卡片形态）
  if (raw.form === 'icon' || raw.form === 'node' || raw.form === 'info' || raw.form === 'card') meta.form = raw.form
  // 🔴 改动 2026-10-12 · revenue 卡归属的卖出连线 id 白名单放行
  if (typeof raw.sale === 'string') meta.sale = raw.sale
  // 🔴 改动 2026-10-13 · revenue 卡「收益线程」激活标记白名单放行
  if (raw.activated === true) meta.activated = true
  if (Array.isArray(raw.items)) {
    meta.items = raw.items
      .filter(isRecord)
      .map((it) => ({ text: typeof it.text === 'string' ? it.text : '', done: it.done === true }))
  }
  if (depth < MAX_SUB_DEPTH && isRecord(raw.sub)) {
    meta.sub = sanitizeDoc(raw.sub, depth + 1)
  }
  return meta
}

function sanitizeCard(raw: unknown, depth: number): BoardCard | null {
  if (!isRecord(raw)) return null
  const type = raw.type as CardType
  if (!CARD_TYPES.includes(type)) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    type,
    x: finiteNum(raw.x, 0),
    y: finiteNum(raw.y, 0),
    w: finiteNum(raw.w, 0),
    h: finiteNum(raw.h, 0),
    text: typeof raw.text === 'string' ? raw.text : '',
    meta: sanitizeMeta(raw.meta, depth),
  }
}

/** 清洗整份画板文档（递归处理 board 卡的 meta.sub）；结构不合法时回退为空画板
 *  🔴 改动 2026-10-11 · 导出：拆分画板状态（splitStore）复用同一清洗逻辑 */
export function sanitizeDoc(raw: unknown, depth: number): BoardDoc {
  const fallback = emptyBoard()
  if (!isRecord(raw)) return fallback
  const doc: BoardDoc = {
    title: typeof raw.title === 'string' && raw.title ? raw.title : fallback.title,
    viewport: { x: 0, y: 0, zoom: 1 },
    cards: [],
    lines: [],
  }
  if (isRecord(raw.viewport)) {
    const v = raw.viewport
    doc.viewport.x = finiteNum(v.x, 0)
    doc.viewport.y = finiteNum(v.y, 0)
    doc.viewport.zoom = clamp(finiteNum(v.zoom, 1), ZOOM_MIN, ZOOM_MAX)
  }
  if (Array.isArray(raw.cards)) {
    for (const c of raw.cards) {
      const card = sanitizeCard(c, depth)
      if (card) doc.cards.push(card)
    }
  }
  if (Array.isArray(raw.lines)) {
    const ids = new Set(doc.cards.map((c) => c.id))
    doc.lines = raw.lines
      .filter((l): l is BoardLine =>
        isRecord(l) &&
        typeof l.id === 'string' &&
        typeof l.from === 'string' &&
        typeof l.to === 'string' &&
        ids.has(l.from) &&
        ids.has(l.to),
      )
      .map((l) => ({
        id: l.id,
        from: l.from,
        to: l.to,
        // 🔴 改动 2026-10-12 · 端口锚点白名单放行（参照工坊资产节点连线；旧数据无此字段即为 undefined）
        ...(typeof l.fromPort === 'string' ? { fromPort: l.fromPort } : {}),
        ...(typeof l.toPort === 'string' ? { toPort: l.toPort } : {}),
      }))
  }
  // 🔴 改动 2026-10-13 · 拆出窗口 id 白名单放行（Tab 拖出浏览器的画板身份）
  if (typeof raw.detachId === 'string' && raw.detachId) doc.detachId = raw.detachId
  // 🔴 改动 2026-10-15 · Tab 稳定身份白名单放行（坞内拖动换位的 React key）
  if (typeof raw.tid === 'string' && raw.tid) doc.tid = raw.tid
  // 🔴 改动 2026-10-15 · 子画板标记白名单放行（属于其它画板的子画板不在 Tab 坞显示标签）
  if (raw.isSubBoard === true) doc.isSubBoard = true
  return doc
}

/** 从 localStorage 读取主画板；无数据或坏数据时返回空画板（storage 不可用时静默回退） */
export function loadBoard(): BoardDoc {
  try {
    const raw = window.localStorage.getItem(BOARD_STORAGE_KEY)
    if (!raw) return emptyBoard()
    return sanitizeDoc(JSON.parse(raw), 0)
  } catch {
    return emptyBoard()
  }
}

/** 写入主画板（storage 不可用/超配额时静默丢弃，不打断交互） */
export function saveBoard(doc: BoardDoc): void {
  try {
    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(doc))
  } catch {
    /* best effort，与 Evoloop persist 的静默策略一致 */
  }
}
