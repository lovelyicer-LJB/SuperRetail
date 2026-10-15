import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ==========================================================================
   WidgetArena —— 版图工作区通用组件容器能力
   --------------------------------------------------------------------------
   当前能力:
   - 八向隐形热区改尺寸: 仅拖拽方向移动, 对边固定不动
   - 卡片内部按住拖动整体位置（限制在画布内）
   - 边缘/角落靠近时描边渐变高亮:
       · 边: 沿边的直线渐变（两端透明, 中间海绿）
       · 角: 以卡片圆角为中心的弧线高亮, 向相邻两边渐隐, 弧线半径 = 卡片圆角
   - 指针切换为对应方向双箭头; 拖动位置为抓手
   - 实时 W × H 数值（跟随卡片）
   - 双击恢复默认尺寸并居中
   - onGeometryChange 回调: 上报位置与尺寸（供持久化/布局编排使用）

   规划中的扩展（补充完善时在此迭代）:
   - 位置/尺寸持久化（接入 atlas.save_dashboard 命令）
   - 多组件画布: 对齐参考线、吸附网格、碰撞提示
   - 键盘微调（方向键移 1px, Shift 10px）与无障碍 aria-valuenow
   - 高亮色/圆角/热区厚度等外观参数主题化
   ========================================================================== */

export interface WidgetGeometry {
  x: number
  y: number
  w: number
  h: number
}

interface WidgetArenaProps {
  /** 初始宽度（px） */
  defaultWidth: number
  /** 初始高度（px） */
  defaultHeight: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  /** 画布高度（px） */
  arenaHeight?: number
  /** 卡片圆角（px）, 角落高亮弧线与之保持一致 */
  radius?: number
  /** 高亮主色 */
  accentColor?: string
  dark?: boolean
  /** 拖拽结束时上报几何信息 */
  onGeometryChange?: (g: WidgetGeometry) => void
  children: ReactNode
}

/** 拖拽方向: x/y = -1 左/上, 1 右/下, 0 该轴不变 */
type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1; cursor: string; name: string }

const DIRS: Dir[] = [
  { x: 0, y: -1, cursor: 'n-resize', name: 'n' },
  { x: 0, y: 1, cursor: 's-resize', name: 's' },
  { x: -1, y: 0, cursor: 'w-resize', name: 'w' },
  { x: 1, y: 0, cursor: 'e-resize', name: 'e' },
  { x: -1, y: -1, cursor: 'nw-resize', name: 'nw' },
  { x: 1, y: -1, cursor: 'ne-resize', name: 'ne' },
  { x: -1, y: 1, cursor: 'sw-resize', name: 'sw' },
  { x: 1, y: 1, cursor: 'se-resize', name: 'se' },
]

type EdgeName = 'n' | 's' | 'e' | 'w'
type CornerName = 'nw' | 'ne' | 'sw' | 'se'

const clamp = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v)))

const isEdge = (name: string): name is EdgeName => ['n', 's', 'e', 'w'].includes(name)
const isCorner = (name: string): name is CornerName => ['nw', 'ne', 'sw', 'se'].includes(name)

/** 角落高亮弧线沿边延伸长度（px） */
const CORNER_ARM = 44

/** 边: 直线渐变高亮样式工厂 */
function edgeStyle(edge: EdgeName, radius: number, color: string): React.CSSProperties {
  const glow = `0 0 8px ${color}73` // 45% alpha
  const fadeH = `linear-gradient(90deg, transparent, ${color}, transparent)`
  const fadeV = `linear-gradient(180deg, transparent, ${color}, transparent)`
  switch (edge) {
    case 'n':
      return { top: 0, left: radius, right: radius, height: 2, background: fadeH, boxShadow: glow, borderRadius: 2 }
    case 's':
      return { bottom: 0, left: radius, right: radius, height: 2, background: fadeH, boxShadow: glow, borderRadius: 2 }
    case 'w':
      return { left: 0, top: radius, bottom: radius, width: 2, background: fadeV, boxShadow: glow, borderRadius: 2 }
    case 'e':
      return { right: 0, top: radius, bottom: radius, width: 2, background: fadeV, boxShadow: glow, borderRadius: 2 }
  }
}

/**
 * 角落高亮: 以卡片圆角为中心的弧线, 向两条邻边渐变淡出
 * 基础形状为西北角, 其余三角通过旋转获得
 */
