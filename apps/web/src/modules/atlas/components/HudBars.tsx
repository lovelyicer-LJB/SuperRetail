// 🔴 改动 2026-10-12 · 版图底部 HUD：道具栏（上）+ 技能栏（下）。
// 尺寸遵循 design/tokens.css「HUD Layout」Token：单框 = 资产画板图标 96px，
// 技能栏固定 12 槽、栏宽 1152px（96×12，整除单框），道具栏同宽；随视口等比缩放。
// 🔴 改动 2026-10-12 · 道具栏接收「实物」面板拖出的资产（application/x-sr-asset），
// 指针进入栏体外扩 28px 判定带即吸附最近槽位（磁吸高亮）；栏内只渲染画板图标形态。
// 🔴 改动 2026-10-12 · 「尝试」更名「运行」，图标改为典型播放（向右三角形）。
// 🔴 改动 2026-10-12 · 技能选中态：左键点击技能（或按默认快捷键 1234QWERASDF）进入选中，
// 出现金色自定义鼠标（支出▲上三角 / 运行▶右三角 / 运转旋转沙漏）+ 技能图标中心 → 光标的连线；
// 再点一次 / 再按一次快捷键 / Esc / 右键 取消选中。
// 🔴 改动 2026-10-12 · 道具栏持久化：槽位内容（资产 id 数组）写 localStorage('superretail.atlas.hud.items.v1')，
// 切换界面（组件重挂载）与下次打开均从本地恢复；坏数据/未知 id 静默回退为空槽。
// 🔴 改动 2026-10-12 · 道具栏/技能栏可拖动互换上下位置：悬停栏体左侧浮现拖柄（grip），
// 按住拖过另一栏中线即预览换位，松手落定；Esc 取消拖回。顺序持久化 localStorage('superretail.atlas.hud.bar-order.v1')，
// 拖柄聚焦时按 ↑/↓ 也可直接互换（无障碍兜底）。
// 🔴 改动 2026-10-12 · 道具栏 12 槽默认快捷键 F1–F12（从左到右）：按下「使用」槽位道具（演示反馈）。
// window 捕获阶段 + stopImmediatePropagation，优先级高于项目内一切键盘处理；preventDefault 拦浏览器
// 内置行为（F1 帮助 / F3 查找 / F5 刷新 / F12 DevTools 等；F11 全屏 Chromium 不允许网页取消，属平台限制）。
// 仅页面聚焦时生效，非系统级全局快捷键。
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { GripVertical, HandCoins, Play, RefreshCw, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
// 🔴 改动 2026-10-13 · 技能释放与画板引擎联动（「运行」技能 → 金色虚线框内释放 → 激活收益线程）
import { getBoardEngine, subscribeEngineRegistry } from '@/modules/atlas/board/bridge'
// 技能框/道具框复用资产画板图标的符文木框（.asset-rune）与描边装饰（Vite 自动去重 CSS）
import { RuneOrnament } from '@/modules/workshop/asset-system/RuneOrnament'
import { AssetIcon } from '@/modules/workshop/asset-system/AssetForms'
import { demoFoodCards, type FoodCardData } from '@/modules/workshop/food-card/data'
import '@/modules/workshop/asset-system/asset-runes.css'
import './hud-bars.css'

/** 实物资产拖放 MIME：PhysicalPanel 拖出时写入（画板引擎的 text/plain = food:<id> 协议保持不变） */
export const ASSET_DND_MIME = 'application/x-sr-asset'

/** 槽位数与 tokens.css 的 --sr-hud-slots 对齐（12） */
const SLOT_COUNT = 12

/** 🔴 改动 2026-10-12 · 道具栏槽位的 localStorage 持久化键（版本号 v1，结构变更时递增） */
const ITEMS_STORAGE_KEY = 'superretail.atlas.hud.items.v1'

/** 🔴 改动 2026-10-12 · 从 localStorage 恢复道具栏槽位：
    存的只是资产 id 数组，按 id 回到 demoFoodCards 取实物；坏数据/未知 id 一律回退空槽 */
function loadPersistedItems(): (FoodCardData | null)[] {
  const empty = Array(SLOT_COUNT).fill(null) as (FoodCardData | null)[]
  try {
    const raw = window.localStorage.getItem(ITEMS_STORAGE_KEY)
    if (!raw) return empty
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return empty
    return empty.map((_, i) => {
      const id = parsed[i]
      if (typeof id !== 'string') return null
      return demoFoodCards.find((d) => d.id === id) ?? null
    })
  } catch {
    /* localStorage 不可用或数据损坏时仅内存态 */
    return empty
  }
}

/** 🔴 改动 2026-10-12 · 道具栏槽位写回 localStorage（只存 id，FoodCardData 本体仍以 demoFoodCards 为准） */
function persistItems(list: (FoodCardData | null)[]) {
  try {
    window.localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(list.map((it) => it?.id ?? null)))
  } catch {
    /* localStorage 不可用时仅内存态 */
  }
}

