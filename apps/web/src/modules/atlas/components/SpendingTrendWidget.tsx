import { useEffect, useMemo, useState } from 'react'

/**
 * SpendingTrendWidget —— 通用趋势图表卡片
 * 原型: Pixso「All Win Harmony SuperRetail Platform」Widgets & Indicator 页
 * Spending trend / M widget (节点 65:3732, 184×220, Dark Theme)
 *
 * 与 WidgetArena 组合即成「数据可配 + 交互自带」的完整通用单元:
 *   <WidgetArena defaultWidth={184} defaultHeight={220} radius={12}>
 *     <SpendingTrendWidget {...data} />
 *   </WidgetArena>
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-11 #000000, radius 12（由外层容器/本组件根节点体现）
 *  - 标题: Inter Regular 14/16, Gray-0 #FFFFFF
 *  - 数值: Inter SemiBold 20, Gray-0 #FFFFFF
 *  - 涨幅: Inter SemiBold 14, 正 #15FFAB / 负 #FD4438
 *  - 曲线: stroke #3BE5B8 2px + 6 层青色辉光 (65,255,195)
 *  - 端点: 实心点 #3BE5B8 + 脉冲外圈, 垂直时间线 Gray-8 #2D2D35
 *  - 标签: 时间 Gray-5 #70707C / 数值 Gray-3 #A9A9B7, Inter Regular 12/16
 *
 * 尺寸标注使用 cqw/cqh 容器查询单位, 宽高拖拽时整体等比缩放。
 */

export interface SpendingTrendData {
  /** 标题, 默认 "Spending trend" */
  title?: string
  /** 主数值（入场时从 0 滚动计数到该值）, 默认 87 */
  value?: number
  /** 数值后缀, 默认 "%" */
  valueSuffix?: string
  /** 涨幅文本, 默认 "+4.5%"; 以 "-" 开头时自动切换为红色 */
  trend?: string
  /**
   * 曲线点位（0–100 的数值数组, 横轴均分）。
   * 不传时使用设计稿原始贝塞尔路径（1:1 还原）;
   * 传入后用 Catmull-Rom 平滑生成曲线, 端点自动放置高亮点与标签。
   */
  points?: number[]
  /** 端点旁的时间标签, 默认 "24 june"; 传空字符串隐藏 */
  timeLabel?: string
  /** 端点旁的数值标签, 默认 "$39"; 传空字符串隐藏 */
  valueLabel?: string
}

/** 设计稿原始曲线（chart 区 201×97 坐标系, 端点即高亮点） */
const DESIGN_PATH =
  'M0 22.47 L45.11 22.47 ' +
  'C47.34 22.47 49.52 23.21 51.25 24.56 L71.3 40.19 ' +
  'C73.03 41.55 75.2 42.28 77.43 42.28 L96.67 42.28 ' +
  'C99.29 42.28 101.79 43.29 103.62 45.09 L128.19 68.74 ' +
  'C130.02 70.54 132.52 71.96 135.18 71.96 L157.42 71.96 ' +
  'C159.52 71.96 161.54 71.31 163.22 70.15 L191 49.87'

/** 设计稿端点在 chart 区内的相对位置 */
const DESIGN_DOT = { x: 192 / 201, y: 48 / 97 }

/* 曲线纵向映射区间（chart 区 201×97 坐标系内） */
const X_MAX = 191
const Y_TOP = 22.47
const Y_BOTTOM = 71.96