function CornerGlow({
  corner,
  visible,
  radius,
  color,
}: {
  corner: CornerName
  visible: boolean
  radius: number
  color: string
}) {
  const arm = CORNER_ARM
  const vb = arm + 4
  const rot = { nw: 0, ne: 90, se: 180, sw: 270 }[corner]
  const pos: React.CSSProperties = {
    nw: { top: -1, left: -1 },
    ne: { top: -1, right: -1 },
    se: { bottom: -1, right: -1 },
    sw: { bottom: -1, left: -1 },
  }[corner]
  const gidH = `cg-h-${corner}`
  const gidV = `cg-v-${corner}`
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute z-10 transition-opacity duration-200"
      style={{ ...pos, opacity: visible ? 1 : 0, transform: `rotate(${rot}deg)` }}
      width={vb}
      height={vb}
      viewBox={`0 0 ${vb} ${vb}`}
      fill="none"
    >
      <defs>
        <linearGradient id={gidH} gradientUnits="userSpaceOnUse" x1={arm + 2} y1={1} x2={radius + 2} y2={1}>
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <linearGradient id={gidV} gradientUnits="userSpaceOnUse" x1={1} y1={radius + 2} x2={1} y2={arm + 2}>
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 水平臂: 从边内向圆角渐亮 */}
      <path d={`M${arm + 2} 1 L${radius + 2} 1`} stroke={`url(#${gidH})`} strokeWidth={2} strokeLinecap="round" />
      {/* 圆角弧: 半径与卡片圆角一致 */}
      <path
        d={`M${radius + 2} 1 A ${radius} ${radius} 0 0 0 1 ${radius + 2}`}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* 垂直臂: 从圆角向边内渐隐 */}
      <path d={`M1 ${radius + 2} L1 ${arm + 2}`} stroke={`url(#${gidV})`} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

