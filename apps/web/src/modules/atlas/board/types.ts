// 🔴 改动 2026-10-10 · 画板数据模型（复刻 Evoloop emptyBoard：title/viewport/cards/lines，坐标为逻辑像素）

/** 视口：x/y 为世界原点在屏幕上的偏移（CSS 像素），zoom 为缩放比 */
export interface Viewport {
  x: number
  y: number
  zoom: number
}

/** 待办清单条目（存于 todo 卡 meta.items） */
export interface TodoItem {
  text: string
  done: boolean
}

/** 🔴 改动 2026-10-11 · 新增 food 实物卡（食品原材料）：meta.foodId 锚定工坊 FoodCardData 契约 */
export interface CardMeta {
  /** todo / board 卡的标题 */
  title?: string
  /** todo 卡的清单条目 */
  items?: TodoItem[]
  /** board 卡的嵌套子画板文档（与主画板同构，递归嵌套） */
  sub?: BoardDoc
  /** todo 卡手动调宽标记（保留自 Evoloop，当前仅记录不再参与 hug） */
  manualW?: boolean
  /** food 卡的原材料 id（对应 workshop/food-card/data 的 FoodCardData.id） */
  foodId?: string
  /** 🔴 改动 2026-10-12 · character 卡的角色 id（对应 workshop/character-card/data 的 CharacterData.id） */
  characterId?: string
  /** 🔴 改动 2026-10-12 · recipe 卡的配方 id（对应 workshop/recipe-card/data 的 RecipeData.id） */
  recipeId?: string
  /** 🔴 改动 2026-10-12 · dish 卡的菜品 id（对应 workshop/dish-card/data 的 DishData.id） */
  dishId?: string
  /** 🔴 改动 2026-10-12 · market 卡的市场资产 id（对应 workshop/market-card/data 的 MarketData.id） */
  marketId?: string
  /** 🔴 改动 2026-10-12 · food 卡的展示形态（缺省视为 'card'，兼容 10-11 存量卡） */
  form?: FoodForm
  /** 🔴 改动 2026-10-12 · revenue 卡归属的卖出连线 id（卖出连线被移除/两端卡片被删时，收益节点随之一并清除） */
  sale?: string
  /** 🔴 改动 2026-10-13 · revenue 卡是否已被「运行」技能激活（true = 收益线程；未激活 = 已形成收益、具备激活条件） */
  activated?: boolean
  /** 🔴 改动 2026-10-13 · 屏幕钉：true = 卡片钉在屏幕上，拖动画布（平移/缩放）不随画布移动。
   *  卡片 world x/y 保留（取消钉后回到世界坐标系）；钉住期间视觉位置由 pinX/pinY 驱动 */
  pinned?: boolean
  /** 🔴 改动 2026-10-13 · 屏幕钉的视觉位置：相对引擎根元素的屏幕 CSS 像素（钉住时/拖动钉卡时更新） */
  pinX?: number
  pinY?: number
  /** 🔴 改动 2026-10-13 · 钉住时刻的画板缩放比：钉卡视觉尺寸冻结（counter-scale = pinZoom / view.zoom） */
  pinZoom?: number
}

/** 🔴 改动 2026-10-11 · 卡片类型新增 food（实物原材料卡，固定 200×280 不参与缩放）
 *  🔴 改动 2026-10-12 · 新增 character（角色卡）/ recipe（配方卡）/ dish（菜品卡），与 food 共用四形态体系 */
/** 🔴 改动 2026-10-12 · 卡片类型新增 revenue（收益节点，卖出连线成立后自动生成，非用户手建） */
/** 🔴 改动 2026-10-12 · 新增 character（角色卡）/ recipe（配方卡）/ dish（菜品卡）/ market（市场卡），与 food 共用四形态体系 */
export type CardType = 'note' | 'todo' | 'board' | 'food' | 'character' | 'recipe' | 'dish' | 'revenue' | 'market'

/** 🔴 改动 2026-10-12 · 资产卡类型（food 原材料 / character 角色 / recipe 配方 / dish 菜品 / market 市场）：同一资产四种形态 */
export type AssetCardType = 'food' | 'character' | 'recipe' | 'dish' | 'market'

export function isAssetCard(type: CardType): type is AssetCardType {
  return type === 'food' || type === 'character' || type === 'recipe' || type === 'dish' || type === 'market'
}

/** 🔴 改动 2026-10-12 · food 实物卡的四种展示形态（同一资产，四种形态：与工坊资产体系页一致）。
 *  icon 图标 / node 节点 / info 组件 / card 卡片；选中后 Tab+Q/W/E/R 切换。 */
export type FoodForm = 'icon' | 'node' | 'info' | 'card'

/** 各形态的固定尺寸（都不参与缩放；node 高 = 资产体系节点公式 112 + 端口行数×30） */
export const FOOD_FORM_SIZE: Record<FoodForm, { w: number; h: number }> = {
  icon: { w: 96, h: 96 },
  node: { w: 238, h: 172 },
  info: { w: 288, h: 72 },
  card: { w: 200, h: 280 },
}

/** 🔴 改动 2026-10-12 · 新建 food 卡的默认形态：节点（从实物列表点击/拖入画板） */
export const DEFAULT_FOOD_FORM: FoodForm = 'node'

