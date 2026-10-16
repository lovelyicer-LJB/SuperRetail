import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
// 🔴 改动 2026-10-10 · 版图页最底层接入无限画板（复刻 Evoloop：z-0，低于地球/放置组件/浮窗/预览）。
// 🔴 改动 2026-10-12 · 已放置组件（图表浮窗拖入的组件/图表）选中 + Del/Backspace 删除：
// 画板框架「一切可拖入画板的东西都必须支持 Del 删除」约定的页面层实现（另一套是引擎卡片删除，
// 详见 board/engine.ts 头注【框架约定 · Del 删除】；两层选择互斥，Del 不同时删两边）。
// 🔴 改动 2026-10-13 · 已放置组件画板世界坐标化 + 右键「屏幕钉」：
// 画板框架「画板坐标 + 屏幕钉」约定的页面层实现（详见 board/engine.ts 头注【框架约定 · 画板坐标 + 屏幕钉】）。
import { BoardCanvas } from './board/BoardCanvas'
// 🔴 改动 2026-10-11 · 拆分视图 v2：拆出的窗格是独立空白画板（Tab1/Tab2…），不再共享主画板文档。
import type { BoardEngine } from './board/engine'
import { emptyBoard, uid, type BoardDoc, type Viewport } from './board/types'
// 🔴 改动 2026-10-13 · 成为主画板互换文档时深拷贝旧主画板（sanitizeDoc 全量清洗复制）
import { sanitizeDoc } from './board/storage'
// 🔴 改动 2026-10-12 · 已放置组件选中时经引擎桥清空画板卡片选择（getBoardEngine 惰性读取，避免 ref 被 lint 追踪进 effect）
// 🔴 改动 2026-10-13 · 放置组件画板坐标化：subscribeBoardView 跟随视口（x/y/zoom），世界坐标 ⇄ 屏幕坐标换算
import { getBoardEngine, subscribeBoardView, subscribeEngineRegistry } from './board/bridge'
import {
  boardNode,
  collectLeaves,
  containsTab,
  emptySplitState,
  groupNode,
  leafCount,
  loadSplitState,
  mainBoardNode,
  nodeAt,
  removeLeaf,
  removeSplitState,
  saveSplitState,
  SPLIT_STORAGE_KEY,
  setNodeAt,
  splitDirectionForLeaf,
  type AtlasSplitState,
  type SplitDirection,
  type SplitNode,
} from './board/splitStore'
// 🔴 改动 2026-10-01 · 版图主工作区正中接入可拖拽的 3D 地球。
import { AtlasGlobe } from './components/AtlasGlobe'
// 🔴 改动 2026-10-12 · 图表「地图」（单层原生高德底图，GI 点位聚合 / 悬停信息 / 点击按注册级别缩放）
import { AtlasMap } from './map/AtlasMap'
import { useOutletContext } from 'react-router'
import type { ShellOutletContext } from '@/components/shell/AppShell'
import { X } from 'lucide-react'
// 🔴 改动 2026-10-12 · 版图底部 HUD：道具栏（上）+ 技能栏（下），居中悬浮于画板之上
import { HudBars } from './components/HudBars'
// 🔴 改动 2026-10-09 · 组件引用切换为契约注册表 + WidgetHost（架构 §09）
import { WidgetHost } from '@/widgets/WidgetHost'
import { getAtlasWidget } from '@/modules/atlas/widgets/registry'
import { useLang, type DictKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * 版图 Atlas —— 图表工作空间
 * Pixso「Widgets & Indicator」页组件 1:1 还原展示区
 */

/** 🔴 改动 2026-10-10 · charts 列表 → 画板拖放的 dataTransfer MIME（仅本工作区内部识别） */
const DND_MIME = 'application/x-sr-atlas-widget'

interface WidgetEntry {
  nodeId: string
  name: string
  w: number
  h: number
  render: () => React.ReactNode
  /** 大尺寸组件独占一行（xl 断点下跨两列） */
  span2?: boolean
  /** WidgetArena 最大宽度（默认 720） */
  maxW?: number
  /** 卡片圆角（默认 12；XS 系 9-10，XL 系 20） */
  radius?: number
  /** 🔴 改动 2026-10-12 · 大图预览可交互（地图等需要点击/缩放的组件） */
  interactive?: boolean
}

/** 🔴 改动 2026-10-13 · 已放置到画板的组件实例：坐标为画板世界坐标（wx/wy，随画布平移/缩放），
 *  渲染时经引擎 worldToClient 换算到屏幕；屏幕钉（pinned）时改用容器内屏幕坐标 sx/sy，钉住不随画布移动 */
interface PlacedItem {
  key: number
  wgt: WidgetEntry
  /** 画板世界坐标（未钉住时生效） */
  wx: number
  wy: number
  /** 基础缩放（zoom = 1 时的展示比例，落点时按可视区 60% 上限算出） */
  scale: number
  /** 屏幕钉：true = 钉在屏幕上，拖动画布不随画布移动 */
  pinned?: boolean
  /** 钉住时的容器内屏幕 CSS 像素（相对页面画板容器） */
  sx?: number
  sy?: number
  /** 钉住时刻的画板缩放比：钉住期间视觉尺寸冻结（scale × pinZoom） */
  pinZoom?: number
}

/** 🔴 改动 2026-10-09 · 展示条目由契约注册表构造: 名称/尺寸/溯源来自 manifest, 渲染经 WidgetHost（错误边界 + 契约标记 + 数据注入位） */
function entry(id: string, extra?: Partial<WidgetEntry>): WidgetEntry {
  const def = getAtlasWidget(id)
  return {
    nodeId: def.manifest.design?.nodeId ?? id,
    name: def.manifest.name,
    w: def.manifest.defaultSize.w,
    h: def.manifest.defaultSize.h,
    render: () => <WidgetHost def={def} />,
    ...extra,
  }
}

/** Widgets & Indicator 页 24 个组件（顺序即设计稿盘点顺序） */
const WIDGETS: WidgetEntry[] = [
  entry('atlas.income-l'),
  entry('atlas.expense-l'),
  entry('atlas.cashback-l'),
  entry('atlas.transfers-l'),
  entry('atlas.progress-l'),
  entry('atlas.crypto-l'),
  entry('atlas.portfolio-m'),
  entry('atlas.spend-week-m'),
  entry('atlas.total-cashback-m'),
  entry('atlas.income-m'),
  entry('atlas.expense-m'),
  entry('atlas.total-m'),
  entry('atlas.progress-s'),
  entry('atlas.expense-s'),
  entry('atlas.category-s'),
  entry('atlas.income-s'),
  entry('atlas.cashback-s'),
  entry('atlas.credit-limit-s'),
  entry('atlas.income2-xs', { radius: 10 }),
  entry('atlas.income-xs', { radius: 9 }),
  entry('atlas.last-transfer-xs', { radius: 9 }),
  entry('atlas.overall-balance-xl', { span2: true, maxW: 1200, radius: 20 }),
  entry('atlas.spending-trend-xl', { maxW: 720, radius: 28 }),
  entry('atlas.spending-trend-m'),
]

/** 🔴 改动 2026-10-11 · 3D 地球 Widget 形态：方形容器内自适应（缩略图 / 放置实例 / 大图预览通用），主题取自外壳上下文 */
function GlobeWidget() {
  const { theme } = useOutletContext<ShellOutletContext>()
  return (
    <div className="sr-globe-widget" style={{ position: 'relative', width: 560, height: 560, overflow: 'hidden' }}>
      <AtlasGlobe dark={theme === 'dark'} />
    </div>
  )
}

/** 🔴 改动 2026-10-12 · 地图 Widget 形态：单层原生高德底图，大图预览可交互
    🔴 改动 2026-10-14 · 去掉三级 LOD（世界封面 / 省级下钻） */
function MapWidget() {
  const { theme } = useOutletContext<ShellOutletContext>()
  return (
    <div style={{ position: 'relative', width: 960, height: 600, overflow: 'hidden' }}>
      <AtlasMap dark={theme === 'dark'} />
    </div>
  )
}

/** Charts | 图表页组件（裸图表, 右侧卷轴列表: 小图两列, 宽图独占一行） */
const CHARTS: WidgetEntry[] = [
  // 🔴 改动 2026-10-12 · 地图进图表列表：单层原生高德底图，点击缩略图进入可交互大图预览
  { nodeId: 'scene.lod-map', name: '地图', w: 960, h: 600, span2: true, maxW: 1100, radius: 20, interactive: true, render: () => <MapWidget /> },
  // 🔴 改动 2026-10-11 · 3D 地球进图表列表：可从浮窗拖出放置到无限画板（复用版图正中的地球组件）
  { nodeId: 'scene.globe-3d', name: '3D 地球', w: 560, h: 560, span2: true, maxW: 720, radius: 20, render: () => <GlobeWidget /> },
  entry('atlas.chart-mini-indicator', { radius: 6 }),
  entry('atlas.chart-indicator', { radius: 6 }),
  entry('atlas.chart-pie', { radius: 6 }),
  entry('atlas.chart-progress', { radius: 6 }),
  entry('atlas.chart-bubble', { span2: true, maxW: 780, radius: 6 }),
  entry('atlas.chart-hex', { span2: true, maxW: 1100, radius: 6 }),
  entry('atlas.chart-line-v2', { span2: true, maxW: 1100, radius: 6 }),
  entry('atlas.chart-candle', { span2: true, maxW: 1100, radius: 6 }),
  entry('atlas.chart-line-v1', { span2: true, maxW: 1100, radius: 6 }),
]

/** 🔴 改动 2026-10-10 · 缩略图封面项: 可拖出到画板放置（HTML5 DnD），点击仍弹出大图预览 */
function RailThumb({
  wgt,
  dark,
  onPreview,
}: {
  wgt: WidgetEntry
  dark: boolean
  onPreview: (wgt: WidgetEntry) => void
}) {
  const aspect = wgt.span2 ? 'aspect-[16/9]' : wgt.h > wgt.w ? 'aspect-[4/5]' : 'aspect-[8/5]'
  return (
    <figure className={cn('m-0 w-full', wgt.span2 && 'col-span-2')}>
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DND_MIME, wgt.nodeId)
          e.dataTransfer.setData('text/plain', wgt.nodeId)
          e.dataTransfer.effectAllowed = 'copy'
        }}
        onClick={() => onPreview(wgt)}
        title={`拖到画板放置 · 点击放大预览 · ${wgt.name}`}
        className={cn(
          'relative block w-full cursor-zoom-in overflow-hidden rounded-xl border transition-colors',
          aspect,
          dark
            ? 'border-white/20 bg-sr-d-gray-10 hover:border-white/40'
            : 'border-black/15 bg-sr-l-gray-2 hover:border-black/35',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 m-auto"
          style={{ aspectRatio: `${wgt.w} / ${wgt.h}`, maxWidth: '92%', maxHeight: '86%' }}
        >
          {wgt.render()}
        </div>
      </button>
      <figcaption
        className={cn(
          'mt-2.5 text-center text-[13px] font-medium leading-4',
          dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8',
        )}
      >
        {wgt.name}
      </figcaption>
    </figure>
  )
}