/** Catmull-Rom 平滑路径, 返回路径与最后一个点的像素坐标 */
function buildPath(points: number[]): { d: string; end: { x: number; y: number } } {
  const n = points.length
  const px = points.map((_, i) => (i / (n - 1)) * X_MAX)
  const py = points.map((v) => Y_TOP + (1 - clamp01(v / 100)) * (Y_BOTTOM - Y_TOP))
  let d = `M${px[0]} ${py[0]}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = Math.max(0, i - 1)
    const p3 = Math.min(n - 1, i + 2)
    const c1x = px[i] + (px[i + 1] - px[p0]) / 6
    const c1y = py[i] + (py[i + 1] - py[p0]) / 6
    const c2x = px[i + 1] - (px[p3] - px[i]) / 6
    const c2y = py[i + 1] - (py[p3] - py[i]) / 6
    d += ` C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(px[i + 1])} ${r2(py[i + 1])}`
  }
  return { d, end: { x: px[n - 1], y: py[n - 1] } }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const r2 = (v: number) => Math.round(v * 100) / 100

function useCountUp(target: number, duration = 1200, delay = 300) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const raf = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(raf)
    }
    let raf = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return value
}

export function SpendingTrendWidget({
  title = '消费趋势',
  value = 87,
  valueSuffix = '%',
  trend = '+4.5%',
  points,
  timeLabel = '6月24日',
  valueLabel = '¥39',
}: SpendingTrendData) {
  const percent = useCountUp(value)
  const trendDown = trend.trim().startsWith('-')

  const { d, dot } = useMemoPath(points)
  const dotX = dot.x / 201
  const dotY = dot.y / 97

  return (
    <div
      className="sr-stw relative h-full w-full select-none overflow-hidden rounded-[12px] bg-black font-sans"
      style={{ containerType: 'size' }}
    >
      {/* ---- 标题区 ------------------------------------------------ */}
      <div className="absolute left-[12.5%] top-[11.8%] flex flex-col" style={{ gap: '6.4cqh' }}>
        <span className="sr-stw-fade text-white" style={{ fontSize: 'min(7.6cqw, 6.36cqh)', lineHeight: 1.15, animationDelay: '0.1s' }}>
          {title}
        </span>
        <div className="flex flex-col" style={{ gap: '4.1cqh' }}>
          <span
            className="sr-stw-fade font-semibold text-white"
            style={{ fontSize: 'min(10.9cqw, 9.1cqh)', lineHeight: 0.9, animationDelay: '0.25s', fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif' }}
          >
            {percent}{valueSuffix}
          </span>
          <span
            className="sr-stw-fade font-semibold"
            style={{ fontSize: 'min(7.6cqw, 6.36cqh)', lineHeight: 1.15, color: trendDown ? '#fd4438' : '#15ffab', animationDelay: '0.4s' }}
          >
            {trend}
          </span>
        </div>
      </div>

      {/* ---- 图表区（底部 44% 高度, 横向铺满） ---------------------- */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: '44.1%' }}>
        {/* 垂直时间线 */}
        <div
          className="sr-stw-fade absolute w-px bg-[#2d2d35]"
          style={{ left: `${dotX * 100}%`, top: `${dotY * 100}%`, bottom: 0, animationDelay: '1.15s' }}
        />
        {/* 曲线 + 辉光（clip-path 从左至右揭示, 避免 pathLength 在非均匀缩放下的渲染问题） */}
        <svg
          className="sr-stw-line-clip absolute inset-0 h-full w-full"
          viewBox="0 0 201 97"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d={d}
            stroke="#3be5b8"
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="sr-stw-line"
          />
        </svg>
        {/* 端点: 脉冲外圈 + 实心点 */}
        <div
          className="absolute"
          style={{ left: `${dotX * 100}%`, top: `${dotY * 100}%`, transform: 'translate(-50%, -50%)' }}
        >
          <span className="sr-stw-pulse absolute rounded-full border border-[#3be5b8]/30" />
          <span
            className="sr-stw-dot block rounded-full bg-[#3be5b8]"
            style={{ width: '6.5cqw', height: '6.5cqw', minWidth: 8, minHeight: 8 }}
          />
        </div>
        {/* 标签（锚定在端点左侧上方） */}
        {timeLabel && (
          <span
            className="sr-stw-fade absolute text-[#70707c]"
            style={{ left: `${dotX * 100 - 21.4}%`, top: 0, fontSize: 'min(6.5cqw, 5.45cqh)', lineHeight: 1.33, animationDelay: '1.0s' }}
          >
            {timeLabel}
          </span>
        )}
        {valueLabel && (
          <span
            className="sr-stw-fade absolute text-[#a9a9b7]"
            style={{ left: `${dotX * 100 - 12.4}%`, top: '16.5%', fontSize: 'min(6.5cqw, 5.45cqh)', lineHeight: 1.33, animationDelay: '1.1s' }}
          >
            {valueLabel}
          </span>
        )}
      </div>

      <style>{`
        .sr-stw-fade { opacity: 0; animation: sr-stw-fadein .6s ease-out forwards; }
        @keyframes sr-stw-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-stw-line-clip {
          clip-path: inset(0 100% 0 0);
          animation: sr-stw-reveal 1.4s cubic-bezier(.4,0,.2,1) .35s forwards;
        }
        @keyframes sr-stw-reveal { to { clip-path: inset(0 0 0 0); } }
        .sr-stw-line {
          filter:
            drop-shadow(0 2.8px 2.2px rgba(65,255,195,.16))
            drop-shadow(0 6.7px 5.3px rgba(65,255,195,.23))
            drop-shadow(0 12.5px 10px rgba(65,255,195,.28))
            drop-shadow(0 22.3px 17.9px rgba(65,255,195,.34))
            drop-shadow(0 41.8px 33.4px rgba(65,255,195,.41))
            drop-shadow(0 100px 80px rgba(65,255,195,.57));
        }
        .sr-stw-dot { animation: sr-stw-dotin .4s cubic-bezier(.34,1.56,.64,1) 1.55s backwards; }
        @keyframes sr-stw-dotin { from { transform: scale(0); } to { transform: scale(1); } }
        .sr-stw-pulse {
          inset: 0;
          width: 6.5cqw; height: 6.5cqw; min-width: 8px; min-height: 8px;
          animation: sr-stw-ping 2.2s cubic-bezier(0,0,.2,1) 1.8s infinite;
        }
        @keyframes sr-stw-ping {
          0%   { transform: scale(1); opacity: 1; }
          60%, 100% { transform: scale(2.1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sr-stw-fade, .sr-stw-line-clip, .sr-stw-dot, .sr-stw-pulse { animation: none !important; opacity: 1; clip-path: none; }
        }
      `}</style>
    </div>
  )
}

/** 点位 → 路径与端点；未传 points 时返回设计稿原始路径与端点 */
function useMemoPath(points?: number[]) {
  return useMemo(() => {
    if (!points || points.length < 2) return { d: DESIGN_PATH, dot: { x: DESIGN_DOT.x * 201, y: DESIGN_DOT.y * 97 } }
    const { d, end } = buildPath(points)
    return { d, dot: end }
  }, [points])
}