export function WidgetArena({
  defaultWidth,
  defaultHeight,
  minWidth = 140,
  minHeight = 160,
  maxWidth = 720,
  maxHeight = 600,
  arenaHeight = 480,
  radius = 12,
  accentColor = '#3be5b8',
  dark = true,
  onGeometryChange,
  children,
}: WidgetArenaProps) {
  const arenaRef = useRef<HTMLDivElement>(null)
  const [arena, setArena] = useState({ w: 0, h: arenaHeight })
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight })
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const drag = useRef({ px: 0, py: 0, w: 0, h: 0, x: 0, y: 0 })

  /** 画布尺寸测量 */
  useLayoutEffect(() => {
    const el = arenaRef.current
    if (!el) return
    const measure = () => setArena({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** 初始/未拖动时居中（派生值, 无需 effect） */
  const effPos = useMemo(
    () =>
      pos ??
      (arena.w > 0
        ? { x: Math.max(0, (arena.w - size.w) / 2), y: Math.max(0, (arena.h - size.h) / 2) }
        : null),
    [pos, arena, size.w, size.h],
  )

  const clampPos = useCallback(
    (x: number, y: number, w: number, h: number) => ({
      x: clamp(x, 0, Math.max(0, arena.w - w)),
      y: clamp(y, 0, Math.max(0, arena.h - h)),
    }),
    [arena],
  )

  const report = useCallback(
    (g: WidgetGeometry) => onGeometryChange?.(g),
    [onGeometryChange],
  )

  /** 八向改尺寸: 仅拖拽方向移动, 对边固定 */
  const onResizeStart = useCallback(
    (dir: Dir) => (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!effPos) return
      drag.current = { px: e.clientX, py: e.clientY, w: size.w, h: size.h, x: effPos.x, y: effPos.y }
      setActive(dir.name)
      const maxW = Math.min(maxWidth, arena.w || maxWidth)
      const maxH = Math.min(maxHeight, arena.h || maxHeight)
      let last = { x: drag.current.x, y: drag.current.y, w: drag.current.w, h: drag.current.h }
      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - drag.current.px
        const dy = ev.clientY - drag.current.py
        let { w, h, x, y } = drag.current
        if (dir.x === 1) w = clamp(drag.current.w + dx, minWidth, maxW)
        if (dir.x === -1) {
          w = clamp(drag.current.w - dx, minWidth, maxW)
          x = drag.current.x + (drag.current.w - w) // 左边跟随指针, 右边固定
        }
        if (dir.y === 1) h = clamp(drag.current.h + dy, minHeight, maxH)
        if (dir.y === -1) {
          h = clamp(drag.current.h - dy, minHeight, maxH)
          y = drag.current.y + (drag.current.h - h) // 上边跟随指针, 下边固定
        }
        setSize({ w, h })
        setPos(clampPos(x, y, w, h))
        last = { ...clampPos(x, y, w, h), w, h }
      }
      const onUp = () => {
        setActive(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        report(last)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [size, effPos, arena, clampPos, report, minWidth, minHeight, maxWidth, maxHeight],
  )

  /** 卡片内部拖动整体移动 */
  const onMoveStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!effPos) return
      e.preventDefault()
      drag.current = { px: e.clientX, py: e.clientY, w: size.w, h: size.h, x: effPos.x, y: effPos.y }
      setActive('move')
      let last = { x: drag.current.x, y: drag.current.y, w: drag.current.w, h: drag.current.h }
      const onMove = (ev: PointerEvent) => {
        const next = clampPos(
          drag.current.x + (ev.clientX - drag.current.px),
          drag.current.y + (ev.clientY - drag.current.py),
          drag.current.w,
          drag.current.h,
        )
        setPos(next)
        last = { ...next, w: drag.current.w, h: drag.current.h }
      }
      const onUp = () => {
        setActive(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        report(last)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [effPos, size, clampPos, report],
  )

  /** 双击恢复默认尺寸并居中 */
  const reset = useCallback(() => {
    const w = defaultWidth
    const h = defaultHeight
    const p = { x: Math.max(0, (arena.w - w) / 2), y: Math.max(0, (arena.h - h) / 2) }
    setSize({ w, h })
    setPos(p)
    report({ ...p, w, h })
  }, [defaultWidth, defaultHeight, arena, report])

  const litEdges: EdgeName[] = active === 'move' ? ['n', 's', 'e', 'w'] : isEdge(active ?? '') ? [active as EdgeName] : []
  const litCorner: CornerName | null = active && isCorner(active) ? active : null

  return (
    <div ref={arenaRef} className="relative w-full" style={{ height: arenaHeight }}>
      <div
        className="absolute"
        style={{
          width: size.w,
          height: size.h,
          left: effPos?.x ?? 0,
          top: effPos?.y ?? 0,
          visibility: effPos ? 'visible' : 'hidden',
        }}
      >
        {/* 卡片本体: 内部区域可拖动 */}
        <div
          className={cn('h-full w-full', active === 'move' ? 'cursor-grabbing' : 'cursor-grab')}
          onPointerDown={onMoveStart}
          onDoubleClick={reset}
        >
          {children}
        </div>

        {/* 四边直线渐变高亮 */}
        {(['n', 's', 'e', 'w'] as EdgeName[]).map((edge) => (
          <div
            key={edge}
            aria-hidden
            className="pointer-events-none absolute z-10 transition-opacity duration-200"
            style={{ ...edgeStyle(edge, radius, accentColor), opacity: litEdges.includes(edge) ? 1 : 0 }}
          />
        ))}

        {/* 四角圆弧线渐变高亮 */}
        {(['nw', 'ne', 'sw', 'se'] as CornerName[]).map((corner) => (
          <CornerGlow
            key={corner}
            corner={corner}
            visible={active === 'move' || litCorner === corner}
            radius={radius}
            color={accentColor}
          />
        ))}

        {/* 八向隐形热区 */}
        {DIRS.map((d) => (
          <div
            key={d.name}
            role="separator"
            aria-label={`拖拽${d.name}方向调整尺寸`}
            onPointerDown={onResizeStart(d)}
            onDoubleClick={reset}
            onPointerEnter={() => setActive(d.name)}
            onPointerLeave={() => setActive((cur) => (cur === d.name ? null : cur))}
            className="absolute z-20"
            style={{
              cursor: d.cursor,
              ...(d.x === 0 && { left: radius + 4, right: radius + 4, height: 12 }),
              ...(d.y === 0 && { top: radius + 4, bottom: radius + 4, width: 12 }),
              ...(d.x !== 0 && d.y !== 0 && { width: radius + 8, height: radius + 8 }),
              ...(d.y === -1 ? { top: -6 } : d.y === 1 ? { bottom: -6 } : {}),
              ...(d.x === -1 ? { left: -6 } : d.x === 1 ? { right: -6 } : {}),
            }}
          />
        ))}

        {/* 实时宽高数值（跟随卡片） */}
        <span
          className={cn(
            'pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] leading-4 tabular-nums transition-colors',
            active ? 'text-[#3be5b8]' : dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4',
          )}
        >
          W {size.w} × H {size.h}
        </span>
      </div>
    </div>
  )
}