/** 🔴 改动 2026-10-10 · charts 浮窗 —— 原右侧 1/4 屏卷轴列表收拢为顶部按钮触发的浮窗, 圆角面板 + 自身滚动; 组件与图表统一缩略图封面 */
function ChartsFloatPanel({
  dark,
  onPreview,
  onClose,
}: {
  dark: boolean
  onPreview: (wgt: WidgetEntry) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const groups: Array<{ titleKey: DictKey; items: WidgetEntry[]; total: number }> = [
    { titleKey: 'charts.groupWidgets', items: WIDGETS, total: 24 },
    { titleKey: 'charts.groupCharts', items: CHARTS, total: 9 },
  ]
  return (
    // 🔴 改动 2026-10-11 · 标记 data-board-overlay：画板引擎把浮窗视为画板作用域，面板打开时 Del 删除卡片不失效
    <aside
      aria-label="图表面板"
      data-board-overlay
      className={cn(
        // 🔴 改动 2026-10-11 · 浮窗背景换液态玻璃（sr-glass-*，见 index.css），实心底+shadow-2xl 退役
        'sr-chart-rail fixed left-[84px] top-[76px] z-40 flex max-h-[calc(100vh-96px)] w-[min(420px,calc(100vw-120px))] flex-col overflow-hidden rounded-2xl border',
        dark ? 'sr-glass-dark' : 'sr-glass-light',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-5 py-3',
          dark ? 'border-white/5' : 'border-black/5',
        )}
      >
        <div>
          <h2 className={cn('text-[14px] font-semibold leading-5', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
            {t('panel.charts')}
          </h2>
          {/* 🔴 改动 2026-10-10 · 拖放能力提示 */}
          <p className={cn('mt-0.5 text-[11px] leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
            {t('charts.sub')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.chartsClose')}
          className={cn(
            'flex size-7 items-center justify-center rounded-full transition-colors',
            dark
              ? 'text-sr-d-gray-4 hover:bg-white/10 hover:text-sr-d-gray-1'
              : 'text-sr-l-gray-4 hover:bg-black/5 hover:text-sr-l-gray-11',
          )}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <div className="sr-chart-rail-scroll flex-1 overflow-y-auto px-5 pb-8">
        {groups.map((g, gi) => (
          <section key={g.titleKey} className={cn(gi > 0 && 'mt-8')}>
            <div className="sticky top-0 z-10 flex items-baseline justify-between py-4" style={{ background: 'inherit' }}>
              <h2 className={cn('text-[12px] font-semibold leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
                {t(g.titleKey)}
              </h2>
              <span className={cn('font-mono text-[11px] leading-4', dark ? 'text-sr-d-gray-6' : 'text-sr-l-gray-4')}>
                Pixso · {g.items.length} / {g.total} {t('charts.items')}
              </span>
            </div>
            <div className="grid grid-cols-2 items-start gap-x-4 gap-y-7">
              {g.items.map((wgt) => (
                <RailThumb key={wgt.nodeId} wgt={wgt} dark={dark} onPreview={onPreview} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <style>{`
        .sr-chart-rail-scroll { scrollbar-width: thin; scrollbar-color: rgba(112,112,124,.45) transparent; }
        .sr-chart-rail-scroll::-webkit-scrollbar { width: 6px; }
        .sr-chart-rail-scroll::-webkit-scrollbar-thumb { background: rgba(112,112,124,.45); border-radius: 3px; }
        .sr-chart-rail-scroll::-webkit-scrollbar-track { background: transparent; }
        .sr-chart-rail section > div:first-child { background: inherit; }
      `}</style>
    </aside>
  )
}

/**
 * 🔴 改动 2026-10-10 · 已放置到画板的组件 —— 整卡即拖拽把手（pointer capture 移动），
 * 悬停显示边框 / 名称 / 移除按钮；本体不响应指针。
 * 🔴 改动 2026-10-12 · 点击选中（常显天蓝边框 + 名称 + 移除钮），Del/Backspace 删除选中项
 * （与画板卡片同一交互语义；选中组件时引擎卡片选择被清空，Del 不会两边同时删）。
 * 🔴 改动 2026-10-13 · 画板坐标：left/top/effScale 由父级按画板世界坐标 + 视口换算注入，
 * 组件随画布平移/缩放；拖动位移按屏幕像素回传，父级换算世界增量。右键「屏幕钉」：钉住后不随画布移动。
 * 图表本体经 useMemo 缓存：视口 60Hz 跟随重渲染时图表子树不重挂/重渲。
 * 🔴 改动 2026-10-13 · 可交互组件（interactive，如 地图）：内容区放行指针/滚轮事件给组件
 * 本体（滚轮缩放、拖拽平移、点击下钻层级），卡片移动改由顶部名称把手拖拽；非交互组件维持整卡即把手。
 */
function PlacedWidget({
  item,
  dark,
  selected,
  left,
  top,
  effScale,
  onSelect,
  onMove,
  onRemove,
  onPinMenu,
}: {
  item: PlacedItem
  dark: boolean
  selected: boolean
  left: number
  top: number
  effScale: number
  onSelect: (key: number) => void
  onMove: (key: number, dxPx: number, dyPx: number) => void
  onRemove: (key: number) => void
  onPinMenu: (key: number, clientX: number, clientY: number) => void
}) {
  // 图表元素按 wgt 缓存：视口跟随引发的重渲染跳过图表子树（React 元素同一引用即不 reconciliation）
  const content = useMemo(() => item.wgt.render(), [item.wgt])
  // 🔴 改动 2026-10-13 · 可交互组件（地图）：地图本体接管内容区事件
  const interactive = !!item.wgt.interactive
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    // 🔴 改动 2026-10-12 · 按下即选中（拖动同时也是选中），Del 删除以选中为准
    onSelect(item.key)
    // 🔴 改动 2026-10-13 · 可交互组件：内容区按下不启动卡片拖动（留给地图拖拽/点击），
    // 仅顶部名称把手（data-placed-drag-handle）可拖动卡片
    if (interactive && !(e.target as HTMLElement).closest('[data-placed-drag-handle]')) return
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    // 🔴 改动 2026-10-13 · 逐事件增量回传（父级按 zoom 换算世界增量/直改钉位，免起点快照）
    let lastX = e.clientX
    let lastY = e.clientY
    const move = (ev: PointerEvent) => {
      onMove(item.key, ev.clientX - lastX, ev.clientY - lastY)
      lastX = ev.clientX
      lastY = ev.clientY
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  return (
    <div
      role="figure"
      aria-label={`画板组件 · ${item.wgt.name}`}
      data-placed-widget
      aria-selected={selected}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => {
        // 🔴 改动 2026-10-13 · 右键「屏幕钉」菜单（不放行到画板背景菜单）
        e.preventDefault()
        e.stopPropagation()
        onSelect(item.key)
        onPinMenu(item.key, e.clientX, e.clientY)
      }}
      className={cn(
        'group absolute z-10 touch-none select-none',
        // 🔴 改动 2026-10-13 · 可交互组件内容区不显示抓取光标（拖动走顶部把手），避免误导
        interactive ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      )}
      style={{ left, top, width: item.wgt.w * effScale, height: item.wgt.h * effScale }}
    >
      {/* 🔴 改动 2026-10-13 · 可交互组件放行指针/滚轮（地图滚轮缩放、拖拽平移、标记点击缩放）；
          非交互组件维持 pointer-events-none（整卡即把手） */}
      <div
        className={interactive ? undefined : 'pointer-events-none'}
        style={{
          width: item.wgt.w,
          height: item.wgt.h,
          transform: `scale(${effScale})`,
          transformOrigin: 'top left',
        }}
      >
        {content}
      </div>
      {/* 悬停态: 边框 + 名称 + 移除按钮；🔴 改动 2026-10-12 · 选中态常显（Del 删除的视觉锚点） */}
      <div
        className={cn(
          'pointer-events-none absolute -inset-1.5 rounded-xl border transition-colors',
          selected ? 'border-sky-400' : 'border-transparent group-hover:border-sky-400/70',
        )}
      />
      <span
        // 🔴 改动 2026-10-13 · 可交互组件：名称条升级为卡片拖拽把手（常显、可抓取），
        // 内容区已交给地图本体，卡片只能从这里拖动
        data-placed-drag-handle={interactive ? '' : undefined}
        className={cn(
          'absolute -top-7 left-0 whitespace-nowrap text-[11px] font-medium leading-4 transition-opacity',
          interactive ? 'cursor-grab rounded px-1.5 py-0.5 active:cursor-grabbing' : 'pointer-events-none',
          selected || interactive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8',
        )}
      >
        {item.wgt.name}
      </span>
      <button
        type="button"
        onClick={() => onRemove(item.key)}
        aria-label={`从画板移除 ${item.wgt.name}`}
        className={cn(
          'absolute -right-2.5 -top-2.5 flex size-5 items-center justify-center rounded-full bg-sky-500 text-[11px] leading-none text-white transition-opacity hover:bg-sky-400',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        ✕
      </button>
    </div>
  )
}

/**
 * 缩略图点击后的中央大图预览 —— 组件按原始尺寸等比放大（上限 2.6x，超大图表则缩小适配），
 * 每次打开以 key 重挂载, 入场动画完整重播; Esc / 点击遮罩 / 右上角按钮关闭。
 */
function PreviewModal({ wgt, dark, onClose }: { wgt: WidgetEntry; dark: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  // 🔴 改动 2026-10-12 · 可交互组件（interactive，如 地图）预览窗口更大，且面板放行指针事件
  const maxW = wgt.interactive ? Math.min(window.innerWidth * 0.82, 1280) : Math.min(window.innerWidth * 0.62, 980)
  const maxH = window.innerHeight * (wgt.interactive ? 0.8 : 0.72)
  const scale = Math.max(0.4, Math.min(2.6, Math.min(maxW / wgt.w, maxH / wgt.h)))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${wgt.name} 大图预览`}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* 遮罩: 点击关闭 */}
      <button
        type="button"
        aria-label="关闭预览"
        onClick={onClose}
        className="sr-preview-backdrop absolute inset-0 cursor-zoom-out bg-black/70 backdrop-blur-sm"
      />
      <div className={cn('sr-preview-panel relative flex flex-col items-center', !wgt.interactive && 'pointer-events-none')}>
        <div
          className="relative"
          style={{ width: wgt.w * scale, height: wgt.h * scale }}
        >
          <div
            key={wgt.nodeId}
            className="absolute left-0 top-0"
            style={{
              width: wgt.w,
              height: wgt.h,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {wgt.render()}
          </div>
        </div>
        <p
          className={cn(
            'mt-6 text-center text-[14px] font-medium leading-5',
            dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-2',
          )}
        >
          {wgt.name}
          <span className={cn('ml-3 font-mono text-[12px]', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
            Pixso {wgt.nodeId} · {Math.round(wgt.w)}×{Math.round(wgt.h)}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭预览"
        className={cn(
          'absolute right-6 top-[84px] flex h-9 w-9 items-center justify-center rounded-full border text-[15px] leading-none transition-colors',
          dark
            ? 'border-white/15 bg-white/5 text-sr-d-gray-2 hover:bg-white/15'
            : 'border-black/15 bg-white/60 text-sr-l-gray-8 hover:bg-white',
        )}
      >
        ✕
      </button>
      <style>{`
        .sr-preview-backdrop { animation: srPreviewFade .18s ease-out both; }
        .sr-preview-panel { animation: srPreviewZoom .24s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes srPreviewFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes srPreviewZoom { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}

/** 🔴 改动 2026-10-12 · Tab 坞右键菜单目标：主画板标签 / 某个拆分 Tab / Tab 坞空白处 */
type TabMenuTarget =
  | { kind: 'main' }
  | { kind: 'tab'; index: number }
  // 🔴 改动 2026-10-14 · 「地图」内置常驻标签：右键只弹「新建 Tab」（无重命名/成为主画板/删除）
  | { kind: 'map' }
  | { kind: 'dock' }

/** 🔴 改动 2026-10-12 · Tab 行内改名输入框：Enter 提交 / Esc 取消 / 失焦保存；独立组件保证每次编辑状态干净 */
function TabNameInput({
  label,
  dark,
  onCommit,
  onCancel,
}: {
  label: string
  dark: boolean
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const doneRef = useRef(false)
  return (
    <input
      autoFocus
      defaultValue={label}
      aria-label="重命名画板标签"
      spellCheck={false}
      onFocus={(e) => e.currentTarget.select()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault()
          doneRef.current = true
          onCommit(e.currentTarget.value)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          doneRef.current = true
          onCancel()
        }
      }}
      onBlur={(e) => {
        if (doneRef.current) return
        doneRef.current = true
        const v = e.currentTarget.value.trim()
        if (v && v !== label) onCommit(v)
        else onCancel()
      }}
      className={cn(
        'w-full min-w-0 bg-transparent text-inherit outline-none',
        dark ? 'placeholder:text-sr-d-gray-6' : 'placeholder:text-sr-l-gray-4',
      )}
    />
  )
}

/** 🔴 改动 2026-10-11 · 顶部菜单栏「版图」下的水平 Tab 坞标签（浏览器式 file tab 观感：
   激活标签顶部蓝色强调条 + 底部开口与画板区相连）
   🔴 改动 2026-10-12 · 双击行内改名；右键弹出菜单「重命名」
   🔴 改动 2026-10-13 · pinned = 屏幕钉子画板标记（金色小点）；detached = 已拆出独立窗口标记（⇗）
   🔴 改动 2026-10-13 ·【框架约定 · 画板与 Tab 一体】Tab 指针拖拽复刻 Chrome：拖动超过 8px 进入
   撕离手势（经 onTearDrag 上报 start/move/end，落点判定与执行由页面层负责——拖到画板 = 画中画，
   拖出浏览器窗口 = 拆出独立窗口）；拖过即 suppress 本次 click，避免误激活/误改名 */
function SplitDockTab({
  dark,
  active,
  label,
  editing,
  pinned,
  detached,
  noEdit,
  onClick,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onOpenMenu,
  onTearDrag,
  btnRef,
}: {
  dark: boolean
  active: boolean
  label: string
  editing: boolean
  pinned?: boolean
  detached?: boolean
  /** 🔴 改动 2026-10-14 · 内置常驻标签（地图）：true = 双击不进入改名、悬停提示不含「双击或右键重命名」 */
  noEdit?: boolean
  onClick: () => void
  onStartEdit: () => void
  onCommitEdit: (name: string) => void
  onCancelEdit: () => void
  onOpenMenu: (x: number, y: number) => void
  /** 撕离拖拽（仅拆分 Tab 传入；主画板标签不可拖出——它是窗口本体） */
  onTearDrag?: (phase: 'start' | 'move' | 'end', e: { clientX: number; clientY: number; screenX: number; screenY: number }) => void
  /** 🔴 改动 2026-10-15 · 按钮 DOM 引用上报（坞内拖动换位按中线判定插入位） */
  btnRef?: (el: HTMLButtonElement | null) => void
}) {
  const dragRef = useRef<{ pid: number; sx: number; sy: number; dragging: boolean } | null>(null)
  const suppressClick = useRef(false)
  const tearInfo = (e: React.PointerEvent) => ({ clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY })
  return (
    <button
      type="button"
      ref={btnRef}
      onClick={(e) => {
        e.stopPropagation()
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        if (!editing) onClick()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        // 🔴 改动 2026-10-14 · 内置常驻标签（地图）双击不进入改名输入框
        if (!noEdit) onStartEdit()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpenMenu(e.clientX, e.clientY)
      }}
      onPointerDown={(e) => {
        if (!onTearDrag || editing || e.button !== 0) return
        dragRef.current = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, dragging: false }
        // 防御：指针已失效（合成事件/竞态取消）时捕获抛错不影响拖拽判定
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* best effort */
        }
      }}
      onPointerMove={(e) => {
        const d = dragRef.current
        if (!d || e.pointerId !== d.pid) return
        if (!d.dragging && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) {
          d.dragging = true
          onTearDrag?.('start', tearInfo(e))
        }
        if (d.dragging) onTearDrag?.('move', tearInfo(e))
      }}
      onPointerUp={(e) => {
        const d = dragRef.current
        if (!d || e.pointerId !== d.pid) return
        dragRef.current = null
        if (d.dragging) {
          // 🔴 改动 2026-10-13 · 吞掉撕离释放后的本次 click（防误激活/误改名）；
          // 350ms 后自动复位——合成事件/窗外释放不产生 click 时不会误吞下一次真实点击
          suppressClick.current = true
          window.setTimeout(() => {
            suppressClick.current = false
          }, 350)
          onTearDrag?.('end', tearInfo(e))
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
      title={
        editing
          ? undefined
          : `${label}${pinned ? ' · 屏幕钉' : ''}${detached ? ' · 已拆出到独立窗口，点击挂回' : ''}${noEdit ? '' : ' · 双击或右键重命名'}${onTearDrag ? ' · 坞内拖动=换位，拖到画板=画中画，拖出窗口=新窗口' : ''}`
      }
      className={cn(
        'relative -mb-px flex h-8 max-w-[180px] select-none items-center rounded-t-lg border border-b-0 px-3 text-[12px] font-medium leading-4 transition-colors',
        active
          ? dark
            ? 'border-white/10 bg-white/[0.06] text-sr-d-gray-1'
            : 'border-black/10 bg-sr-l-gray-1 text-sr-l-gray-11'
          : dark
            ? 'border-transparent text-sr-d-gray-5 hover:bg-white/5 hover:text-sr-d-gray-2'
            : 'border-transparent text-sr-l-gray-5 hover:bg-black/5 hover:text-sr-l-gray-8',
      )}
    >
      {active && (
        <span className="pointer-events-none absolute inset-x-3 top-0 h-[2px] rounded-b-full bg-sr-brand-interact-blue" />
      )}
      {editing ? (
        <TabNameInput label={label} dark={dark} onCommit={onCommitEdit} onCancel={onCancelEdit} />
      ) : (
        <>
          <span className="truncate">{label}</span>
          {pinned && (
            <span
              aria-label="屏幕钉"
              className="ml-1.5 inline-block size-1.5 shrink-0 rounded-full bg-[#d4ad57] shadow-[0_0_4px_rgba(212,173,87,0.8)]"
            />
          )}
          {detached && (
            <span aria-label="已拆出到独立窗口" className="ml-1 shrink-0 text-[11px] leading-none text-sky-400">
              ⇗
            </span>
          )}
        </>
      )}
    </button>
  )
}

/** 🔴 改动 2026-10-13 · 屏幕钉子画板浮动窗口（画中画，类似一张卡片悬浮于主画板内）。
   选中规则：框线框选（矩形与窗口有重叠即选中，无需全部框住）或左键点击进入选中；
   选中后四周出现高亮蓝色分隔线，此时才可用鼠标左键拖动（拖动头部/分隔线）；
   也可以直接用鼠标右键在窗口任意部位拖动。收起（关闭）回到 Tab 坞成为收起态 */
function PinnedBoardWindow({
  dark,
  title,
  doc,
  selected,
  pos,
  winRef,
  onSelect,
  onMove,
  onPersist,
  onCollapse,
  closeLabel,
  onDragMove,
  onDragEnd,
}: {
  dark: boolean
  title: string
  doc: BoardDoc
  selected: boolean
  pos: { x: number; y: number }
  winRef: (el: HTMLDivElement | null) => void
  onSelect: () => void
  onMove: (dx: number, dy: number) => void
  onPersist: (doc: BoardDoc) => void
  onCollapse: () => void
  /** 🔴 改动 2026-10-15 · 关闭按钮的无障碍标签（子画板 X = 删除，默认「收起」） */
  closeLabel?: string
  /** 🔴 改动 2026-10-15 · 拖动过程上报指针位置（页面层判定是否悬停在 Tab 坞上，做落点高亮） */
  onDragMove?: (clientX: number, clientY: number) => void
  /** 🔴 改动 2026-10-15 · 拖动结束上报落点（页面层判定：落到 Tab 坞 = 取消屏幕钉并全屏显示） */
  onDragEnd?: (clientX: number, clientY: number) => void
}) {
  const dragRef = useRef<{ x: number; y: number; moved: boolean; btn: number } | null>(null)
  /** 🔴 改动 2026-10-15 · 最近一次指针位置（endDrag 时 dragRef 已置空，需经此把落点带给 onDragEnd） */
  const lastPosRef = useRef({ x: 0, y: 0 })
  /** 🔴 改动 2026-10-13 · 右键拖动过 = 本次 contextmenu 吞掉（拖动语义）；原地右键 = 放行给子画板右键菜单 */
  const rightDragMoved = useRef(false)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      // 🔴 改动 2026-10-13 · 右键直接拖动（窗口任意部位，无需选中）
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, moved: false, btn: 2 }
      rightDragMoved.current = false
      return
    }
    if (e.button !== 0) return
    const t = e.target as HTMLElement
    if (!selected) {
      // 未选中：左键点击任意部位 → 进入选中态（不拖动；画布本体交互仍归子画板）
      onSelect()
      return
    }
    // 已选中：左键拖动仅限窗口头部 / 蓝色分隔线（画布本体仍归子画板画布交互）
    if (t.closest('.sr-pinned-head') || t.closest('.sr-pin-divider')) {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, moved: false, btn: 0 }
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    if (!dragRef.current.moved && Math.hypot(dx, dy) < 3) return
    if (dragRef.current.btn === 2) rightDragMoved.current = true
    dragRef.current = { ...dragRef.current, x: e.clientX, y: e.clientY, moved: true }
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    onMove(dx, dy)
    onDragMove?.(e.clientX, e.clientY)
  }
  const endDrag = () => {
    const wasMoved = !!dragRef.current?.moved
    const at = lastPosRef.current
    // 🔴 改动 2026-10-13 · 右键拖动后在窗口外松手：contextmenu 目标在窗外，捕获拦截不到，
    // 注册一次性 document 捕获拦截兜底（窗内松手由 onContextMenuCapture 处理）
    if (dragRef.current?.btn === 2 && dragRef.current.moved) {
      const suppress = (ev: Event) => {
        ev.preventDefault()
        ev.stopPropagation()
      }
      document.addEventListener('contextmenu', suppress, { capture: true, once: true })
      // 兜底：个别平台右键拖动后不派发 contextmenu，监听泄漏时 800ms 自清理
      window.setTimeout(() => document.removeEventListener('contextmenu', suppress, { capture: true }), 800)
    }
    dragRef.current = null
    if (wasMoved) onDragEnd?.(at.x, at.y)
  }

  return (
    <div
      ref={winRef}
      data-board-overlay
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenuCapture={(e) => {
        // 🔴 改动 2026-10-13 · 右键拖动过的本次 contextmenu 吞掉（拖动语义）；
        // 原地右键放行给子画板（引擎自己的画板/卡片右键菜单）；落在窗口头部等非画板区则只挡浏览器默认菜单
        if (rightDragMoved.current) {
          rightDragMoved.current = false
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (!(e.target as HTMLElement).closest('.sr-board')) e.preventDefault()
      }}
      className={cn(
        'sr-pinned-board absolute z-20 flex h-[min(540px,62%)] w-[min(640px,50%)] flex-col overflow-visible rounded-xl border shadow-2xl',
        selected && 'is-selected',
        dark ? 'border-[#8a6a1f]/50 bg-sr-d-gray-10' : 'border-[#d8bd7a] bg-sr-l-gray-0',
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      {/* 🔴 改动 2026-10-13 · 选中态：四周高亮蓝色分隔线（可抓取拖动）+ 四角手柄 */}
      {selected && (
        <>
          <span className="sr-pin-divider is-top" aria-hidden="true" />
          <span className="sr-pin-divider is-bottom" aria-hidden="true" />
          <span className="sr-pin-divider is-left" aria-hidden="true" />
          <span className="sr-pin-divider is-right" aria-hidden="true" />
          <span className="sr-pin-corner is-tl" aria-hidden="true" />
          <span className="sr-pin-corner is-tr" aria-hidden="true" />
          <span className="sr-pin-corner is-bl" aria-hidden="true" />
          <span className="sr-pin-corner is-br" aria-hidden="true" />
        </>
      )}
      <header
        className={cn(
          'sr-pinned-head flex shrink-0 items-center gap-2 overflow-hidden rounded-t-xl border-b px-3 py-2',
          dark ? 'border-white/10 bg-[#26200f]' : 'border-black/5 bg-[#faf3e3]',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-amber-500">{title}</span>
        <span className="shrink-0 rounded-full border border-[#d4ad57]/60 px-2 py-0.5 text-[10px] font-medium text-[#d4ad57]">
          屏幕钉
        </span>
        <button
          type="button"
          aria-label={closeLabel ?? `收起 ${title}`}
          onClick={onCollapse}
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full transition-colors',
            dark ? 'text-sr-d-gray-4 hover:bg-white/10 hover:text-sr-d-gray-1' : 'text-sr-l-gray-4 hover:bg-black/5 hover:text-sr-l-gray-11',
          )}
        >
          <X size={13} />
        </button>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-xl">
        {/* 🔴 改动 2026-10-13 · pip 标记：Ctrl+A 时与所在大画板连带全选（画中画视为大画板的一部分） */}
        <BoardCanvas dark={dark} doc={doc} primary={false} onPersist={onPersist} pip />
      </div>
    </div>
  )
}

/** 🔴 改动 2026-10-13 · 通用确认弹窗（删除画板等危险操作：确认 / 取消） */
function ConfirmModal({
  dark,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  dark: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div
        className={cn(
          'relative w-[min(380px,calc(100vw-48px))] rounded-2xl border p-6 shadow-2xl',
          dark ? 'border-white/10 bg-sr-d-gray-9 text-sr-d-gray-1' : 'border-black/10 bg-white text-sr-l-gray-11',
        )}
      >
        <h2 className="text-[15px] font-semibold leading-5">{title}</h2>
        <p className={cn('mt-2 text-[13px] leading-5', dark ? 'text-sr-d-gray-3' : 'text-sr-l-gray-8')}>{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'rounded-lg border px-3.5 py-1.5 text-[12px] font-medium transition-colors',
              dark ? 'border-white/10 text-sr-d-gray-2 hover:bg-white/10' : 'border-black/10 text-sr-l-gray-8 hover:bg-black/5',
            )}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-sr-brand-interact-red px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:brightness-110"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

/** 🔴 改动 2026-10-13 · 删除主画板安全弹窗：显示用户名，要求输入密码 */
function SecurityModal({
  dark,
  username,
  onConfirm,
  onCancel,
}: {
  dark: boolean
  username: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState(false)
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="删除主画板 · 安全确认">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div
        className={cn(
          'relative w-[min(380px,calc(100vw-48px))] rounded-2xl border p-6 shadow-2xl',
          dark ? 'border-[#8a6a1f]/50 bg-sr-d-gray-9 text-sr-d-gray-1' : 'border-[#d8bd7a] bg-white text-sr-l-gray-11',
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d4ad57]">SECURITY CHECK</p>
        <h2 className="mt-1 text-[15px] font-semibold leading-5">删除主画板 · 安全确认</h2>
        <p className={cn('mt-2 text-[13px] leading-5', dark ? 'text-sr-d-gray-3' : 'text-sr-l-gray-8')}>
          主画板删除后，Tab 坞中其右侧第一个画板将自动成为主画板并全展开显示。
        </p>
        <label className="mt-4 block text-[12px] font-medium opacity-70">用户名</label>
        <input
          value={username}
          disabled
          className={cn(
            'mt-1 w-full rounded-lg border px-3 py-2 text-[13px] leading-5',
            dark ? 'border-white/10 bg-white/5 text-sr-d-gray-4' : 'border-black/10 bg-black/5 text-sr-l-gray-6',
          )}
        />
        <label className="mt-3 block text-[12px] font-medium opacity-70">密码</label>
        <input
          autoFocus
          type="password"
          value={pwd}
          onChange={(e) => {
            setPwd(e.currentTarget.value)
            setError(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              if (pwd.trim()) onConfirm()
              else setError(true)
            }
          }}
          aria-label="输入密码"
          className={cn(
            'mt-1 w-full rounded-lg border px-3 py-2 text-[13px] leading-5 outline-none',
            dark ? 'border-white/10 bg-sr-d-gray-11 text-sr-d-gray-1 focus:border-[#d4ad57]' : 'border-black/10 bg-white text-sr-l-gray-11 focus:border-[#a77a28]',
            error && 'border-sr-brand-interact-red',
          )}
        />
        {error && <p className="mt-1 text-[11px] text-sr-brand-interact-red">请输入密码后再确认删除</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'rounded-lg border px-3.5 py-1.5 text-[12px] font-medium transition-colors',
              dark ? 'border-white/10 text-sr-d-gray-2 hover:bg-white/10' : 'border-black/10 text-sr-l-gray-8 hover:bg-black/5',
            )}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              if (pwd.trim()) onConfirm()
              else setError(true)
            }}
            className="rounded-lg bg-sr-brand-interact-red px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:brightness-110"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}

export function AtlasPage() {
  // 🔴 改动 2026-10-10 · charts 列表改为浮窗: 开关状态来自外壳层（顶部小铃铛左边的图表按钮）。
  const { theme, chartsOpen, setChartsOpen } = useOutletContext<ShellOutletContext>()
  const dark = theme === 'dark'
  /** 🔴 改动 2026-10-13 · 拆出窗口模式（?boardwin=<detachId>，【框架约定 · 画板与 Tab 一体】
   *  Tab 拖出浏览器 = 独立浏览器窗口）：本窗口只渲染该画板，文档与主窗口同一份（同源 localStorage 共享） */
  const boardWinId = useMemo(() => new URLSearchParams(window.location.search).get('boardwin'), [])
  const [detDoc, setDetDoc] = useState<BoardDoc | null>(() => {
    if (!boardWinId) return null
    const s = loadSplitState()
    return s?.boards.find((b) => b.detachId === boardWinId) ?? null
  })
  /** 拆出窗口的引擎重挂载戳（主窗口经 storage 事件改文档后强制重挂） */
  const [detStamp, setDetStamp] = useState(0)
  const detDocRef = useRef(detDoc)
  detDocRef.current = detDoc
  const [preview, setPreview] = useState<WidgetEntry | null>(() => {
    // 支持 ?preview=<nodeId> 深链直接打开大图预览
    const id = new URLSearchParams(window.location.search).get('preview')
    return id ? (WIDGETS.concat(CHARTS).find((w) => w.nodeId === id) ?? null) : null
  })
  // 🔴 改动 2026-10-10 · 画板上已放置的组件实例（DSH 无限画板接入前的轻量放置层，可整卡移动/移除）。
  const boardRef = useRef<HTMLDivElement>(null)
  /** 🔴 改动 2026-10-13 · 画板区容器（放置组件/屏幕钉菜单挂载层，与主画板引擎根同原点） */
  const boardAreaRef = useRef<HTMLDivElement>(null)
  const keyRef = useRef(0)
  const [placed, setPlaced] = useState<PlacedItem[]>([])
  // 🔴 改动 2026-10-12 · 已放置组件的选中态：点击/拖动即选中，Del/Backspace 删除选中项；
  // 选中组件时清空画板卡片选择（经引擎桥 getBoardEngine 惰性读取），Del 不会两边同时删
  const [placedSelKey, setPlacedSelKey] = useState<number | null>(null)
  const placedSelRef = useRef<number | null>(null)
  const selectPlaced = (key: number | null) => {
    placedSelRef.current = key
    setPlacedSelKey(key)
    if (key !== null) getBoardEngine()?.clearSelection()
  }
  const removePlaced = (key: number) => {
    if (placedSelRef.current === key) selectPlaced(null)
    setPlaced((list) => list.filter((it) => it.key !== key))
  }

  // 🔴 改动 2026-10-13 · 画板视口跟随：放置组件按画板世界坐标渲染，视口（平移/缩放）每次应用都重算定位
  const [boardView, setBoardView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  useEffect(() => {
    const sync = () => {
      const v = getBoardEngine()?.getView()
      if (v) setBoardView((prev) => (prev.x === v.x && prev.y === v.y && prev.zoom === v.zoom ? prev : v))
    }
    const unView = subscribeBoardView((v) => setBoardView({ ...v }))
    const unReg = subscribeEngineRegistry(sync)
    sync()
    return () => {
      unView()
      unReg()
    }
  }, [])

  /** 🔴 改动 2026-10-13 · 放置组件的容器内布局：未钉 = 世界坐标 × 视口（组件挂在画板区容器内，
      主画板引擎根与该容器同原点，拆分视图主窗格亦从容器的左上起点铺开）；
      钉住 = 屏幕钉位 + 冻结尺寸。纯状态换算，渲染期不读 DOM */
  const placedLayout = (item: PlacedItem): { left: number; top: number; effScale: number } => {
    if (item.pinned) {
      return { left: item.sx ?? 0, top: item.sy ?? 0, effScale: item.scale * (item.pinZoom ?? 1) }
    }
    return {
      left: boardView.x + item.wx * boardView.zoom,
      top: boardView.y + item.wy * boardView.zoom,
      effScale: item.scale * boardView.zoom,
    }
  }

  /** 🔴 改动 2026-10-13 · 拖动放置组件：增量为逐事件屏幕像素；未钉 = ÷ zoom 换算世界增量后累加，
      钉住 = 屏幕像素直改钉位 */
  const movePlaced = (key: number, dxPx: number, dyPx: number) => {
    const zoom = getBoardEngine()?.getView().zoom ?? 1
    setPlaced((list) =>
      list.map((it) => {
        if (it.key !== key) return it
        if (it.pinned) return { ...it, sx: (it.sx ?? 0) + dxPx, sy: (it.sy ?? 0) + dyPx }
        return { ...it, wx: it.wx + dxPx / zoom, wy: it.wy + dyPx / zoom }
      }),
    )
  }

  // 🔴 改动 2026-10-13 · 右键「屏幕钉」菜单（画板区容器内坐标；不在组件上加任何钉态图标/提示）
  const [pinMenu, setPinMenu] = useState<{ key: number; x: number; y: number } | null>(null)
  const openPinMenu = (key: number, clientX: number, clientY: number) => {
    const rect = boardAreaRef.current?.getBoundingClientRect()
    setPinMenu({ key, x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) })
  }
  /** 切换屏幕钉：钉住 = 当前视觉位置冻结为屏幕钉位；取消 = 钉位按当前视口换算回世界坐标（原地不跳） */
  const togglePinPlaced = (key: number) => {
    setPinMenu(null)
    const engine = getBoardEngine()
    const rect = boardAreaRef.current?.getBoundingClientRect()
    setPlaced((list) =>
      list.map((it) => {
        if (it.key !== key) return it
        if (it.pinned) {
          if (!engine || !rect) return { ...it, pinned: false }
          const w = engine.clientToWorld(rect.left + (it.sx ?? 0), rect.top + (it.sy ?? 0))
          const next: PlacedItem = { ...it, wx: w.x, wy: w.y, pinned: false }
          delete next.sx
          delete next.sy
          delete next.pinZoom
          return next
        }
        const layout = placedLayout(it)
        return { ...it, pinned: true, sx: layout.left, sy: layout.top, pinZoom: boardView.zoom }
      }),
    )
  }

  // 🔴 改动 2026-10-12 · Del/Backspace 删除选中的已放置组件（与画板卡片删除同一按键语义）；
  // 输入框内 / 输入法合成中不响应；画板引擎的卡片删除走它自己的 document 监听，两边选择互斥不冲突
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 🔴 改动 2026-10-13 · Esc 关闭「屏幕钉」菜单
      if (e.key === 'Escape') {
        setPinMenu(null)
        return
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (e.isComposing) return
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const key = placedSelRef.current
      if (key === null) return
      e.preventDefault()
      // 内联移除（只碰 ref 与 setState）：效果内不调 removePlaced，避免把引擎 ref 追踪进 effect 依赖
      placedSelRef.current = null
      setPlacedSelKey(null)
      setPlaced((list) => list.filter((it) => it.key !== key))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // 🔴 改动 2026-10-13 · 拆分视图 v3：树形拆分（主画板 + boards[]，支持嵌套继续拆分 / 覆盖收起 / 主画板替换）。
  // 框架写死必须有一个主画板：默认画板为主画板；主画板可删除（安全弹窗），删除后右侧第一个画板自动成为主画板并全展开。
  // 🔴 改动 2026-10-16 · 持久化规则升级：只要有拆分画板就写 localStorage（不再要求有卡片），
  // 空白新建 Tab 刷新后也保留；当前视图（拆分 / 独占 / 主画板全屏）随状态一并保存，刷新原样恢复。
  const initialSplit = useMemo(() => loadSplitState(), [])
  const [atlasSplit, setAtlasSplit] = useState<AtlasSplitState | null>(initialSplit)
  const [splitOpen, setSplitOpen] = useState<boolean>(() => initialSplit !== null && initialSplit.view === 'split')
  const [mainTitle, setMainTitle] = useState('')
  // 🔴 改动 2026-10-14 · 「地图」内置常驻 Tab：为 true 时画板区整块显示地图（满画板），
  // 仅视图切换（不进拆分树 / 不写 localStorage）；点主画板或任一拆分 Tab 即回画板，拆分状态原样保留。
  const [mapOpen, setMapOpen] = useState(false)
  // 🔴 改动 2026-10-15 · 独占全屏 Tab（solo）：单画板全屏视图下点拆分 Tab，该 Tab 的画板独占整个画板区显示
  // （不同屏拆分）；🔴 改动 2026-10-16 · 随拆分状态持久化（view='solo'），刷新后原样恢复独占视图。
  // 🔴 改动 2026-10-16 · 自愈：存档里 solo 目标同时钉着屏幕钉（pinTabAt 旧版未清 soloTab 留下的坏状态）
  // 时放弃 solo 恢复——同一份文档不能既全屏独占又画中画浮动（双引擎双渲染，刷新后出现「重复节点」），
  // 回落为「主画板全屏 + 浮动窗口」。
  const [soloTab, setSoloTab] = useState<number | null>(() =>
    initialSplit?.view === 'solo' && !initialSplit.pinned[initialSplit.activeSplit] ? initialSplit.activeSplit : null,
  )
  // 🔴 改动 2026-10-11 · 拆分边界：拖拽态；把手可拖拽推拉 + 方向键微调
  const [draggingSplit, setDraggingSplit] = useState(false)
  /** 🔴 改动 2026-10-13 · 正在拖拽的分隔线方向（根容器据此切 UE5 缩放光标） */
  const dragDirRef = useRef<SplitDirection>('vertical')
  const atlasSplitRef = useRef<AtlasSplitState | null>(atlasSplit)
  const primaryEngineRef = useRef<BoardEngine | null>(null)
  /** 🔴 改动 2026-10-13 · 拆分画板文档换位戳（成为主画板互换文档时强制对应窗格重挂载引擎） */
  const boardStampsRef = useRef<number[]>([])
  const bumpStamp = (index: number) => {
    boardStampsRef.current[index] = (boardStampsRef.current[index] ?? 0) + 1
  }

  const splitRoot = atlasSplit?.root ?? mainBoardNode()
  const splitBoards = atlasSplit?.boards ?? []
  const splitPinned = atlasSplit?.pinned ?? []
  // 🔴 改动 2026-10-12 · Tab 行内改名与右键菜单状态（'main' = 主画板标签，其余为拆分画板下标）
  const [editingTab, setEditingTab] = useState<number | 'main' | null>(null)
  /** 右键菜单目标：主画板标签 / 某个拆分 Tab / Tab 坞空白处 */
  const [tabMenu, setTabMenu] = useState<{ x: number; y: number; target: TabMenuTarget } | null>(null)
  /** 🔴 改动 2026-10-13 · 分隔线右键菜单：拆分（两块同时）/ 向两侧覆盖 */
  const [dividerMenu, setDividerMenu] = useState<{ x: number; y: number; path: number[] } | null>(null)
  /** 🔴 改动 2026-10-13 · 删除目标：普通 Tab → 确认弹窗；主画板 → 安全弹窗（用户名 + 密码） */
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'main' } | { kind: 'tab'; index: number } | null>(null)
  /** 🔴 改动 2026-10-13 · 悬浮子画板（画中画）：每 Tab 独立屏幕位置 / 选中态（蓝色四边分隔线）/ 窗口元素引用；
   *  Tab 拖到画板上即钉为浮动子画板（【框架约定 · 画板与 Tab 一体】Chrome 式撕离手势的画板内落点） */
  const [pinPosMap, setPinPosMap] = useState<Record<number, { x: number; y: number }>>(() => {
    // 🔴 改动 2026-10-16 · 浮动窗口位置随拆分状态恢复：刷新后画中画窗口保持保存时的位置
    const m: Record<number, { x: number; y: number }> = {}
    initialSplit?.pinPos?.forEach((p, i) => {
      if (p) m[i] = p
    })
    return m
  })
  const pinPosMapRef = useRef(pinPosMap)
  pinPosMapRef.current = pinPosMap
  const [pinnedSelected, setPinnedSelected] = useState<number | null>(null)
  const pinWinRefs = useRef(new Map<number, HTMLDivElement>())
  /** 🔴 改动 2026-10-13 · Tab 撕离拖拽态（幽灵片跟随光标；zone = 落点区域：坞内取消 / 画板画中画 / 窗外拆出） */
  const [tabDrag, setTabDrag] = useState<{ index: number; label: string; x: number; y: number; zone: 'dock' | 'board' | 'outside' } | null>(null)
  const tabDragRef = useRef(tabDrag)
  tabDragRef.current = tabDrag
  // 🔴 改动 2026-10-16 · splitOpen / soloTab 的 ref 镜像：persistSplit 落盘时读取当前视图（拖拽闭包同样用）
  const splitOpenRef = useRef(splitOpen)
  splitOpenRef.current = splitOpen
  const soloTabRef = useRef(soloTab)
  soloTabRef.current = soloTab
  const draggingSplitRef = useRef(draggingSplit)
  draggingSplitRef.current = draggingSplit
  /** 🔴 改动 2026-10-13 · 框线框选命中悬浮子画板的临时矩形（重叠即选中，无需全部框住） */
  const pinMarqueeRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  /** 🔴 改动 2026-10-16 · 落盘规则：只要有拆分画板就保存（空白 Tab 也保留，刷新不丢）；
   *  视图态（拆分 / 独占 / 主画板全屏）随状态一并写入，刷新后原样恢复。
   *  view 只存在于「保存的 JSON」，内存状态对象不带 view——跨窗口回声比对按内容四字段比较，互不干扰 */
  const persistSplit = (next: AtlasSplitState | null) => {
    if (next && next.boards.length > 0) {
      const view: 'split' | 'solo' | 'main' = !splitOpenRef.current ? (soloTabRef.current !== null ? 'solo' : 'main') : 'split'
      saveSplitState({ ...next, view })
    } else {
      removeSplitState()
    }
  }
  /** 更新拆分状态（同步 ref 供指针事件闭包即时读取）并落盘 */
  const commitSplit = (next: AtlasSplitState | null) => {
    atlasSplitRef.current = next
    setAtlasSplit(next)
    persistSplit(next)
  }

  /** 🔴 改动 2026-10-13 · 拆出窗口的画板保存：回写共享拆分状态（按 detachId 定位，Tab 增删重排不影响） */
  const persistDetached = (doc: BoardDoc) => {
    const s = loadSplitState()
    if (!s) return
    const i = s.boards.findIndex((b) => b.detachId === boardWinId)
    if (i < 0) return
    s.boards[i] = doc
    saveSplitState(s)
    detDocRef.current = doc
    setDetDoc(doc)
  }

  // 🔴 改动 2026-10-13 · 跨窗口同步（【画板与 Tab 一体】：拆出窗口 ↔ 主窗口共用同一份画板文档）。
  // 同源 localStorage 共享拆分状态，另一窗口写入时经 storage 事件跟随（后写胜出；
  // 自己写入的回声经串行化比对吞掉，不无限循环）。拖拽分隔线 / Tab 撕离进行中不抢占。
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SPLIT_STORAGE_KEY) return
      if (boardWinId) {
        // 拆出窗口：detachId 消失 = 已挂回/删除（提示页）；文档被主窗口改写 = 重挂载引擎
        const s = loadSplitState()
        const b = s?.boards.find((x) => x.detachId === boardWinId) ?? null
        if (!b) {
          detDocRef.current = null
          setDetDoc(null)
          return
        }
        if (JSON.stringify(b) !== JSON.stringify(detDocRef.current)) {
          detDocRef.current = b
          setDetDoc(b)
          setDetStamp((s2) => s2 + 1)
        }
        return
      }
      // 主窗口：跟随另一窗口的拆分状态（含拆出/挂回/拆出窗口内的画板编辑）
      if (draggingSplitRef.current || tabDragRef.current) return
      const s = loadSplitState()
      const cur = atlasSplitRef.current
      if (!s) {
        if (cur) {
          commitSplit(null)
          setSplitOpen(false)
          setSoloTab(null)
        }
        return
      }
      // 🔴 改动 2026-10-16 · 回声/同内容判定只看内容四字段（view 仅保存态字段，内存对象不带，避免序列化顺序差异误判）
      const canon = (x: AtlasSplitState) => JSON.stringify({ a: x.activeSplit, b: x.boards, r: x.root, p: x.pinned })
      if (cur && canon(s) === canon(cur)) {
        // 内容一致仅视图不同：只应用视图，不写回（防两窗口互写循环）
        setSplitOpen(s.view !== 'solo' && s.view !== 'main')
        // 🔴 改动 2026-10-16 · solo 目标钉着屏幕钉时不恢复独占（同一文档双渲染防御，与初始加载同理）
        setSoloTab(s.view === 'solo' && !s.pinned[s.activeSplit] ? s.activeSplit : null)
        return
      }
      const prevBoards = cur?.boards ?? []
      s.boards.forEach((b, i) => {
        if (JSON.stringify(prevBoards[i]) !== JSON.stringify(b)) bumpStamp(i)
      })
      commitSplit(s)
      // 🔴 改动 2026-10-16 · 跟随另一窗口的视图态（拆分 / 独占 / 主画板全屏）
      setSplitOpen(s.view !== 'solo' && s.view !== 'main')
      // 🔴 改动 2026-10-16 · solo 目标钉着屏幕钉时不恢复独占（同一文档双渲染防御，与初始加载同理）
      setSoloTab(s.view === 'solo' && !s.pinned[s.activeSplit] ? s.activeSplit : null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardWinId])

  /** 🔴 改动 2026-10-12 · 下一个可用 Tab 名（取已有 TabN 最大编号 +1，删过中间 Tab 也不重名） */
  const nextTabName = (boards: BoardDoc[]) => {
    let max = 0
    for (const b of boards) {
      const m = /^Tab(\d+)$/.exec(b.title ?? '')
      if (m) max = Math.max(max, Number(m[1]))
    }
    return `Tab${Math.max(max + 1, boards.length + 1)}`
  }

  /** 新建空白 Tab 画板：追加到末尾；单画板 → [主 | 新板]，已拆分 → 整树左侧 + 新板右侧 */
  const appendBlankTab = (dir: SplitDirection) => {
    const prev = atlasSplitRef.current ?? emptySplitState()
    const boards = [...prev.boards]
    const index = boards.length
    boards.push(emptyBoard(nextTabName(boards)))
    const root = groupNode(leafCount(prev.root) === 1 ? dir : (prev.root.kind === 'group' ? prev.root.direction : dir), 0.5, prev.root, boardNode(index))
    commitSplit({ activeSplit: index, boards, root, pinned: [...prev.pinned, false] })
    setSoloTab(null)
    setSplitOpen(true)
  }

  /** 🔴 改动 2026-10-15 · Tab 坞空白处「新建画板」：全新空白画板追加到坞最右侧（主画板第 1、地图第 2，
   *  新建画板至少排第 3，一律从左向右追加），并以独占全屏显示（不是同屏分屏，不动主画板）；
   *  想同屏对比时点任一 Tab 右侧的拆分入口或画板右键「拆分画板」 */
  const createBlankMainBoard = () => {
    const prev = atlasSplitRef.current ?? emptySplitState()
    const boards = [...prev.boards]
    const index = boards.length
    boards.push(emptyBoard(nextTabName(boards)))
    const root = groupNode(
      leafCount(prev.root) === 1 ? 'vertical' : (prev.root.kind === 'group' ? prev.root.direction : 'vertical'),
      0.5, prev.root, boardNode(index),
    )
    commitSplit({ activeSplit: index, boards, root, pinned: [...prev.pinned, false] })
    // 保持单画板视图并独占显示新画板：新空白画板占满屏幕，不与其它画板同屏
    setSplitOpen(false)
    setSoloTab(index)
  }

  /** 🔴 改动 2026-10-13 · 技能激活 → 框线范围已抽取为子画板：挂新 Tab，默认屏幕钉（浮动窗口）；
   *  叶子以收起态入树（pinned 叶子不在窗格渲染，兄弟画板自动填充）
   *  🔴 改动 2026-10-16 · parent = 技能所在画板的身份（'main' / 父画板 tid）：浮动窗口只在父画板可见时显示 */
  const handleChainActivated = (sub: { doc: BoardDoc; title: string; kind: 'thread' | 'loop' }, parent?: string) => {
    const prev = atlasSplitRef.current ?? emptySplitState()
    // 🔴 改动 2026-10-15 · 补发 Tab 稳定身份 tid（引擎抽取的子画板文档没有该字段）；
    // 标记 isSubBoard：属于其它画板的子画板不在 Tab 坞显示标签（只以屏幕钉浮动窗口存在）
    const subDoc: BoardDoc = { ...sub.doc, isSubBoard: true, tid: sub.doc.tid ?? uid(), ...(parent ? { pinParent: parent } : {}) }
    const boards = [...prev.boards, subDoc]
    const index = boards.length - 1
    const root = groupNode('vertical', 0.5, prev.root, boardNode(index, true))
    commitSplit({ activeSplit: index, boards, root, pinned: [...prev.pinned, true] })
    // 🔴 改动 2026-10-15 · 不再强制打开拆分视图：当前全屏/独占视图原样保留，浮动窗口直接浮在上方
  }

  /** Tab 坞点击：切换次窗格显示的拆分画板并打开拆分视图。
      🔴 改动 2026-10-13 · 同时取消钉、恢复收起（被覆盖）并复位祖先分组比例到 50/50；
      已拆出的 Tab（detachId）点击 = 挂回主窗口（清除拆出标记，独立窗口侧经 storage 事件感知）
      🔴 改动 2026-10-15 · forceSolo = 画中画拖回坞等场景：无论当前是否拆分视图都独占全屏显示 */
  const handleSelectTab = (index: number, forceSolo = false) => {
    const prev = atlasSplitRef.current
    if (!prev || !prev.boards[index]) return
    // 🔴 改动 2026-10-14 · 点任一拆分 Tab 即回画板（退出地图视图，拆分状态原样恢复）
    setMapOpen(false)
    setPinnedSelected(null)
    const target = prev.boards[index]
    const boards = target.detachId
      ? prev.boards.map((b, i) => {
          if (i !== index) return b
          const next = { ...b }
          delete next.detachId
          return next
        })
      : prev.boards
    // 🔴 改动 2026-10-15 · 单画板全屏视图下点 Tab = 该画板独占全屏（solo），不自动进入同屏拆分；
    // 已在拆分视图里点 Tab 维持原行为（切换次窗格并展开）
    const restore = (node: SplitNode): SplitNode => {
      if (node.kind === 'board') return node.tab === index ? { ...node, collapsed: false } : node
      const first = restore(node.first)
      const second = restore(node.second)
      const contains = containsTab(node.first, index) || containsTab(node.second, index)
      return { ...node, ratio: contains ? 0.5 : node.ratio, first, second }
    }
    const commit = { ...prev, activeSplit: index, boards, root: restore(prev.root), pinned: prev.pinned.map((p, i) => (i === index ? false : p)) }
    if (!splitOpen || forceSolo) {
      // 🔴 改动 2026-10-16 · 画中画拖回坞 = 脱离父画板重新成为普通画板：就地清子画板标记（不换对象，
      // 保住引擎 in-place 持久化引用），Tab 标签在坞里重新出现；父级归属一并清除（下次钉住按落点重记）
      if (forceSolo && prev.boards[index].isSubBoard) {
        prev.boards[index].isSubBoard = false
        delete prev.boards[index].pinParent
      }
      // 独占全屏同时取消屏幕钉（钉是拆分视图里的浮动窗口语义），叶子复位（下次进拆分视图直接可见）
      commitSplit(commit)
      setSplitOpen(false)
      setSoloTab(index)
      return
    }
    commitSplit(commit)
    setSoloTab(null)
    setSplitOpen(true)
  }

  /** 🔴 改动 2026-10-15 · Tab 坞栏引用 + 画中画拖回坞的悬停高亮态（指针悬在坞上时整栏亮边提示落点） */
  const dockBarRef = useRef<HTMLDivElement>(null)
  const [pinDragOverDock, setPinDragOverDock] = useState(false)
  const pointerOverDock = (clientX: number, clientY: number) => {
    const r = dockBarRef.current?.getBoundingClientRect()
    return !!r && clientX >= r.left && clientX <= r.right && clientY >= r.top - 6 && clientY <= r.bottom + 6
  }

  /** 🔴 改动 2026-10-16 · 浮动窗口位置落盘：拖动结束后把 pinPosMap 快照进拆分状态（与 boards 下标对齐），
   *  刷新后画中画窗口保持保存时的位置 */
  const persistPinPos = () => {
    const prev = atlasSplitRef.current
    if (!prev) return
    commitSplit({ ...prev, pinPos: prev.boards.map((_, i) => pinPosMapRef.current[i] ?? null) })
  }

  /** 🔴 改动 2026-10-13 · 拖动悬浮子画板：屏幕像素增量，钳制在画板区范围内（每 Tab 独立位置） */
  const movePinned = (index: number, dx: number, dy: number) => {
    setPinPosMap((m) => {
      const p = m[index] ?? { x: 24 + index * 28, y: 48 + index * 28 }
      const area = boardAreaRef.current
      const win = pinWinRefs.current.get(index)
      if (!area || !win) return { ...m, [index]: { x: p.x + dx, y: p.y + dy } }
      const ar = area.getBoundingClientRect()
      const nx = Math.min(Math.max(p.x + dx, 8), Math.max(8, ar.width - win.offsetWidth - 8))
      const ny = Math.min(Math.max(p.y + dy, 8), Math.max(8, ar.height - win.offsetHeight - 8))
      return { ...m, [index]: { x: nx, y: ny } }
    })
  }

  // ---------- 🔴 改动 2026-10-13 · Tab 撕离（复刻 Chrome 标签拖出） ----------
  /** 🔴 改动 2026-10-16 · 画板表面当前是否作为「承载面」可见（-1 = 主画板）：
   *  浮动窗口只渲染在父画板可见时——每个 Tab 是独立画板，拖进 Tab1 的子画板不出现在主画板上。
   *  父画板自身也是浮动窗口时递归判定（嵌套画中画跟随父窗口显隐），depth 防御环。 */
  const isBoardSurfaceVisible = (tab: number, depth = 0): boolean => {
    if (depth > 8 || mapOpen) return false
    if (tab === -1) {
      if (splitOpen) return collectLeaves(splitRoot).some((l) => l.tab === -1 && !l.collapsed)
      return soloTab === null
    }
    if (splitPinned[tab] === true) {
      const p = splitBoards[tab]?.pinParent
      if (!p) return true
      if (p === 'main') return isBoardSurfaceVisible(-1, depth + 1)
      const pi = splitBoards.findIndex((b) => b.tid === p)
      return pi < 0 ? true : isBoardSurfaceVisible(pi, depth + 1)
    }
    if (splitOpen) return collectLeaves(splitRoot).some((l) => l.tab === tab && !l.collapsed)
    return soloTab === tab
  }

  /** 浮动窗口 i 当前是否渲染：无父级记录（旧数据）= 全局悬浮（兼容旧行为）；父画板已删除 = 兜底全局可见 */
  const pinnedWindowVisible = (i: number): boolean => {
    const p = splitBoards[i]?.pinParent
    if (!p) return true
    if (p === 'main') return isBoardSurfaceVisible(-1)
    const pi = splitBoards.findIndex((b) => b.tid === p)
    return pi < 0 ? true : isBoardSurfaceVisible(pi)
  }

  /** 落点区域判定：窗外 = 拆出新窗口；画板区 = 画中画钉到落点；其余（坞/壳层）= 取消 */
  const tearZoneOf = (clientX: number, clientY: number): 'dock' | 'board' | 'outside' => {
    if (clientX < 0 || clientY < 0 || clientX > window.innerWidth || clientY > window.innerHeight) return 'outside'
    const rect = boardAreaRef.current?.getBoundingClientRect()
    if (rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return 'board'
    return 'dock'
  }

  /** 拖到画板上 = 浮动子画板（画中画）：钉住该 Tab，浮动窗口落在释放点；
   *  原窗格叶子随即收起（flex 归零），同组兄弟画板自动填充剩余空间（点 Tab 可复位）
   *  🔴 改动 2026-10-16 · 底层是整屏单块画板（全屏/独占视图，非同屏拆分）时，被钉的 Tab 就是
   *  底层那块画板的子画板：就地标记 isSubBoard（不换对象，保住引擎 in-place 持久化的引用同一性），
   *  Tab 坞不再显示它的标签；同屏拆分视图上的钉不影响（父画板不唯一，维持普通 Tab） */
  const pinTabAt = (index: number, clientX: number, clientY: number) => {
    const prev = atlasSplitRef.current
    if (!prev || !prev.boards[index]) return
    const rect = boardAreaRef.current?.getBoundingClientRect()
    const x = Math.max(8, clientX - (rect?.left ?? 0) - 240)
    const y = Math.max(8, clientY - (rect?.top ?? 0) - 20)
    setPinPosMap((m) => ({ ...m, [index]: { x, y } }))
    pinPosMapRef.current = { ...pinPosMapRef.current, [index]: { x, y } }
    if (!splitOpen && !mapOpen) prev.boards[index].isSubBoard = true
    // 🔴 改动 2026-10-16 · 钉住的正是当前独占全屏（solo）的画板：先退出独占、底层回落主画板。
    // 否则同一份文档被「独占全屏 + 浮动窗口」两个引擎同时挂载：浮窗里的编辑只重渲浮窗
    // （两引擎无互同步），底层全屏视图照旧空白；刷新后两个视图各自渲染同一份持久化文档，
    // 表现为「父画板多出来一个节点」（实为同一块画板被渲染了两次）。
    // 同步清 ref：紧随其后的 commitSplit → persistSplit 读 soloTabRef 计算 view，须立即生效。
    if (soloTab === index) {
      soloTabRef.current = null
      setSoloTab(null)
    }
    // 🔴 改动 2026-10-16 · 记录父画板身份：落点在哪块画板，浮动窗口就只属于哪块画板
    // （每个 Tab 是独立画板——拖进 Tab1 的子画板不再出现在主画板上）。
    // 拆分视图：按落点命中窗格（data-pane-tab）；独占全屏：父 = 当前独占画板；主画板全屏：父 = 'main'；
    // 地图视图 / 未命中窗格：清掉旧归属，回落全局悬浮（兼容旧行为）。
    // 就地写文档字段（不换对象，保住引擎 in-place 持久化的引用同一性），随后 commitSplit 一并落盘。
    let parent: string | undefined
    if (splitOpen) {
      for (const el of document.elementsFromPoint(clientX, clientY)) {
        const pane = (el as HTMLElement).closest?.('[data-pane-tab]') as HTMLElement | null
        if (!pane) continue
        const t = Number(pane.dataset.paneTab)
        if (t === -1) { parent = 'main'; break }
        if (Number.isInteger(t) && t >= 0 && t !== index && prev.boards[t]?.tid) { parent = prev.boards[t].tid; break }
      }
    } else if (!mapOpen) {
      // 钉住的正是当前独占画板时上方已退出独占、底层回落主画板，故父 = 'main'
      if (soloTab === index || soloTab === null) parent = 'main'
      else if (prev.boards[soloTab]?.tid) parent = prev.boards[soloTab].tid
    }
    if (parent) prev.boards[index].pinParent = parent
    else delete prev.boards[index].pinParent
    const cover = (node: SplitNode): SplitNode => {
      if (node.kind === 'board') return node.tab === index ? { ...node, collapsed: true } : node
      return { ...node, first: cover(node.first), second: cover(node.second) }
    }
    commitSplit({
      ...prev,
      activeSplit: index,
      root: cover(prev.root),
      pinned: prev.pinned.map((p, i) => (i === index ? true : p)),
      // 🔴 改动 2026-10-16 · 浮动窗口初始位置一并落盘（刷新后保持）
      pinPos: prev.boards.map((_, i) => (i === index ? { x, y } : pinPosMapRef.current[i] ?? null)),
    })
    setPinnedSelected(index)
    // 🔴 改动 2026-10-15 · 不再强制打开拆分视图：从全屏/独占视图拖出时当前视图原样保留，
    // 只把浮动窗口浮到上方（原逻辑会把拆分视图弹出来，右侧多出一块画板）
  }

  /** 拖出浏览器窗口 = 拆出为独立浏览器窗口（可拖到另一台显示器）：文档挂 detachId 后先落盘，
   *  弹窗经 ?boardwin=<detachId> 读同一份文档（同源 localStorage 共享 + storage 事件双向同步）。
   *  window.open 在 pointerup 用户手势内调用，浏览器不拦截 */
  const tearOffTab = (index: number, screenX: number, screenY: number) => {
    const prev = atlasSplitRef.current
    const board = prev?.boards[index]
    if (!prev || !board) return
    const doc = board.detachId ? board : { ...board, detachId: uid() }
    const next = { ...prev, boards: prev.boards.map((b, i) => (i === index ? doc : b)) }
    commitSplit(next)
    // 拆出必须保证弹窗能读到文档：绕过落盘规则直接写入（内存对象不带 view，这里按当前视图补上）
    saveSplitState({ ...next, view: !splitOpenRef.current ? (soloTabRef.current !== null ? 'solo' as const : 'main' as const) : 'split' as const })
    const url = `${window.location.origin}${window.location.pathname}?boardwin=${doc.detachId}`
    window.open(
      url,
      '_blank',
      `popup=yes,width=1160,height=760,left=${Math.max(0, Math.round(screenX - 220))},top=${Math.max(0, Math.round(screenY - 32))}`,
    )
  }

  /** 🔴 改动 2026-10-15 · 坞内拖动换位的 Tab 元素引用（下标 → DOM，用于指针 x 越过中线的插入位判定） */
  const dockTabRefs = useRef(new Map<number, HTMLButtonElement>())

  /** 🔴 改动 2026-10-15 · 换位即时交换动效（复刻 Chrome）：FLIP 技术——换位前记录各 Tab 可视位置，
   *  提交换位后先按旧位置反向 translate 锁住起点（无过渡跳变），再释放过渡滑回 0，
   *  被越过的标签像被推开一样滑入新位；连续快速换位时上一条动画的定时清理被取消，从新起点续滑 */
  const flipRectsRef = useRef<Map<HTMLButtonElement, DOMRect> | null>(null)
  const flipTimersRef = useRef(new Map<HTMLButtonElement, number>())
  useLayoutEffect(() => {
    const olds = flipRectsRef.current
    flipRectsRef.current = null
    if (!olds) return
    for (const [el, old] of olds) {
      if (!el.isConnected) continue
      const now = el.getBoundingClientRect()
      const dx = old.left - now.left
      const prevTimer = flipTimersRef.current.get(el)
      if (prevTimer) window.clearTimeout(prevTimer)
      if (!dx) {
        el.style.transition = ''
        el.style.transform = ''
        continue
      }
      el.style.transition = 'none'
      el.style.transform = `translateX(${dx}px)`
      void el.getBoundingClientRect() // 强制回流，锁住动画起点
      el.style.transition = 'transform 170ms cubic-bezier(0.25, 0.8, 0.3, 1)'
      el.style.transform = 'translateX(0)'
      flipTimersRef.current.set(
        el,
        window.setTimeout(() => {
          // 拖动进行中样式归拖动视觉态管理，不能清（防刚换位完 240ms 内起新拖时被抹掉跟手 transform）
          if (!dragVisualRef.current) {
            el.style.transition = ''
            el.style.transform = ''
          }
          flipTimersRef.current.delete(el)
        }, 240),
      )
    }
  })

  /** 🔴 改动 2026-10-15 · Chrome 式 Tab 换位（数据层）：boards/pinned 同步移动 + 拆分树叶 tab 下标全树重映射
   *  （主画板叶 tab:-1 不受映射影响）；solo / 选中浮动窗口按下标联动重映射。
   *  仅在松手时调用一次；拖动过程走 dragVisualRef 纯视觉，不触发重渲染。
   *  pinPosMap（浮动窗口位置）按下标存：换位后位置跟随新下标，略有偏移可再拖，属低频可接受 */
  const reorderTab = (from: number, to: number) => {
    const prev = atlasSplitRef.current
    if (!prev || from === to || from < 0 || to < 0 || from >= prev.boards.length || to >= prev.boards.length) return
    const boards = [...prev.boards]
    const pinned = [...prev.pinned]
    const [doc] = boards.splice(from, 1)
    boards.splice(to, 0, doc)
    const [p] = pinned.splice(from, 1)
    pinned.splice(to, 0, p)
    // 🔴 改动 2026-10-16 · 浮动窗口位置跟随 Tab 换位（按下标对齐存储，需同步重排）
    const pinPos = [...(prev.pinPos ?? prev.boards.map(() => null))]
    const [pp] = pinPos.splice(from, 1)
    pinPos.splice(to, 0, pp)
    const remap = (t: number): number => {
      if (t === from) return to
      return from < to ? (t > from && t <= to ? t - 1 : t) : (t >= to && t < from ? t + 1 : t)
    }
    const remapTree = (node: SplitNode): SplitNode =>
      node.kind === 'board' ? { ...node, tab: remap(node.tab) } : { ...node, first: remapTree(node.first), second: remapTree(node.second) }
    commitSplit({ ...prev, activeSplit: remap(prev.activeSplit), boards, root: remapTree(prev.root), pinned, pinPos })
    setSoloTab((s) => (s === null ? null : remap(s)))
    setPinnedSelected((s) => (s === null ? null : remap(s)))
  }

  /** 🔴 改动 2026-10-15 · 拖动视觉态（复刻 Chrome 丝滑手感的核心）：拖动期间**不动数据模型**——
   *  拖着的标签 translate 1:1 跟随指针（无过渡），被越过的标签按插入位平滑滑开/让位（短过渡），
   *  零 React 重渲染、零画板窗格重挂；松手才一次性提交逻辑换位（reorderTab）并经 FLIP 滑入终位 */
  const dragVisualRef = useRef<{
    dragEl: HTMLButtonElement
    startX: number
    homeIndex: number
    dragWidth: number
    /** 各标签未变换布局位置（home = 完整数组下标，拖动过程不变） */
    base: Map<HTMLButtonElement, { home: number; mid: number }>
    /** 当前视觉插入位 = 排在拖动标签前的其它标签个数（0..n-1） */
    insert: number
  } | null>(null)

  /** 视觉态初始化：清掉上次中断残留的 transform，记录各标签布局位置与拖动起点 */
  const beginDragVisual = (index: number, clientX: number) => {
    dockTabRefs.current.forEach((el) => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.zIndex = ''
    })
    const dragEl = dockTabRefs.current.get(index)
    if (!dragEl) return
    const base = new Map<HTMLButtonElement, { home: number; mid: number }>()
    dockTabRefs.current.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      base.set(el, { home: i, mid: r.left + r.width / 2 })
    })
    const dr = dragEl.getBoundingClientRect()
    dragVisualRef.current = { dragEl, startX: clientX, homeIndex: index, dragWidth: dr.width, base, insert: index }
    dragEl.style.transition = 'none'
    dragEl.style.zIndex = '20'
  }

  /** 按当前插入位重排其它标签的 transform：向右拖 → 途经标签左移让出空位；向左拖 → 右移（Chrome 式滑开） */
  const applyDragShift = () => {
    const dv = dragVisualRef.current
    if (!dv) return
    const { base, dragEl, homeIndex: h, dragWidth: w, insert: s } = dv
    base.forEach((info, el) => {
      if (el === dragEl) return
      let dx = 0
      if (s > h) {
        if (info.home > h && info.home <= s) dx = -w
      } else if (s < h) {
        if (info.home >= s && info.home < h) dx = w
      }
      el.style.transition = 'transform 130ms cubic-bezier(0.3, 0.7, 0.4, 1)'
      el.style.transform = dx ? `translateX(${dx}px)` : 'translateX(0)'
    })
  }

  /** 结束视觉态：清内联样式（drop 到坞内且已记录 FLIP 起点时由 layout effect 接管动画） */
  const clearDragVisual = () => {
    dragVisualRef.current = null
    dockTabRefs.current.forEach((el) => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.zIndex = ''
    })
  }

  /** Tab 撕离/换位拖拽统一入口（SplitDockTab 上报 start/move/end） */
  const handleTearDrag = (index: number, label: string) => (phase: 'start' | 'move' | 'end', e: { clientX: number; clientY: number; screenX: number; screenY: number }) => {
    const zone = tearZoneOf(e.clientX, e.clientY)
    if (phase === 'start') {
      beginDragVisual(index, e.clientX)
      tabDragRef.current = { index, label, x: e.clientX, y: e.clientY, zone }
      setTabDrag(tabDragRef.current)
      return
    }
    if (phase === 'end') {
      const dv = dragVisualRef.current
      setTabDrag(null)
      if (zone === 'board') {
        clearDragVisual()
        pinTabAt(index, e.clientX, e.clientY)
      } else if (zone === 'outside') {
        clearDragVisual()
        tearOffTab(index, e.screenX, e.screenY)
      } else if (dv) {
        // 坞内落点：记录各标签当前可视位置（含 transform）→ 清样式 → 提交逻辑换位 → FLIP 滑入最终位
        const olds = new Map<HTMLButtonElement, DOMRect>()
        dockTabRefs.current.forEach((el) => olds.set(el, el.getBoundingClientRect()))
        const from = dv.homeIndex
        const to = dv.insert
        clearDragVisual()
        if (to !== from) {
          flipRectsRef.current = olds
          reorderTab(from, to)
        } else {
          // 回到原位：拖着的标签从指针位置滑回（其它标签已回到 0）
          const el = dv.dragEl
          const dx = e.clientX - dv.startX
          if (dx) {
            el.style.transition = 'none'
            el.style.transform = `translateX(${dx}px)`
            void el.getBoundingClientRect()
            el.style.transition = 'transform 150ms cubic-bezier(0.25, 0.8, 0.3, 1)'
            el.style.transform = 'translateX(0)'
            window.setTimeout(() => {
              el.style.transition = ''
              el.style.transform = ''
              el.style.zIndex = ''
            }, 200)
          }
        }
      }
      return
    }
    // move：拖着的标签 1:1 跟随指针（无过渡，零延迟跟手）
    const dv = dragVisualRef.current
    if (dv) {
      dv.dragEl.style.transform = `translateX(${e.clientX - dv.startX}px)`
      if (zone === 'dock') {
        // 插入位 = 布局中线在指针左侧的其它标签个数（用未变换的 base 判定，不受滑开 transform 干扰）
        let s = 0
        dv.base.forEach((info, el) => {
          if (el !== dv.dragEl && e.clientX > info.mid) s += 1
        })
        if (s !== dv.insert) {
          dv.insert = s
          applyDragShift()
        }
      }
    }
    tabDragRef.current = { index, label, x: e.clientX, y: e.clientY, zone }
    setTabDrag(tabDragRef.current)
  }

  /** 🔴 改动 2026-10-13 · 框线框选命中悬浮子画板：画板空白左键拖框，矩形与窗口有重叠即进入选中态 */
  const onBoardAreaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 🔴 改动 2026-10-14 · 地图视图下不启动框选/悬浮子画板命中判定（指针与滚轮全交给地图）
    if (mapOpen) return
    if (e.button !== 0) return
    const t = e.target as HTMLElement
    if (t.closest('.sr-pinned-board') || t.closest('.sr-hud') || t.closest('[data-placed-widget]')) return
    if (t.closest('.sr-board-card') || t.closest('[data-port-side]') || t.closest('.sr-board-wire')) return
    // 与引擎框选并行：只记录矩形用于命中判定（引擎负责卡片选中与本矩形绘制）
    pinMarqueeRef.current = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY }
    const move = (ev: PointerEvent) => {
      if (pinMarqueeRef.current) pinMarqueeRef.current = { ...pinMarqueeRef.current, x2: ev.clientX, y2: ev.clientY }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const m = pinMarqueeRef.current
      pinMarqueeRef.current = null
      if (!m) return
      // 任意方向拖框：先归一化矩形（x1<=x2 / y1<=y2），再判与窗口矩形重叠
      const mx1 = Math.min(m.x1, m.x2)
      const mx2 = Math.max(m.x1, m.x2)
      const my1 = Math.min(m.y1, m.y2)
      const my2 = Math.max(m.y1, m.y2)
      // 🔴 改动 2026-10-13 · 多浮动子画板：选中最后一个（渲染序最靠上）与框选矩形重叠的窗口
      let hit: number | null = null
      for (const [index, win] of pinWinRefs.current) {
        const r = win.getBoundingClientRect()
        const overlap = Math.min(mx2, r.right) > Math.max(mx1, r.left) && Math.min(my2, r.bottom) > Math.max(my1, r.top)
        if (overlap) hit = index
      }
      setPinnedSelected(hit)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** 🔴 改动 2026-10-13 · 删除拆分 Tab（确认弹窗通过后执行）：树中叶子移除 + 下标重排 */
  const performDeleteTab = (index: number) => {
    const prev = atlasSplitRef.current
    if (!prev || !prev.boards[index]) return
    const boards = prev.boards.filter((_, i) => i !== index)
    const pinned = prev.pinned.filter((_, i) => i !== index)
    const reindex = (node: SplitNode): SplitNode => {
      if (node.kind === 'board') return { ...node, tab: node.tab > index ? node.tab - 1 : node.tab }
      return { ...node, first: reindex(node.first), second: reindex(node.second) }
    }
    // 找到该 tab 的叶子路径并移除（每板一叶；removeLeaf 自动上提兄弟）
    let root = reindex(prev.root)
    for (let guard = 0; guard < 64; guard++) {
      const leaf = collectLeaves(root).find((l) => l.tab === index)
      if (!leaf) break
      root = removeLeaf(root, leaf.path)
    }
    if (!containsTab(root, -1)) root = mainBoardNode()
    let active = prev.activeSplit
    if (index < active) active -= 1
    else if (index === active) active = Math.min(active, boards.length - 1)
    if (editingTab === index) setEditingTab(null)
    // 🔴 改动 2026-10-15 · 独占全屏的 Tab 被删 → 退出独占；其后下标前移
    setSoloTab((s) => (s === null ? null : s === index ? null : s > index ? s - 1 : s))
    if (boards.length === 0) {
      commitSplit(null)
      setSplitOpen(false)
      return
    }
    commitSplit({ activeSplit: Math.max(0, Math.min(active, boards.length - 1)), boards, root, pinned })
  }

  /** 🔴 改动 2026-10-13 · 删除主画板（安全弹窗通过后执行）：右侧第一个画板自动成为主画板并全展开显示 */
  const performDeleteMain = () => {
    const prev = atlasSplitRef.current
    const boards = prev?.boards ?? []
    setSoloTab(null) // 🔴 改动 2026-10-15 · boards 整体前移，独占态直接复位
    if (boards.length === 0) {
      // 无右侧画板 → 重置为全新空画板（框架写死必须有一个主画板）
      primaryEngineRef.current?.loadDoc(emptyBoard('画板'))
      setMainTitle('画板')
      commitSplit(null)
      setSplitOpen(false)
      return
    }
    const newMain = boards[0]
    const rest = boards.slice(1)
    const restPinned = (prev?.pinned ?? []).slice(1)
    primaryEngineRef.current?.loadDoc(newMain)
    setMainTitle(newMain.title || '画板')
    const reindex = (node: SplitNode): SplitNode => {
      if (node.kind === 'board') {
        if (node.tab === 0) return { ...node, tab: -1, collapsed: false }
        return { ...node, tab: node.tab > 0 ? node.tab - 1 : node.tab }
      }
      return { ...node, first: reindex(node.first), second: reindex(node.second) }
    }
    const root = reindex(prev?.root ?? mainBoardNode())
    if (rest.length === 0) {
      commitSplit(null)
      setSplitOpen(false)
      return
    }
    commitSplit({ activeSplit: 0, boards: rest, root, pinned: restPinned })
    // 新主画板全展开显示 = 默认单画板状态
    setSplitOpen(false)
  }

  /** 🔴 改动 2026-10-13 · 成为主画板：目标画板与主画板互换文档（Tab 保留，主画板窗格重挂内容） */
  const performBecomeMain = (index: number) => {
    const prev = atlasSplitRef.current
    const engine = primaryEngineRef.current
    if (!prev || !prev.boards[index] || !engine) return
    // 深拷贝旧主画板（loadDoc 会原位突变主文档，必须先把旧内容克隆下来再换入 Tab）
    const oldMain = sanitizeDoc(engine.getDoc(), 0)
    const newMain = prev.boards[index]
    engine.loadDoc(newMain)
    setMainTitle(newMain.title || '画板')
    bumpStamp(index)
    // 🔴 改动 2026-10-15 · 独占的就是这块板 → 内容已换到主画板，退出独占显示主画板
    setSoloTab((s) => (s === index ? null : s))
    commitSplit({
      ...prev,
      activeSplit: prev.activeSplit,
      boards: prev.boards.map((b, i) => (i === index ? oldMain : b)),
      pinned: prev.pinned.map((p, i) => (i === index ? false : p)),
    })
  }

  /** 🔴 改动 2026-10-13 · 单画板空白右键拆分：只拆所在画板（方向取与所在分组垂直，单板默认 vertical） */
  const performBoardSplit = (path: number[]) => {
    const prev = atlasSplitRef.current ?? emptySplitState()
    const leaf = nodeAt(prev.root, path)
    if (!leaf || leaf.kind !== 'board') return
    const boards = [...prev.boards]
    const index = boards.length
    boards.push(emptyBoard(nextTabName(boards)))
    const dir = splitDirectionForLeaf(prev.root, path)
    const root = setNodeAt(prev.root, path, groupNode(dir, 0.5, leaf, boardNode(index)))
    commitSplit({ activeSplit: index, boards, root, pinned: [...prev.pinned, false] })
    setSoloTab(null)
    setSplitOpen(true)
  }

  /** 🔴 改动 2026-10-13 · 收起画板：本窗格叶子进入收起（被覆盖）状态，Tab 坞点击复位 */
  const performCollapse = (path: number[]) => {
    const prev = atlasSplitRef.current
    if (!prev) return
    const leaf = nodeAt(prev.root, path)
    if (!leaf || leaf.kind !== 'board' || leaf.collapsed) return
    commitSplit({ ...prev, root: setNodeAt(prev.root, path, { ...leaf, collapsed: true }) })
  }

  /** 🔴 改动 2026-10-13 · 分隔线右键「拆分」：两块画板同时拆分（各加一块空白板 → 4 块） */
  const performDividerSplit = (path: number[]) => {
    const prev = atlasSplitRef.current
    if (!prev) return
    const node = nodeAt(prev.root, path)
    if (!node || node.kind !== 'group') return
    const boards = [...prev.boards]
    const pinnedList = [...prev.pinned]
    const perp: SplitDirection = node.direction === 'vertical' ? 'horizontal' : 'vertical'
    const splitChild = (child: SplitNode): SplitNode => {
      const index = boards.length
      boards.push(emptyBoard(nextTabName(boards)))
      pinnedList.push(false)
      return groupNode(perp, 0.5, child, boardNode(index))
    }
    const root = setNodeAt(prev.root, path, { ...node, first: splitChild(node.first), second: splitChild(node.second) })
    commitSplit({ ...prev, activeSplit: boards.length - 1, boards, root, pinned: pinnedList })
    setSoloTab(null)
    setSplitOpen(true)
  }

  /** 🔴 改动 2026-10-13 · 分隔线右键「向X覆盖」：一侧盖住另一侧，被覆盖的画板进入收起状态。
   *  coverSecond=true → 第一块盖第二块（ratio=1）；false → 第二块盖第一块（ratio=0） */
  const performCover = (path: number[], coverSecond: boolean) => {
    const prev = atlasSplitRef.current
    if (!prev) return
    const node = nodeAt(prev.root, path)
    if (!node || node.kind !== 'group') return
    const markCollapsed = (n: SplitNode): SplitNode =>
      n.kind === 'board' ? { ...n, collapsed: true } : { ...n, first: markCollapsed(n.first), second: markCollapsed(n.second) }
    const root = setNodeAt(prev.root, path, coverSecond
      ? { ...node, ratio: 1, second: node.second, first: markCollapsed(node.first) }
      : { ...node, ratio: 0, first: node.first, second: markCollapsed(node.second) })
    commitSplit({ ...prev, root })
  }

  /** 🔴 改动 2026-10-12 · Tab 行内改名入口（双击或右键菜单「重命名」） */
  const startTabEdit = (index: number | 'main') => {
    setTabMenu(null)
    setEditingTab(index)
  }
  const cancelTabEdit = () => setEditingTab(null)
  /** 提交 Tab 改名：主画板经引擎 setTitle（随主文档持久化）；拆分画板更新 board.title 并按固定规则落盘 */
  const commitTabName = (index: number | 'main', name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (index === 'main') {
      primaryEngineRef.current?.setTitle(trimmed)
      setMainTitle(trimmed)
    } else {
      const prev = atlasSplitRef.current
      if (!prev || !prev.boards[index]) return
      commitSplit({
        ...prev,
        boards: prev.boards.map((b, i) => (i === index ? { ...b, title: trimmed } : b)),
      })
    }
    setEditingTab(null)
  }

  // 🔴 改动 2026-10-12 · Tab 右键菜单：点别处/Esc 关闭；右键坞内其它标签时切到新菜单不误关
  useEffect(() => {
    if (!tabMenu && !dividerMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTabMenu(null)
        setDividerMenu(null)
      }
    }
    const onCtx = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && (e.target.closest('[aria-label="画板 Tab 坞"]') || e.target.closest('[data-split-divider]'))) return
      setTabMenu(null)
      setDividerMenu(null)
    }
    window.addEventListener('click', () => {
      setTabMenu(null)
      setDividerMenu(null)
    })
    window.addEventListener('contextmenu', onCtx)
    window.addEventListener('blur', () => {
      setTabMenu(null)
      setDividerMenu(null)
    })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', () => undefined)
      window.removeEventListener('contextmenu', onCtx)
      window.removeEventListener('blur', () => undefined)
      window.removeEventListener('keydown', onKey)
    }
  }, [tabMenu, dividerMenu])

  /** 🔴 改动 2026-10-12 · 分隔把手不设限制（按用户要求）：可以自由拖到完全覆盖另一块画板；
      被覆盖的画板有内容时点其对应 Tab 即复位 50/50 完整显示（见 handleSelectTab） */
  const clampSplitRatio = (r: number) => Math.min(1, Math.max(0, r))

  /** 🔴 改动 2026-10-11 · 拆分边界拖拽：pointer capture 实时改该分组比例 */
  const onSplitPointerDown = (e: React.PointerEvent<HTMLDivElement>, path: number[]) => {
    if (e.button !== 0) return
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const group = nodeAt(atlasSplitRef.current?.root ?? mainBoardNode(), path)
    if (group?.kind === 'group') dragDirRef.current = group.direction
    setDraggingSplit(true)
    const move = (ev: PointerEvent) => {
      const prev = atlasSplitRef.current
      if (!prev) return
      const groupNow = nodeAt(prev.root, path)
      const wrap = el.parentElement
      if (!groupNow || groupNow.kind !== 'group' || !wrap) return
      const rect = wrap.getBoundingClientRect()
      const r = groupNow.direction === 'vertical'
        ? (ev.clientX - rect.left) / rect.width
        : (ev.clientY - rect.top) / rect.height
      const next = { ...prev, root: setNodeAt(prev.root, path, { ...groupNow, ratio: clampSplitRatio(r) }) }
      atlasSplitRef.current = next
      setAtlasSplit(next)
    }
    const up = () => {
      setDraggingSplit(false)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      persistSplit(atlasSplitRef.current) // 拖完才落盘，避免拖动过程高频写 localStorage
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  /** 🔴 改动 2026-10-11 · window splitter 无障碍：方向键步进 5% 推拉边界 */
  const onSplitKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, path: number[]) => {
    const prev = atlasSplitRef.current
    if (!prev) return
    const group = nodeAt(prev.root, path)
    if (!group || group.kind !== 'group') return
    const step = (d: number) => {
      e.preventDefault()
      commitSplit({ ...prev, root: setNodeAt(prev.root, path, { ...group, ratio: clampSplitRatio(group.ratio + d) }) })
    }
    if (group.direction === 'vertical' && e.key === 'ArrowLeft') step(-0.05)
    if (group.direction === 'vertical' && e.key === 'ArrowRight') step(0.05)
    if (group.direction === 'horizontal' && e.key === 'ArrowUp') step(-0.05)
    if (group.direction === 'horizontal' && e.key === 'ArrowDown') step(0.05)
  }

  /**
   * 🔴 改动 2026-10-13 · 拖放落点 → 画板世界坐标（经引擎 clientToWorld 换算，含 pan/zoom）。
   * 放置组件自此与画板卡片同一坐标系：随画布平移/缩放；「屏幕钉」钉住后除外。
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const nodeId = e.dataTransfer.getData(DND_MIME)
    const wgt = WIDGETS.concat(CHARTS).find((w) => w.nodeId === nodeId)
    const board = boardRef.current
    if (!wgt || !board) return
    const rect = board.getBoundingClientRect()
    // 超大图表初始等比缩小到可视区 60% 以内，之后由画板缩放统一管理
    const scale = Math.min(1, (rect.width * 0.6) / wgt.w, (rect.height * 0.6) / wgt.h)
    const engine = getBoardEngine()
    const w = engine?.clientToWorld(e.clientX, e.clientY) ?? { x: e.clientX - rect.left, y: e.clientY - rect.top }
    keyRef.current += 1
    setPlaced((list) => [
      ...list,
      {
        key: keyRef.current,
        wgt,
        wx: w.x - (wgt.w * scale) / 2,
        wy: w.y - (wgt.h * scale) / 2,
        scale,
      },
    ])
    // 🔴 改动 2026-10-11 · 拆分视图期间拖入任何卡片（含组件缩略图）→ 固定保持拆分状态
    // 🔴 改动 2026-10-15 · 独占全屏（solo）视图同样要落盘固定
    if (splitOpen || soloTab !== null) persistSplit(atlasSplitRef.current)
  }

  /** 🔴 改动 2026-10-13 · 递归渲染拆分树：
   *  叶子 = 画板窗格（钉住的子画板不在此渲染，改浮动窗口；收起的叶子 flex 0 隐藏）；
   *  分组 = 方向 + 比例 + 分隔线（可拖拽 / 方向键 / 右键菜单） */
  const renderPane = (node: SplitNode, path: number[]): React.ReactNode => {
    if (node.kind === 'board') {
      if (node.tab >= 0 && splitPinned[node.tab]) return null
      return (
        <div
          className="relative flex min-h-0 min-w-0 overflow-hidden"
          style={{ flex: node.collapsed ? '0 0 0px' : '1 1 0px' }}
          // 🔴 改动 2026-10-16 · 窗格身份标记：Tab 撕离钉住时按落点命中父画板（elementsFromPoint 查这个属性）
          data-pane-tab={node.tab}
        >
          {node.tab === -1 ? (
            <BoardCanvas
              key={`main-${path.join('.')}`}
              dark={dark}
              isMainBoard
              onDocChange={(d) => setMainTitle(d.title)}
              onEngine={(e) => {
                primaryEngineRef.current = e
                if (e) setMainTitle(e.getDoc().title)
              }}
              onBoardSplit={() => performBoardSplit(path)}
              onCollapseBoard={() => performCollapse(path)}
              onDeleteBoard={() => setDeleteTarget({ kind: 'main' })}
              onChainActivated={(sub) => handleChainActivated(sub, 'main')}
            />
          ) : (
            <BoardCanvas
              key={`pane-${path.join('.')}-${node.tab}-${boardStampsRef.current[node.tab] ?? 0}`}
              dark={dark}
              doc={splitBoards[node.tab]}
              primary={false}
              onPersist={(d) => {
                const prev = atlasSplitRef.current
                if (!prev) return
                commitSplit({ ...prev, boards: prev.boards.map((b) => (b === d ? d : b)) })
              }}
              onBoardSplit={() => performBoardSplit(path)}
              onCollapseBoard={() => performCollapse(path)}
              onBecomeMain={() => performBecomeMain(node.tab)}
              onDeleteBoard={() => setDeleteTarget({ kind: 'tab', index: node.tab })}
              onChainActivated={(sub) => handleChainActivated(sub, splitBoards[node.tab]?.tid)}
            />
          )}
        </div>
      )
    }
    const vertical = node.direction === 'vertical'
    // 🔴 改动 2026-10-14 · 一侧整棵收起时，另一侧自动铺满空白；分隔线仅两侧都可见时显示
    const firstCollapsed = collectLeaves(node.first).every((l) => l.collapsed)
    const secondCollapsed = collectLeaves(node.second).every((l) => l.collapsed)
    const firstFlex = firstCollapsed ? '0 0 0px' : secondCollapsed ? '1 1 0px' : `0 0 ${node.ratio * 100}%`
    const secondFlex = secondCollapsed ? '0 0 0px' : '1 1 0px'
    const showDivider = !firstCollapsed && !secondCollapsed
    return (
      <div className={cn('flex min-h-0 min-w-0', vertical ? 'flex-row' : 'flex-col')} style={{ flex: '1 1 0px' }}>
        <div className={cn('flex min-h-0 min-w-0', vertical ? 'flex-row' : 'flex-col')} style={{ flex: firstFlex }}>
          {renderPane(node.first, [...path, 0])}
        </div>
        {showDivider && (
          <div
            role="separator"
            aria-orientation={vertical ? 'vertical' : 'horizontal'}
            aria-label="拖拽调整画板边界"
            tabIndex={0}
            data-split-divider
            data-dragging={draggingSplit}
            onPointerDown={(e) => onSplitPointerDown(e, path)}
            onKeyDown={(e) => onSplitKeyDown(e, path)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDividerMenu({ x: e.clientX, y: e.clientY, path })
            }}
            className={cn(
              'sr-split-divider focus-visible:outline-2 focus-visible:outline-sky-400',
              vertical ? 'w-2' : 'h-2',
              !vertical && 'is-horizontal',
              dark && 'is-dark',
            )}
          />
        )}
        <div className={cn('flex min-h-0 min-w-0', vertical ? 'flex-row' : 'flex-col')} style={{ flex: secondFlex }}>
          {renderPane(node.second, [...path, 1])}
        </div>
      </div>
    )
  }

  // 🔴 改动 2026-10-13 · 拆出窗口模式（?boardwin=<detachId>）：只渲染被拆出的那一块画板，
  // 文档与主窗口同一份（persistDetached 回写共享拆分状态，主窗口经 storage 事件跟随）。
  // 挂回/删除后本窗口显示提示页。注意必须在全部 Hook 之后分支（Hook 顺序不可变）。
  if (boardWinId) {
    return (
      <div className="relative min-h-[calc(100svh-68px)] font-sans">
        <div className="absolute inset-0 z-0">
          {detDoc ? (
            <BoardCanvas key={`det-${detStamp}`} dark={dark} doc={detDoc} primary={false} onPersist={persistDetached} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className={cn('text-[13px] leading-5', dark ? 'text-sr-d-gray-4' : 'text-sr-l-gray-4')}>
                该画板已挂回主窗口（或已删除），本窗口可直接关闭
              </p>
            </div>
          )}
        </div>
        <div
          className={cn(
            'pointer-events-none absolute left-3 top-2 z-10 rounded-full border px-3 py-1 text-[11px] font-medium leading-4 backdrop-blur',
            dark ? 'border-white/10 bg-sr-d-gray-9/80 text-sr-d-gray-3' : 'border-black/10 bg-white/80 text-sr-l-gray-8',
          )}
        >
          ⇗ {detDoc?.title || '画板'} · 拆出窗口（与主窗口同一画板，改动实时同步）
        </div>
      </div>
    )
  }

  return (
    <div
      ref={boardRef}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DND_MIME)) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={handleDrop}
      // 🔴 改动 2026-10-12 · 点在已放置组件之外 = 取消组件选中（组件自身按下先选中，冒泡到此后 closest 命中不取消）
      // 🔴 改动 2026-10-13 · 点在「屏幕钉」菜单之外 = 关闭菜单
      onPointerDown={(e) => {
        const t = e.target as HTMLElement
        if (!t.closest('[data-placed-widget]')) selectPlaced(null)
        if (!t.closest('[data-pin-menu]')) setPinMenu(null)
      }}
      className={cn(
        'relative min-h-[calc(100svh-68px)] font-sans',
        // 🔴 改动 2026-10-12 · 拖拽分隔线期间整页统一 UE5 风格缩放光标（指针移出 8px 热区也不跳回箭头）
        draggingSplit && (dragDirRef.current === 'vertical' ? 'sr-split-drag-ew' : 'sr-split-drag-ns'),
      )}
    >
      {/* 🔴 改动 2026-10-13 · 顶部 Tab 坞：主画板标签 + 拆分 Tab（技能激活的子画板带「钉」点）。
           主画板可删除（安全弹窗），删除后右侧第一个画板自动成为主画板并全展开 */}
      <div
        ref={dockBarRef}
        aria-label="画板 Tab 坞"
        onContextMenu={(e) => {
          // 空白处右键（标签自身已 stopPropagation）
          e.preventDefault()
          setTabMenu({ x: e.clientX, y: e.clientY, target: { kind: 'dock' } })
        }}
        className={cn(
          'relative z-20 flex h-9 shrink-0 items-end gap-1 border-b px-3',
          dark ? 'border-white/5 bg-sr-d-gray-10' : 'border-black/5 bg-sr-l-gray-0',
          // 🔴 改动 2026-10-15 · 画中画拖回坞的落点高亮（整栏亮边提示「松手回到这里」）
          pinDragOverDock && (dark ? 'bg-sr-d-gray-8 shadow-[inset_0_-2px_0_0_#4da3ff]' : 'bg-sr-l-gray-1 shadow-[inset_0_-2px_0_0_#1f7aec]'),
        )}
      >
        <SplitDockTab
          dark={dark}
          active={!mapOpen && !splitOpen && soloTab === null}
          label={mainTitle || '画板'}
          editing={editingTab === 'main'}
          onClick={() => {
            // 🔴 改动 2026-10-14 · 主标签点击：先退出地图视图，再复位主画板收起态 + 收起拆分视图
            setMapOpen(false)
            setSoloTab(null)
            const prev = atlasSplitRef.current
            if (prev) {
              const restore = (node: SplitNode): SplitNode =>
                node.kind === 'board'
                  ? node.tab === -1 ? { ...node, collapsed: false } : node
                  : { ...node, first: restore(node.first), second: restore(node.second) }
              commitSplit({ ...prev, root: restore(prev.root) })
            }
            setSplitOpen(false)
          }}
          onStartEdit={() => startTabEdit('main')}
          onCommitEdit={(name) => commitTabName('main', name)}
          onCancelEdit={cancelTabEdit}
          onOpenMenu={(x, y) => setTabMenu({ x, y, target: { kind: 'main' } })}
        />
        {/* 🔴 改动 2026-10-14 · 「地图」内置常驻 Tab（主画板之后、拆分 Tab 之前）：
            不可重命名/删除/撕离拖出、不进拆分树、不写 localStorage；外观完全复用 SplitDockTab */}
        <SplitDockTab
          dark={dark}
          active={mapOpen}
          label="地图"
          editing={false}
          noEdit
          onClick={() => setMapOpen(true)}
          onStartEdit={() => {}}
          onCommitEdit={() => {}}
          onCancelEdit={() => {}}
          onOpenMenu={(x, y) => setTabMenu({ x, y, target: { kind: 'map' } })}
        />
        {/* 🔴 改动 2026-10-15 · 属于其它画板的子画板（isSubBoard：技能激活/抽取）不在坞里显示标签，
            只以屏幕钉浮动窗口存在；删除走浮动窗口 X（确认弹窗）或全屏时的画板右键「删除画板」 */}
        {splitBoards.map((b, i) =>
          b.isSubBoard ? null : (
          <SplitDockTab
            // 🔴 改动 2026-10-15 · tid 稳定 key：拖动换位时组件实例随标签移动，指针捕获不断（Chrome 式实时换位的前提）
            key={b.tid ?? `${i}-${b.title}`}
            btnRef={(el) => {
              if (el) dockTabRefs.current.set(i, el)
              else dockTabRefs.current.delete(i)
            }}
            dark={dark}
            active={!mapOpen && (splitOpen ? i === atlasSplit?.activeSplit : soloTab === i)}
            label={b.title || `Tab${i + 1}`}
            pinned={splitPinned[i] === true}
            detached={!!b.detachId}
            editing={editingTab === i}
            onClick={() => handleSelectTab(i)}
            onStartEdit={() => startTabEdit(i)}
            onCommitEdit={(name) => commitTabName(i, name)}
            onCancelEdit={cancelTabEdit}
            onOpenMenu={(x, y) => setTabMenu({ x, y, target: { kind: 'tab', index: i } })}
            onTearDrag={handleTearDrag(i, b.title || `Tab${i + 1}`)}
          />
          ),
        )}
      </div>

      {/* 🔴 改动 2026-10-13 · Tab 右键菜单：重命名 / 成为主画板 / 新建 Tab / 删除（主画板删除走安全弹窗） */}
      {tabMenu && (
        <div
          role="menu"
          aria-label="Tab 操作菜单"
          className={cn(
            'fixed z-50 min-w-[128px] rounded-lg border p-1 shadow-xl',
            dark ? 'border-white/10 bg-sr-d-gray-8 text-sr-d-gray-1' : 'border-black/10 bg-white text-sr-l-gray-11',
          )}
          style={{ left: Math.min(tabMenu.x, window.innerWidth - 146), top: tabMenu.y }}
        >
          {tabMenu.target.kind !== 'dock' && tabMenu.target.kind !== 'map' && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const t = tabMenu.target
                if (t.kind === 'dock' || t.kind === 'map') return
                startTabEdit(t.kind === 'main' ? 'main' : t.index)
              }}
              className={cn(
                'block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4',
                dark ? 'hover:bg-white/10' : 'hover:bg-black/5',
              )}
            >
              重命名
            </button>
          )}
          {tabMenu.target.kind === 'tab' && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const index = tabMenu.target.kind === 'tab' ? tabMenu.target.index : -1
                setTabMenu(null)
                performBecomeMain(index)
              }}
              className={cn(
                'block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4',
                dark ? 'hover:bg-white/10' : 'hover:bg-black/5',
              )}
            >
              成为主画板
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setTabMenu(null)
              // 🔴 改动 2026-10-14 · 地图 Tab 右键「新建 Tab」：退出地图视图，显示新建的拆分画板
              setMapOpen(false)
              // 🔴 改动 2026-10-15 · Tab 坞空白处右键：全新空白画板追加到坞最右侧（第 3 位起）并独占全屏，
              // 不动主画板；标签 / 地图上的「新建 Tab」维持原行为（追加同屏拆分画板）
              if (tabMenu.target.kind === 'dock') {
                createBlankMainBoard()
                return
              }
              appendBlankTab(atlasSplitRef.current?.root.kind === 'group' ? atlasSplitRef.current.root.direction : 'vertical')
            }}
            className={cn(
              'block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4',
              dark ? 'hover:bg-white/10' : 'hover:bg-black/5',
            )}
          >
            {tabMenu.target.kind === 'dock' ? '新建画板' : '新建 Tab'}
          </button>
          {tabMenu.target.kind !== 'dock' && tabMenu.target.kind !== 'map' && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const t = tabMenu.target
                setTabMenu(null)
                if (t.kind === 'main') setDeleteTarget({ kind: 'main' })
                else if (t.kind === 'tab') setDeleteTarget({ kind: 'tab', index: t.index })
              }}
              className={cn(
                'block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4 text-sr-brand-interact-red',
                dark ? 'hover:bg-white/10' : 'hover:bg-black/5',
              )}
            >
              {tabMenu.target.kind === 'main' ? '删除画板' : '删除 Tab'}
            </button>
          )}
        </div>
      )}

      {/* 🔴 改动 2026-10-10 · 无限画板铺为页面最底层（z-0）
          🔴 改动 2026-10-13 · 拆分视图 v3：树形拆分（可继续拆分/覆盖收起）；画板区恒定下移 36px 让位；
          画板区空白左键框选同时判定悬浮子画板命中（矩形重叠即选中） */}
      <div ref={boardAreaRef} onPointerDown={onBoardAreaPointerDown} className="absolute inset-x-0 bottom-0 top-9 z-0">
        {mapOpen ? (
          // 🔴 改动 2026-10-14 · 「地图」满画板视图：最高优先级分支，画板区整块显示地图
          // （父容器是定位容器且已有确定高度，absolute inset-0 + sr-map 100%x100% 即铺满；
          //   不加遮罩 / pointer-events:none，地图滚轮缩放/拖拽平移/标记悬停/点击按级别缩放完全可用）
          <div className="absolute inset-0" data-atlas-map-tab>
            <AtlasMap dark={dark} />
          </div>
        ) : splitOpen && atlasSplit ? (
          <div className="flex h-full w-full">
            {renderPane(splitRoot, [])}
          </div>
        ) : soloTab !== null && splitBoards[soloTab] ? (
          // 🔴 改动 2026-10-15 · 独占全屏 Tab：整板区只渲染该 Tab 的画板（不同屏拆分；
          // 右键菜单支持拆自己 / 成为主画板 / 删除，「收起」在独占视图无意义故隐藏）
          <div className="relative flex h-full w-full">
            <BoardCanvas
              key={`solo-${soloTab}-${boardStampsRef.current[soloTab] ?? 0}`}
              dark={dark}
              doc={splitBoards[soloTab]}
              // 🔴 改动 2026-10-15 · 独占视图注册为 bridge 主实例：侧边栏「加入画板」落到当前可见的独占画板
              // （不传 onEngine，primaryEngineRef 仍归主画板引擎，成为主画板 / 新建画板等主文档操作不受影响）
              onPersist={(d) => {
                const prev = atlasSplitRef.current
                if (!prev) return
                commitSplit({ ...prev, boards: prev.boards.map((b) => (b === d ? d : b)) })
              }}
              onBoardSplit={() => performBoardSplit(collectLeaves(splitRoot).find((l) => l.tab === soloTab)?.path ?? [])}
              onBecomeMain={() => performBecomeMain(soloTab)}
              onDeleteBoard={() => setDeleteTarget({ kind: 'tab', index: soloTab })}
              onChainActivated={(sub) => handleChainActivated(sub, splitBoards[soloTab]?.tid)}
            />
          </div>
        ) : (
          <BoardCanvas
            key="single"
            dark={dark}
            isMainBoard
            onDocChange={(d) => setMainTitle(d.title)}
            onEngine={(e) => {
              primaryEngineRef.current = e
              if (e) setMainTitle(e.getDoc().title)
            }}
            onBoardSplit={() => performBoardSplit([])}
            onCollapseBoard={() => performCollapse([])}
            onDeleteBoard={() => setDeleteTarget({ kind: 'main' })}
            onChainActivated={(sub) => handleChainActivated(sub, 'main')}
          />
        )}

        {/* 🔴 改动 2026-10-13 · 屏幕钉子画板：画中画浮动窗口（每 Tab 一个，可多个并存；
            技能激活默认钉 / Tab 拖到画板上即钉）。
            框选重叠或左键点击 → 选中（蓝色四边分隔线）→ 左键拖头部/分隔线移动；右键任意部位直接拖动
            🔴 改动 2026-10-15 · 不再绑定拆分视图：全屏/独占视图下钉出的浮动窗口同样悬浮（原逻辑只在拆分视图渲染，
            配合 pinTabAt/handleChainActivated 不强制打开拆分视图的修改） */}
        {!mapOpen &&
          atlasSplit &&
          splitBoards.map((b, i) =>
            // 🔴 改动 2026-10-16 · 兜底：当前独占全屏（solo）的画板不再渲染浮动窗口——
            // 同一文档只允许一个引擎挂载（pinTabAt 已源头阻断，此处防跨窗口同步等残余路径）
            // 🔴 改动 2026-10-16 · 父画板归属过滤：浮动窗口只属于落点所在画板（pinParent），
            // 父画板当前不可见（在别的 Tab / 主画板）时不渲染——每个 Tab 是独立画板
            splitPinned[i] !== true || soloTab === i || !pinnedWindowVisible(i) ? null : (
              <PinnedBoardWindow
                key={`pin-${i}`}
                dark={dark}
                title={b.title || `Tab${i + 1}`}
                doc={b}
                selected={pinnedSelected === i}
                pos={pinPosMap[i] ?? { x: 24 + i * 28, y: 48 + i * 28 }}
                winRef={(el) => {
                  if (el) pinWinRefs.current.set(i, el)
                  else pinWinRefs.current.delete(i)
                }}
                onSelect={() => setPinnedSelected(i)}
                onMove={(dx, dy) => movePinned(i, dx, dy)}
                closeLabel={b.isSubBoard ? `删除 ${b.title || `Tab${i + 1}`}` : undefined}
                // 🔴 改动 2026-10-15 · 拖回 Tab 坞：悬停时坞栏亮边提示，松手取消屏幕钉并独占全屏显示
                onDragMove={(x, y) => setPinDragOverDock(pointerOverDock(x, y))}
                onDragEnd={(x, y) => {
                  setPinDragOverDock(false)
                  // 拖回坞：取消屏幕钉 + 叶子复位，并独占全屏显示该画板（forceSolo 覆盖拆分视图态）
                  if (pointerOverDock(x, y)) {
                    handleSelectTab(i, true)
                    return
                  }
                  // 🔴 改动 2026-10-16 · 正常拖动结束：浮动窗口最终位置落盘（刷新后保持）
                  persistPinPos()
                }}
                onPersist={(d) => {
                  const prev = atlasSplitRef.current
                  if (!prev) return
                  commitSplit({ ...prev, boards: prev.boards.map((x) => (x === d ? d : x)) })
                }}
                onCollapse={() => {
                  // 🔴 改动 2026-10-15 · 子画板的浮动窗口不在坞里显示标签：「收起」会让它永久不可见，
                  // 因此子画板 X = 删除（确认弹窗）；普通拆分 Tab 的 X 维持收起语义（点 Tab 可复位）
                  if (b.isSubBoard) {
                    setDeleteTarget({ kind: 'tab', index: i })
                    return
                  }
                  const prev = atlasSplitRef.current
                  if (!prev) return
                  setPinnedSelected((sel) => (sel === i ? null : sel))
                  const mark = (node: SplitNode): SplitNode =>
                    node.kind === 'board'
                      ? node.tab === i
                        ? { ...node, collapsed: true }
                        : node
                      : { ...node, first: mark(node.first), second: mark(node.second) }
                  commitSplit({ ...prev, root: mark(prev.root), pinned: prev.pinned.map((p, j) => (j === i ? false : p)) })
                }}
              />
            ),
          )}

        {/* 🔴 改动 2026-10-13 · 分隔线右键菜单：拆分（两块同时 → 4 块）/ 向两侧覆盖 */}
        {dividerMenu && (() => {
          const node = nodeAt(splitRoot, dividerMenu.path)
          const vertical = node?.kind === 'group' && node.direction === 'vertical'
          return (
            <div
              role="menu"
              aria-label="分隔线操作菜单"
              className={cn(
                'fixed z-50 min-w-[128px] rounded-lg border p-1 shadow-xl',
                dark ? 'border-white/10 bg-sr-d-gray-8 text-sr-d-gray-1' : 'border-black/10 bg-white text-sr-l-gray-11',
              )}
              style={{ left: Math.min(dividerMenu.x, window.innerWidth - 146), top: dividerMenu.y }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDividerMenu(null)
                  performDividerSplit(dividerMenu.path)
                }}
                className={cn('block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4', dark ? 'hover:bg-white/10' : 'hover:bg-black/5')}
              >
                拆分（两块同时）
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDividerMenu(null)
                  performCover(dividerMenu.path, false)
                }}
                className={cn('block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4', dark ? 'hover:bg-white/10' : 'hover:bg-black/5')}
              >
                {vertical ? '向左覆盖' : '向上覆盖'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDividerMenu(null)
                  performCover(dividerMenu.path, true)
                }}
                className={cn('block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4', dark ? 'hover:bg-white/10' : 'hover:bg-black/5')}
              >
                {vertical ? '向右覆盖' : '向下覆盖'}
              </button>
            </div>
          )
        })()}

        {/* 🔴 改动 2026-10-13 · 从 charts 列表拖出放置到画板的组件实例：画板世界坐标渲染（随画布平移/缩放），
            右键「屏幕钉」钉住后不随画布移动；挂在画板区内（与主画板引擎根同原点），定位经 placedLayout 按视口实时换算 */}
        {!mapOpen && placed.map((item) => {
          const layout = placedLayout(item)
          return (
            <PlacedWidget
              key={item.key}
              item={item}
              dark={dark}
              selected={placedSelKey === item.key}
              left={layout.left}
              top={layout.top}
              effScale={layout.effScale}
              onSelect={selectPlaced}
              onMove={movePlaced}
              onRemove={removePlaced}
              onPinMenu={openPinMenu}
            />
          )
        })}

        {/* 🔴 改动 2026-10-13 · 「屏幕钉」右键菜单：仅一个切换项（钉住/取消），点击他处关闭；
            不在组件上叠加任何钉态提示或状态图标 */}
        {!mapOpen && pinMenu && (
          <div
            role="menu"
            aria-label="画板组件菜单"
            data-pin-menu
            className={cn(
              'absolute z-50 min-w-28 rounded-lg border p-1 shadow-xl backdrop-blur',
              dark ? 'border-white/10 bg-sr-d-gray-9/95' : 'border-black/10 bg-white/95',
            )}
            style={{ left: pinMenu.x, top: pinMenu.y }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => togglePinPlaced(pinMenu.key)}
              className={cn(
                'block w-full rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-4',
                dark ? 'text-sr-d-gray-1 hover:bg-white/10' : 'text-sr-l-gray-9 hover:bg-black/5',
              )}
            >
              {placed.find((it) => it.key === pinMenu.key)?.pinned ? '取消屏幕钉' : '屏幕钉'}
            </button>
          </div>
        )}
      </div>

      {/* 🔴 改动 2026-10-13 · 删除弹窗：普通画板确认 / 主画板安全确认（用户名 + 密码） */}
      {deleteTarget && deleteTarget.kind === 'tab' && (
        <ConfirmModal
          dark={dark}
          title="删除画板"
          message={`确定删除画板「${splitBoards[deleteTarget.index]?.title || `Tab${deleteTarget.index + 1}`}」？此操作不可恢复。`}
          onConfirm={() => {
            performDeleteTab(deleteTarget.index)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {deleteTarget && deleteTarget.kind === 'main' && (
        <SecurityModal
          dark={dark}
          username="演示用户"
          onConfirm={() => {
            performDeleteMain()
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* 🔴 改动 2026-10-11 · 页面正中的地球层已撤下：3D 地球改为图表列表 Widget，从浮窗拖出放置到画板 */}

      {/* 🔴 改动 2026-10-12 · 版图底部 HUD：道具栏（上，12 空槽）+ 技能栏（下，固定 12 槽，
          先放置 支出/尝试/运转）；栏宽 1152px = 96×12，随视口等比缩放（tokens.css --sr-hud-*） */}
      {/* 🔴 改动 2026-10-14 · 地图视图下不渲染底部 HUD，避免悬浮层压在地图上抢指针事件 */}
      {!mapOpen && <HudBars dark={dark} />}

      {/* 组件 + 图表 浮窗（顶部按钮触发） */}
      {chartsOpen && (
        <ChartsFloatPanel dark={dark} onPreview={setPreview} onClose={() => setChartsOpen(false)} />
      )}

      {/* 🔴 改动 2026-10-13 · Tab 撕离拖拽幽灵片：跟随光标提示落点行为（Chrome 式拖出反馈） */}
      {tabDrag && (
        <div
          className={cn(
            'pointer-events-none fixed z-[90] rounded-lg border px-3 py-1.5 text-[12px] font-medium leading-4 shadow-xl backdrop-blur',
            dark ? 'border-white/15 bg-sr-d-gray-9/95 text-sr-d-gray-1' : 'border-black/10 bg-white/95 text-sr-l-gray-11',
          )}
          style={{ left: tabDrag.x + 14, top: tabDrag.y + 16 }}
        >
          {tabDrag.label}
          <span className={cn('ml-2', dark ? 'text-sr-d-gray-4' : 'text-sr-l-gray-4')}>
            {tabDrag.zone === 'outside' ? '松手拆出为新窗口' : tabDrag.zone === 'board' ? '松手画中画钉到此处' : '坞内换位中 · 拖到画板 = 画中画 · 拖出窗口 = 新窗口'}
          </span>
        </div>
      )}

      {/* 点击缩略图的大图预览 */}
      {preview && <PreviewModal wgt={preview} dark={dark} onClose={() => setPreview(null)} />}
    </div>
  )
}