/** 🔴 改动 2026-10-12 · HUD 栏标识：items = 道具栏，skills = 技能栏 */
type HudBarId = 'items' | 'skills'

/** 🔴 改动 2026-10-12 · 道具栏/技能栏上下顺序的 localStorage 持久化键（版本号 v1，结构变更时递增） */
const BAR_ORDER_STORAGE_KEY = 'superretail.atlas.hud.bar-order.v1'

/** 🔴 改动 2026-10-12 · 从 localStorage 恢复栏顺序；缺省/坏数据回退默认（道具栏在上、技能栏在下） */
function loadBarOrder(): HudBarId[] {
  try {
    const raw = window.localStorage.getItem(BAR_ORDER_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.length === 2 && parsed.includes('items') && parsed.includes('skills')) {
      return parsed as HudBarId[]
    }
  } catch {
    /* localStorage 不可用或数据损坏时用默认顺序 */
  }
  return ['items', 'skills']
}

/** 🔴 改动 2026-10-12 · 栏顺序写回 localStorage */
function persistBarOrder(order: HudBarId[]) {
  try {
    window.localStorage.setItem(BAR_ORDER_STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* localStorage 不可用时仅内存态 */
  }
}

/** 🔴 改动 2026-10-12 · 栏拖动进行中的瞬时状态（dy 随指针直改，swap = 已越过另一栏中线的换位预览） */
interface BarDragState {
  id: HudBarId
  /** 指针相对按下点的垂直位移（px） */
  dy: number
  /** 两栏中心距（栏高 + 栏间距），拖动开始时实测 */
  step: number
  /** 是否已触发换位预览（另一栏滑向被拖栏原位） */
  swap: boolean
  /** 松手后的落定动画中：transform 过渡到最终位移，结束后才提交顺序并清零 */
  settling: boolean
}

/** 🔴 改动 2026-10-12 · 自动吸附判定范围：指针进入道具栏包围盒外扩该像素带内，即吸附到最近槽位 */
const SNAP_MARGIN = 28

/** 🔴 改动 2026-10-12 · 技能栏 12 槽默认快捷键（从左到右）：1234 QWER ASDF
    注：画板引擎的 Q/W/E/R 需按住 Tab 且作用于空槽 4-11，与本表不冲突；
    若后续技能填进 4-7 槽，需再协调 Tab+QWER 的优先级 */
const SKILL_HOTKEYS = ['1', '2', '3', '4', 'Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F'] as const

/** 技能选中态的自定义鼠标样式：上/右金色实心三角、旋转金色沙漏 */
type SkillCursorKind = 'up' | 'right' | 'hourglass'

/** 🔴 改动 2026-10-12 · 连线终点 = 光标图形中心点：指针坐标 + 下表偏移。
    与 hud-bars.css 的 .sr-skill-cursor-hotspot 偏移同步（图形 26px，中心 13px）：
    上三角热点在顶尖（中心在指针下方 10px）、右三角热点在右尖（中心在指针左方 10px）、沙漏热点即中心 */
const CURSOR_CENTER: Record<SkillCursorKind, { dx: number; dy: number }> = {
  up: { dx: 0, dy: 10 },
  right: { dx: -10, dy: 0 },
  hourglass: { dx: 0, dy: 0 },
}

/** 🔴 改动 2026-10-12 · 拖拽选中判定：按下后位移超过该阈值即视为拖拽选中（区别于点击切换） */
const DRAG_SELECT_THRESHOLD = 12

interface SkillDef {
  key: string
  name: string
  icon: LucideIcon
  /** 技能主题色（取自 tokens.css Accent 色板），驱动符文描边/微光/glyph 同色 */
  tone: string
  /** 选中态鼠标样式（金色三角尖端 / 沙漏中心为热点） */
  cursor: SkillCursorKind
}

/** 🔴 改动 2026-10-12 · 首发 3 技能：支出（▲）/ 运行（▶，原「尝试」）/ 运转（沙漏），占技能栏前 3 槽 */
const SKILLS: SkillDef[] = [
  { key: 'spend', name: '支出', icon: HandCoins, tone: 'var(--sr-accent-mango-tango)', cursor: 'up' },
  { key: 'play', name: '运行', icon: Play, tone: 'var(--sr-accent-azure)', cursor: 'right' },
  { key: 'operate', name: '运转', icon: RefreshCw, tone: 'var(--sr-accent-sea-green)', cursor: 'hourglass' },
]

/** 🔴 改动 2026-10-12 · 道具栏 12 槽默认快捷键（从左到右）：F1–F12。
    监听在 window 捕获阶段并 stopImmediatePropagation，优先级高于项目内一切键盘处理（画板引擎/壳层），
    也高于浏览器内置行为（F1 帮助 / F3 查找 / F5 刷新 / F12 DevTools 等被 preventDefault 拦下；
    F11 全屏在 Chromium 系不可被网页取消，属平台限制）。仅页面聚焦时生效，非系统级全局快捷键 */
const ITEM_HOTKEYS = Array.from({ length: 12 }, (_, i) => `F${i + 1}`)

/** 空槽：凹槽插座（技能栏第 4–12 槽 / 道具栏未填槽位）；空槽也标注默认快捷键 */
function EmptySlot({ label, snap, hotkey }: { label: string; snap?: boolean; hotkey?: string }) {
  return (
    <span className={cn('sr-hud-slot is-empty', snap && 'is-snap')} role="img" aria-label={label}>
      {hotkey && <span className="sr-hud-slot-index" aria-hidden="true">{hotkey}</span>}
    </span>
  )
}

/** 道具槽：只显示资产的画板图标形态（AssetIcon variant="board"），
    吸附命中/快捷键触发时充能发光；悬停可移除（资产回到「实物」面板，不销毁）；
    🔴 改动 2026-10-12 · 槽位右下角标注默认快捷键 F1–F12（与技能栏快捷键位同式） */
function ItemSlot({
  asset,
  index,
  snap,
  onRemove,
}: {
  asset: FoodCardData | null
  index: number
  snap: boolean
  onRemove: (index: number) => void
}) {
  const hotkey = ITEM_HOTKEYS[index]
  if (!asset) return <EmptySlot label={`道具槽 ${index + 1} · 空 · 快捷键 ${hotkey}`} snap={snap} hotkey={hotkey} />
  return (
    <span
      className={cn('sr-hud-slot sr-hud-item', snap && 'is-snap')}
      aria-label={`道具槽 ${index + 1} · ${asset.name} · 快捷键 ${hotkey}`}
    >
      {/* 只允许图标形态（画板图标）：尺寸充满槽位，随栏宽等比缩放 */}
      <AssetIcon asset={asset} size={96} variant="board" energized={snap} />
      <span className="sr-hud-slot-index" aria-hidden="true">{hotkey}</span>
      <button
        type="button"
        className="sr-hud-item-remove"
        onClick={() => onRemove(index)}
        aria-label={`从道具栏移除 ${asset.name}`}
        title={`移除 ${asset.name}`}
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </span>
  )
}

/** 🔴 改动 2026-10-12 · 金色渐变（选中态自定义鼠标共用，一次只渲染一个光标，id 不冲突） */
function GoldDefs() {
  return (
    <defs>
      <linearGradient id="sr-skill-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe9a8" />
        <stop offset="0.55" stopColor="#f7c948" />
        <stop offset="1" stopColor="#d9960a" />
      </linearGradient>
    </defs>
  )
}

/** 🔴 改动 2026-10-12 · 技能选中态自定义鼠标图形：金色实心三角（上▲/右▶）与金色沙漏（旋转由 CSS 驱动） */
function SkillCursorGlyph({ kind }: { kind: SkillCursorKind }) {
  if (kind === 'up') {
    return (
      <svg viewBox="0 0 24 24" className="sr-skill-cursor-glyph">
        <GoldDefs />
        <polygon points="12,2.5 22,20.5 2,20.5" fill="url(#sr-skill-gold)" stroke="#7a5200" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'right') {
    return (
      <svg viewBox="0 0 24 24" className="sr-skill-cursor-glyph">
        <GoldDefs />
        <polygon points="4,2.5 21,12 4,21.5" fill="url(#sr-skill-gold)" stroke="#7a5200" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="sr-skill-cursor-glyph is-hourglass">
      <GoldDefs />
      <path
        d="M5 2.5h14a1 1 0 0 1 1 1v2.6c0 .5-.16.98-.46 1.38L14.6 12l4.94 4.52c.3.4.46.88.46 1.38v2.6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.6c0-.5.16-.98.46-1.38L9.4 12 4.46 7.48A2.25 2.25 0 0 1 4 6.1V3.5a1 1 0 0 1 1-1Z"
        fill="url(#sr-skill-gold)"
        stroke="#7a5200"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 技能框：96px 正方形符文木框（asset-rune）+ 顶部玻璃名条 + 中央 glyph + 快捷键位标注。
    🔴 改动 2026-10-12 · 左键点击进入/取消选中态（连线源头 = 本框中心点）；
    按住拖出 DRAG_SELECT_THRESHOLD 也可直接选中（拖出相应鼠标样式），释放后保持选中 */
function SkillSlot({
  skill,
  index,
  selected,
  slotRef,
  onToggle,
  onDragSelect,
}: {
  skill: SkillDef
  index: number
  selected: boolean
  slotRef: (el: HTMLButtonElement | null) => void
  onToggle: (index: number) => void
  onDragSelect: (index: number) => void
}) {
  const Icon = skill.icon
  /** 拖拽选中后的 click 抑制：pointer capture 使释放点的 click 仍派发到本按钮，拖拽已选中则不可再切换 */
  const suppressClickRef = useRef(false)

  /** 🔴 改动 2026-10-12 · 拖拽选中：左键按下后位移超阈值即选中本技能，自定义鼠标随拖随出 */
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startY = e.clientY
    let dragged = false
    const move = (ev: PointerEvent) => {
      if (dragged) return
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) >= DRAG_SELECT_THRESHOLD) {
        dragged = true
        onDragSelect(index)
      }
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      if (dragged) suppressClickRef.current = true
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const onClick = () => {
    // 拖拽选中后的那次 click 吞掉，否则刚拖选中的技能会被立即切换掉
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onToggle(index)
  }

  return (
    <button
      ref={slotRef}
      type="button"
      className={cn('sr-hud-slot sr-hud-skill asset-rune', selected && 'is-selected')}
      style={{ '--skill-tone': skill.tone } as CSSProperties}
      aria-label={`技能槽 ${index + 1} · ${skill.name} · 快捷键 ${SKILL_HOTKEYS[index]}`}
      aria-pressed={selected}
      title={`${skill.name}（${SKILL_HOTKEYS[index]}）· 点击或拖出选中`}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <span className="sr-hud-skill-glyph" aria-hidden="true">
        {/* 运行的播放三角用实心填充（典型播放图标） */}
        <Icon strokeWidth={1.9} fill={skill.key === 'play' ? 'currentColor' : 'none'} />
      </span>
      <span className="sr-hud-skill-name">{skill.name}</span>
      <span className="sr-hud-slot-index" aria-hidden="true">{SKILL_HOTKEYS[index]}</span>
      <RuneOrnament />
    </button>
  )
}

/**
 * 版图底部 HUD —— 道具栏在上、技能栏在下，居中悬浮于画板之上。
 * data-board-overlay：画板引擎把 HUD 视为画板作用域（Del 删除卡片等快捷键不失效）。
 */
export function HudBars({ dark }: { dark: boolean }) {
  // 🔴 改动 2026-10-12 · 道具栏初始值从 localStorage 恢复（换界面重挂载 / 下次打开不丢）
  const [items, setItems] = useState<(FoodCardData | null)[]>(loadPersistedItems)
  /** 🔴 改动 2026-10-12 · 最新槽位内容的 ref 镜像：F1–F12 快捷键监听（挂载一次）经 ref 读槽位，避免闭包过期 */
  const itemsRef = useRef(items)
  const [snapSlot, setSnapSlot] = useState<number | null>(null)
  const itemBarRef = useRef<HTMLDivElement>(null)
  /** 资产拖动进行中：接收罩（栏体外扩判定带）此时才接管指针，平时不挡画板操作 */
  const [assetDrag, setAssetDrag] = useState(false)
  /** 🔴 改动 2026-10-12 · 快捷键触发的槽位充能一闪（复用 is-snap 磁吸环样式），260ms 自动熄灭 */
  const [itemFlash, setItemFlash] = useState<{ slot: number; key: number } | null>(null)
  const itemFlashTimerRef = useRef(0)
  // 🔴 改动 2026-10-12 · 技能选中态：选中的槽位下标（null = 未选中）
  const [selected, setSelected] = useState<number | null>(null)
  const skillSlotRefs = useRef<(HTMLButtonElement | null)[]>([])
  const cursorRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const originRef = useRef<SVGCircleElement>(null)
  /** 指针真实即时位置（常驻监听）：选中/切换技能初始化时锚定于此，自定义鼠标不跳变 */
  const pointerRef = useRef({ x: 0, y: 0 })
  /** 🔴 改动 2026-10-13 · 释放逻辑所需引用：HUD 根（判定释放点是否落在栏上）/ 最新选中下标（释放监听闭包）/ 释放后吞掉下一次技能框 click */
  const hudRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<number | null>(null)
  const skipSlotClickRef = useRef(false)
  /** 🔴 改动 2026-10-13 · 技能释放反馈提示（命中/未命中/占位技能），2s 自动消失 */
  const [hint, setHint] = useState<{ text: string; key: number } | null>(null)
  const hintTimerRef = useRef(0)
  const flashHint = (text: string) => {
    window.clearTimeout(hintTimerRef.current)
    setHint({ text, key: Date.now() })
    hintTimerRef.current = window.setTimeout(() => setHint(null), 2000)
  }

  // 🔴 改动 2026-10-12 · 道具栏/技能栏上下顺序：从 localStorage 恢复（默认道具栏在上）
  const [barOrder, setBarOrder] = useState<HudBarId[]>(loadBarOrder)
  /** 栏拖动瞬时态（null = 未在拖）；落定动画期间的计时器用于动画结束后再提交顺序 */
  const [barDrag, setBarDrag] = useState<BarDragState | null>(null)
  const barSettleTimerRef = useRef(0)

  /** 🔴 改动 2026-10-12 · 提交新顺序并持久化（拖动落定 / 拖柄 ↑↓ 键共用） */
  const applyBarOrder = (next: HudBarId[]) => {
    setBarOrder(next)
    persistBarOrder(next)
  }

  // 🔴 改动 2026-10-12 · 卸载时清掉落定计时器，避免组件销毁后还提交 setState
  useEffect(
    () => () => {
      window.clearTimeout(barSettleTimerRef.current)
      window.clearTimeout(itemFlashTimerRef.current)
    },
    [],
  )

  /** 🔴 改动 2026-10-12 · 快捷键触发的槽位充能一闪：复用 is-snap 磁吸环，260ms 熄灭（连按重触发） */
  const flashItemSlot = (slot: number) => {
    window.clearTimeout(itemFlashTimerRef.current)
    setItemFlash({ slot, key: Date.now() })
    itemFlashTimerRef.current = window.setTimeout(() => setItemFlash(null), 260)
  }

  /** 🔴 改动 2026-10-12 · 拖柄按下开始栏拖动：指针捕获 + 垂直追踪，
      拖过另一栏中线（step/2）即预览换位；松手落定提交，Esc/指针取消则拖回原位 */
  const startBarDrag = (id: HudBarId) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || barSettleTimerRef.current) return // 落定动画进行中不响应新拖动
    e.preventDefault()
    // 技能选中态下抓拖柄 = 先取消选中：否则拖动结束的 pointerup 会被当作技能释放（误报未命中）
    setSelected(null)
    const grip = e.currentTarget
    grip.setPointerCapture(e.pointerId)
    const wraps = hudRef.current?.querySelectorAll('.sr-hud-barwrap')
    if (!wraps || wraps.length < 2) return
    // 两栏中心距 = 上栏顶到下栏顶（栏高 + 栏间距，含道具栏接收罩外扩也不影响：barwrap 盒 = 栏盒）
    const step = Math.abs(wraps[0].getBoundingClientRect().top - wraps[1].getBoundingClientRect().top)
    const startY = e.clientY
    const dir = barOrder[0] === id ? 1 : -1 // 上栏向下拖为正，下栏向上拖为正
    let cur = { dy: 0, swap: false }
    setBarDrag({ id, dy: 0, step, swap: false, settling: false })

    const finish = (commit: boolean) => {
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', up)
      grip.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key, true)
      const swap = commit && cur.swap
      // 落定目标：换位 → 平移到另一栏位置（±step），未换位 → 回到 0；动画结束后统一提交并清零
      const finalDy = swap ? dir * step : 0
      setBarDrag({ id, dy: finalDy, step, swap, settling: true })
      barSettleTimerRef.current = window.setTimeout(() => {
        barSettleTimerRef.current = 0
        if (swap) applyBarOrder([...barOrder].reverse())
        setBarDrag(null)
      }, 220) // 与 hud-bars.css 的 .sr-hud-barwrap transform 过渡时长对齐
    }
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY
      const swap = dir > 0 ? dy > step / 2 : dy < -step / 2
      cur = { dy, swap }
      setBarDrag({ id, dy, step, swap, settling: false })
    }
    const up = () => finish(true)
    const cancel = () => finish(false)
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.preventDefault()
      ev.stopPropagation() // 捕获阶段拦截：Esc 只取消栏拖动，不触达技能选中/画板
      finish(false)
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', up)
    grip.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key, true)
  }

  /** 🔴 改动 2026-10-12 · 拖柄键盘兜底：聚焦时 ↑/↓ 直接互换两栏 */
  const onGripKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    if (barSettleTimerRef.current) return
    applyBarOrder([...barOrder].reverse())
  }

  /** 🔴 改动 2026-10-12 · 栏容器位移：被拖栏跟随指针（dy），另一栏在换位预览时滑向被拖栏原位（∓step） */
  const barWrapStyle = (id: HudBarId): CSSProperties | undefined => {
    if (!barDrag) return undefined
    if (barDrag.id === id) return { transform: `translateY(${barDrag.dy}px)` }
    if (!barDrag.swap) return undefined
    const dir = barOrder[0] === barDrag.id ? 1 : -1
    return { transform: `translateY(${-dir * barDrag.step}px)` }
  }

  const barWrapClass = (id: HudBarId) =>
    cn('sr-hud-barwrap', barDrag?.id === id && 'is-dragging', barDrag?.id === id && barDrag.settling && 'is-settling')

  /** 🔴 改动 2026-10-12 · 栏拖柄：悬停栏体浮现于左缘外侧；拖动互换两栏（键盘 ↑↓ 同效） */
  const renderGrip = (id: HudBarId) => (
    <button
      type="button"
      className="sr-hud-grip"
      aria-label={id === 'items' ? '拖动道具栏与技能栏互换位置' : '拖动技能栏与道具栏互换位置'}
      title="拖动互换道具栏/技能栏位置（聚焦后按 ↑↓ 也可）"
      onPointerDown={startBarDrag(id)}
      onKeyDown={onGripKeyDown}
    >
      <GripVertical size={13} strokeWidth={2.2} aria-hidden />
    </button>
  )

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  // 🔴 改动 2026-10-12 · 道具栏槽位变化即写回 localStorage（拖入 / 替换 / 移除都经 setItems 汇聚于此），
  // 同步 itemsRef 镜像供 F1–F12 快捷键监听读取（监听只挂载一次，经 ref 避免闭包过期）
  useEffect(() => {
    itemsRef.current = items
    persistItems(items)
  }, [items])

  // 🔴 改动 2026-10-12 · 常驻指针追踪：无论是否选中都记录最新指针位置，
  // 保证选中态覆盖层每次（重）初始化都能锚定真实即时位置
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const selectedSkill = selected !== null ? SKILLS[selected] : null
  /** 🔴 改动 2026-10-13 · 点击切换：若上一次释放刚结束（释放点落在技能框本体上），吞掉这次 click 避免立即重新选中 */
  const handleToggle = (index: number) => {
    if (skipSlotClickRef.current) {
      skipSlotClickRef.current = false
      if (index === selectedRef.current) return
    }
    setSelected((s) => (s === index ? null : index))
  }
  /** 🔴 改动 2026-10-12 · 拖拽选中：直接置为选中（非开关），拖出即得相应鼠标样式 */
  const dragSelectSkill = (index: number) => setSelected(index)

  // 🔴 改动 2026-10-13 · 技能选中态同步给画板引擎：选中「运行」时高亮可激活的金色虚线框；
  // 选中期间引擎拦截画板手势（下一次左键是技能释放）。引擎重挂载（拆分/切 Tab）时经注册订阅重新同步
  useEffect(() => {
    getBoardEngine()?.setSkillArmed(selected !== null ? (SKILLS[selected]?.key ?? null) : null)
  }, [selected])
  useEffect(
    () =>
      subscribeEngineRegistry(() => {
        getBoardEngine()?.setSkillArmed(selectedRef.current !== null ? (SKILLS[selectedRef.current]?.key ?? null) : null)
      }),
    [],
  )

  // 监听全局 dragstart/dragend：识别 ASSET_DND_MIME 拖动，
  // 仅在此期间激活道具栏的吸附判定带（dragend 由源元素冒泡，无论落点何处都会触发）
  useEffect(() => {
    const onDragStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes(ASSET_DND_MIME)) setAssetDrag(true)
    }
    const onDragEnd = () => {
      setAssetDrag(false)
      setSnapSlot(null)
    }
    window.addEventListener('dragstart', onDragStart)
    window.addEventListener('dragend', onDragEnd)
    return () => {
      window.removeEventListener('dragstart', onDragStart)
      window.removeEventListener('dragend', onDragEnd)
    }
  }, [])

  // 🔴 改动 2026-10-12 · 技能默认快捷键 1234QWERASDF：按下选中对应槽位技能（再按取消）；
  // 输入框内 / 组合键不响应；空槽位无技能可选中，直接忽略
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      const idx = SKILL_HOTKEYS.indexOf(e.key.toUpperCase() as (typeof SKILL_HOTKEYS)[number])
      if (idx === -1 || !SKILLS[idx]) return
      e.preventDefault()
      setSelected((s) => (s === idx ? null : idx))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 🔴 改动 2026-10-12 · 道具默认快捷键 F1–F12（从左到右）：按下「使用」对应槽位道具
  // （演示反馈：槽位充能一闪 + 提示；空槽仅提示）。优先级全项目最高——window 捕获阶段 +
  // stopImmediatePropagation：画板引擎/壳层的 keydown 一律看不到该事件；preventDefault 同时
  // 拦下浏览器内置行为（F1 帮助 / F3 查找 / F5 刷新 / F12 DevTools 等；F11 全屏 Chromium 不允许
  // 网页取消，属平台限制）。仅本页聚焦时生效（非系统级全局快捷键）；输入框内 / 组合键不响应
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = ITEM_HOTKEYS.indexOf(e.key)
      if (idx === -1) return
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      e.preventDefault() // 拦浏览器内置行为（帮助/查找/刷新/DevTools 等）
      e.stopPropagation() // 拦 document 上的画板引擎等监听器
      e.stopImmediatePropagation() // 拦 window 上后注册的同阶段监听器
      const asset = itemsRef.current[idx]
      flashItemSlot(idx)
      flashHint(asset ? `使用 ${asset.name} · 演示道具，暂无消耗效果` : `道具槽 ${idx + 1}（${ITEM_HOTKEYS[idx]}）· 空`)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  // 🔴 改动 2026-10-12 · 选中态：隐藏系统鼠标，渲染金色自定义鼠标 + 技能中心 → 光标连线。
  // 位置经 ref 直写 DOM（60Hz 不触发 React 重渲染）；Esc / 右键捕获阶段拦截取消（不触达画板）
  useEffect(() => {
    if (selected === null) return
    const slot = skillSlotRefs.current[selected]
    document.body.classList.add('sr-skill-casting')

    const update = (x: number, y: number) => {
      const r = slot?.getBoundingClientRect()
      if (!r) return
      const x1 = r.left + r.width / 2
      const y1 = r.top + r.height / 2
      // 🔴 改动 2026-10-12 · 连线终点 = 光标图形中心点（指针坐标 + 光标中心偏移）
      const c = CURSOR_CENTER[SKILLS[selected].cursor]
      if (cursorRef.current) cursorRef.current.style.transform = `translate(${x}px, ${y}px)`
      if (lineRef.current) {
        lineRef.current.setAttribute('x1', String(x1))
        lineRef.current.setAttribute('y1', String(y1))
        lineRef.current.setAttribute('x2', String(x + c.dx))
        lineRef.current.setAttribute('y2', String(y + c.dy))
      }
      if (originRef.current) {
        originRef.current.setAttribute('cx', String(x1))
        originRef.current.setAttribute('cy', String(y1))
      }
    }
    // 🔴 改动 2026-10-12 · 初始化锚定指针真实即时位置（不再落技能中心）：
    // 选中/切换技能瞬间自定义鼠标原地换形，不跳变；连线源头仍取技能图标中心
    update(pointerRef.current.x, pointerRef.current.y)

    const onMove = (e: MouseEvent) => update(e.clientX, e.clientY)
    const onKeyCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation() // 捕获阶段拦截：Esc 只取消选中，不触达画板选择
      setSelected(null)
    }
    const onCtxCapture = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation() // 右键取消选中，且不弹出画板右键菜单
      setSelected(null)
    }
    // 🔴 改动 2026-10-13 · 统一释放逻辑：三种用法都归结为「选中技能后，左键松开 = 在松开点释放」——
    // ① 快捷键选中 + 左键点击（快捷键+鼠标左键）；② 按住技能拖出（拖拽中即选中）+ 在框内松开；
    // ③ 点击技能选中，再在框内点击。释放点落在 HUD 上 = 取消选中；
    // 「运行」命中未激活收益虚线框 → 激活为收益线程；「运转」命中已形成循环的实线框 → 激活为收益循环。
    const onRelease = (e: PointerEvent) => {
      if (e.button !== 0) return
      const idx = selectedRef.current
      if (idx === null) return
      const skill = SKILLS[idx]
      const hud = hudRef.current?.getBoundingClientRect()
      const overHud = !!hud && e.clientX >= hud.left && e.clientX <= hud.right && e.clientY >= hud.top && e.clientY <= hud.bottom
      if (overHud) {
        // 释放在技能框本体上 = 取消选中；吞掉随后的 click 以免被 handleToggle 立即重新选中
        if (e.target instanceof Element && e.target.closest('.sr-hud-skill')) skipSlotClickRef.current = true
        setSelected(null)
        return
      }
      let message: string | null = null
      if (skill.key === 'play') {
        const ok = getBoardEngine()?.activateChainAt(e.clientX, e.clientY, 'play') ?? false
        message = ok ? '收益线程 · 已激活' : '未命中收益虚线框 · 已取消'
      } else if (skill.key === 'operate') {
        const ok = getBoardEngine()?.activateChainAt(e.clientX, e.clientY, 'operate') ?? false
        message = ok ? '收益循环 · 已激活' : '未命中循环实线框 · 已取消'
      } else {
        message = `${skill.name} · 演示技能，暂无作用对象`
      }
      setSelected(null)
      if (message) flashHint(message)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKeyCapture, true)
    window.addEventListener('contextmenu', onCtxCapture, true)
    window.addEventListener('pointerup', onRelease)
    return () => {
      document.body.classList.remove('sr-skill-casting')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKeyCapture, true)
      window.removeEventListener('contextmenu', onCtxCapture, true)
      window.removeEventListener('pointerup', onRelease)
    }
  }, [selected])

  /** 自动吸附判定：指针在栏包围盒外扩 SNAP_MARGIN 带内 → 返回最近槽位下标，否则 null */
  const hitSnap = (clientX: number, clientY: number): number | null => {
    const bar = itemBarRef.current
    if (!bar) return null
    const r = bar.getBoundingClientRect()
    if (
      clientX < r.left - SNAP_MARGIN ||
      clientX > r.right + SNAP_MARGIN ||
      clientY < r.top - SNAP_MARGIN ||
      clientY > r.bottom + SNAP_MARGIN
    ) {
      return null
    }
    const slotW = r.width / SLOT_COUNT
    return Math.min(SLOT_COUNT - 1, Math.max(0, Math.floor((clientX - r.left) / slotW)))
  }

  /** 吸附判定（dragenter/dragover 共用）：进入判定带立即高亮，不等首个 dragover（Chromium 静止时节流） */
  const handleItemDragEnterOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(ASSET_DND_MIME)) return
    e.preventDefault() // 允许放置
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setSnapSlot(hitSnap(e.clientX, e.clientY))
  }

  const handleItemDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // 在槽位/判定带内移动时不闪断高亮，真正离开接收罩才清除
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
    setSnapSlot(null)
  }

  const handleItemDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(ASSET_DND_MIME)) return
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData(ASSET_DND_MIME)
    const asset = demoFoodCards.find((d) => d.id === id) ?? null
    const idx = hitSnap(e.clientX, e.clientY)
    setSnapSlot(null)
    if (!asset || idx === null) return
    // 落入已占用槽位 = 替换（资产来自「实物」面板无限供给，原槽位资产回到面板）
    setItems((list) => list.map((it, i) => (i === idx ? asset : it)))
  }

  const removeItem = (index: number) => {
    setItems((list) => list.map((it, i) => (i === index ? null : it)))
  }

  return (
    <div
      ref={hudRef}
      className={cn('sr-hud', dark && 'is-dark')}
      data-board-overlay
      onDragOver={(e) => e.stopPropagation()}
      onDrop={(e) => e.stopPropagation()}
    >
      {/* 🔴 改动 2026-10-12 · 两栏按 barOrder 渲染（默认道具栏上、技能栏下）；
          每栏外包 sr-hud-barwrap（盒与栏盒一致），拖动时经 transform 位移，落定后提交顺序。
          道具栏：与技能栏同宽（1152px），12 槽；接收「实物」面板拖出的资产（自动吸附最近槽位），
          只渲染画板图标形态。外层 sr-hud-itemdrop = 外扩 --sr-hud-snap-margin 的拖放接收罩，
          仅资产拖动期间（is-active）接管指针，吸附判定带内释放也能入槽 */}
      {barOrder.map((bar) =>
        bar === 'items' ? (
          <div key="items" className={barWrapClass('items')} style={barWrapStyle('items')}>
            <div
              className={cn('sr-hud-itemdrop', assetDrag && 'is-active')}
              onDragEnter={handleItemDragEnterOver}
              onDragOver={handleItemDragEnterOver}
              onDragLeave={handleItemDragLeave}
              onDrop={handleItemDrop}
            >
              <div ref={itemBarRef} className="sr-hud-bar" role="toolbar" aria-label="道具栏" aria-orientation="horizontal">
                {items.map((asset, i) => (
                  <ItemSlot
                    key={`item-${i}`}
                    asset={asset}
                    index={i}
                    snap={snapSlot === i || itemFlash?.slot === i}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            </div>
            {renderGrip('items')}
          </div>
        ) : (
          <div key="skills" className={barWrapClass('skills')} style={barWrapStyle('skills')}>
            {/* 🔴 改动 2026-10-12 · 技能栏：固定 12 槽（快捷键 1234QWERASDF），
                支出 / 运行 / 运转 占前 3 槽；左键点击技能进入选中态（自定义鼠标 + 连线） */}
            <div className="sr-hud-bar" role="toolbar" aria-label="技能栏" aria-orientation="horizontal">
              {Array.from({ length: SLOT_COUNT }, (_, i) =>
                SKILLS[i] ? (
                  <SkillSlot
                    key={SKILLS[i].key}
                    skill={SKILLS[i]}
                    index={i}
                    selected={selected === i}
                    slotRef={(el) => {
                      skillSlotRefs.current[i] = el
                    }}
                    onToggle={handleToggle}
                    onDragSelect={dragSelectSkill}
                  />
                ) : (
                  <EmptySlot key={`skill-empty-${i}`} hotkey={SKILL_HOTKEYS[i]} label={`技能槽 ${i + 1} · 空 · 快捷键 ${SKILL_HOTKEYS[i]}`} />
                ),
              )}
            </div>
            {renderGrip('skills')}
          </div>
        ),
      )}

      {/* 🔴 改动 2026-10-13 · 技能释放反馈：命中/未命中/占位提示，浮于技能栏上方，2s 自动消失 */}
      {hint && (
        <div key={hint.key} className="sr-skill-hint" role="status">
          <Sparkles size={13} /> {hint.text}
        </div>
      )}

      {/* 🔴 改动 2026-10-12 · 技能选中态覆盖层：金色自定义鼠标 + 技能图标中心 → 光标连线。
          pointer-events:none 不挡操作；位置经 ref 直写（见上方 effect）。
          经 portal 挂到 body：.sr-hud 自身有 translateX(-50%) transform，
          直接在内部用 position:fixed 会相对 HUD 而非视口定位（光标/连线会被甩到屏外） */}
      {selectedSkill &&
        createPortal(
          <div className="sr-skill-cast-layer" aria-hidden="true">
            <svg className="sr-skill-link-layer">
              <line ref={lineRef} className="sr-skill-link-line" />
              <circle ref={originRef} className="sr-skill-link-origin" r="3.5" />
            </svg>
            <div ref={cursorRef} className="sr-skill-cursor">
              <span className={cn('sr-skill-cursor-hotspot', `is-${selectedSkill.cursor}`)}>
                <SkillCursorGlyph kind={selectedSkill.cursor} />
              </span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