/** 🔴 改动 2026-10-12 · 资产卡形态尺寸：节点高按端口行数（recipe 3 原料 + 买入 = 4 行 → 232；
 *  dish 配方 + 厨师 + 买入 = 3 行 → 202；food / character 2 行 → 172；
 *  market 买入 + 卖出同侧 1 行 → 142，对齐资产体系采购方节点） */
export function assetFormSize(type: AssetCardType, form: FoodForm | undefined): { w: number; h: number } {
  const f = form ?? 'card'
  if (f === 'node') {
    const h = type === 'recipe' ? 232 : type === 'dish' ? 202 : type === 'market' ? 142 : FOOD_FORM_SIZE.node.h
    return { w: FOOD_FORM_SIZE.node.w, h }
  }
  return FOOD_FORM_SIZE[f]
}

/** food 卡尺寸解析：缺省 form 视为 'card'（兼容 2026-10-11 之前落盘的存量卡） */
export function foodFormSize(form: FoodForm | undefined): { w: number; h: number } {
  return assetFormSize('food', form)
}

/** 内容卡片：x/y/w/h 均为画板世界坐标的逻辑像素 */
export interface BoardCard {
  id: string
  type: CardType
  x: number
  y: number
  w: number
  h: number
  text: string
  meta: CardMeta
}

/** 两卡片间连线（from/to 为卡片 id，渲染为端口锚定的贝塞尔曲线，无箭头） */
export interface BoardLine {
  id: string
  from: string
  to: string
  /** 🔴 改动 2026-10-12 · 起点输出端口 id（food：out/supply/sell；recipe：out/serve/sell；character：cook/sell；
   *  缺省 = 该侧首个端口或右缘中点），参照工坊资产节点 graph.ts */
  fromPort?: string
  /** 🔴 改动 2026-10-12 · 终点输入端口 id（food：in；recipe：in/ing-N/buy；character：buy；缺省同上） */
  toPort?: string
}

/** 画板文档（localStorage 持久化单元） */
export interface BoardDoc {
  title: string
  viewport: Viewport
  cards: BoardCard[]
  lines: BoardLine[]
  /** 🔴 改动 2026-10-13 · 拆出窗口 id（【框架约定 · 画板与 Tab 一体】Tab 拖出浏览器 = 独立窗口）：
   *  存在 = 该画板已拆出为独立浏览器窗口（?boardwin=<detachId>），Tab 坞显示 ⇗；点击 Tab 挂回时清除。
   *  挂在文档上而非拆分状态数组里：随文档走完 boards 数组的全部增删换位，身份不丢。 */
  detachId?: string
  /** 🔴 改动 2026-10-15 · Tab 稳定身份（坞内拖动换位 / React key）：随文档持久化，
   *  旧数据没有该字段时由 splitStore.loadSplitState 补发 */
  tid?: string
}

/** 缩放范围（任务约定约 0.25–4；Evoloop 原为 0.25–3） */
export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 4

/** 各卡片类型的最小尺寸（复刻 Evoloop CARD_MIN 中本次实现的子集） */
export const CARD_MIN: Record<CardType, { w: number; h: number }> = {
  note: { w: 180, h: 60 },
  todo: { w: 240, h: 96 },
  board: { w: 140, h: 92 },
  // 🔴 改动 2026-10-12 · food 卡尺寸改按形态取 FOOD_FORM_SIZE（此处仅作兜底，见 foodFormSize）
  food: { w: 200, h: 280 },
  // 🔴 改动 2026-10-12 · character / recipe 卡尺寸同样按形态取 assetFormSize（此处仅作兜底）
  character: { w: 200, h: 280 },
  recipe: { w: 200, h: 280 },
  // 🔴 改动 2026-10-12 · dish 卡同理（此处仅作兜底）
  dish: { w: 200, h: 280 },
  // 🔴 改动 2026-10-12 · market 市场卡同理（此处仅作兜底；节点形态 238×142 见 assetFormSize）
  market: { w: 200, h: 280 },
  // 🔴 改动 2026-10-12 · revenue 收益节点（金色，自动生成）：238 宽 + 表头/3 个资金输出端口/页脚
  revenue: { w: 238, h: 160 },
}

/** 🔴 改动 2026-10-12 · 收益节点固定尺寸（与 CARD_MIN.revenue 一致） */
export const REVENUE_SIZE = { w: 238, h: 160 }

export function cardMin(type: CardType): { w: number; h: number } {
  return CARD_MIN[type] ?? { w: 180, h: 60 }
}

/** 新建空画板文档（🔴 改动 2026-10-12 · 默认命名改「画板」——Tab 坞常驻的默认标签名）
 *  🔴 改动 2026-10-15 · 自带 Tab 稳定身份 tid（坞内拖动换位的 React key；主画板文档的 tid 不使用、无害） */
export function emptyBoard(title = '画板'): BoardDoc {
  return { title, tid: uid(), viewport: { x: 0, y: 0, zoom: 1 }, cards: [], lines: [] }
}

/** 卡片/连线 id 生成器（与 Evoloop 同规则） */
export function uid(): string {
  return 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
