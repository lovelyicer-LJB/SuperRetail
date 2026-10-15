import { MCardShell } from './mw-shared'

/**
 * SpendThisWeekMW —— Pixso Widgets & Indicator 页 Spend this week / M widget
 * (节点 65:3685, 182×220, Dark Theme)
 *
 * 图表区（142×60 @ (20,136), DSL 实测）: 9 根深灰底柱 6×60 (#0F0F13, 间距 17)
 * + 底对齐进度柱（radius 100）:
 *   高度 31/46/31/31/46/53/46/31/31,
 *   颜色 Persian blue #4807EA / 蓝 #00A1FD / 靛 #4557FF 交替
 * 趋势 "↓2.5%": Alizarin red #FD4438
 */

/** 进度柱 [height, color] —— chart 区 142×60 坐标系实测值 */
const BARS: [number, string][] = [
  [31, '#4807ea'],
  [46, '#00a1fd'],
  [31, '#4807ea'],
  [31, '#4807ea'],
  [46, '#4557ff'],
  [53, '#00a1fd'],
  [46, '#4557ff'],
  [31, '#4807ea'],
  [31, '#4807ea'],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface SpendThisWeekMWProps {
  title?: string
  value?: number
  trend?: string
  /** 进度柱 [height, color]（chart 区 142×60 坐标系） */
  bars?: [number, string][]
}

export function SpendThisWeekMW({ title = '本周消费', value = 540, trend = '↓2.5%', bars = BARS }: SpendThisWeekMWProps = {}) {
  return (
    <MCardShell title={title} value={value} trend={trend} trendColor="#fd4438">
      {/* 图表区 142×60 @ (10.99%, 61.82%) */}
      <div
        className="absolute"
        style={{ left: '10.99%', top: '61.82%', width: '78.02%', height: '27.27%', containerType: 'size' }}
      >
        {bars.map((_, i) => (
          <span
            key={`bg-${i}`}
            className="absolute bottom-0 block rounded-full bg-[#0f0f13]"
            style={{ left: `${(i * 17 / 142) * 100}%`, width: '4.23cqw', height: '100%' }}
          />
        ))}
        {bars.map(([h, color], i) => (
          <span
            key={i}
            className="sr-mws-bar absolute bottom-0 block rounded-full"
            style={{
              left: `${(i * 17 / 142) * 100}%`,
              width: '4.23cqw',
              height: `${(h / 60) * 100}%`,
              background: color,
              animationDelay: `${0.5 + i * 0.05}s`,
            }}
          />
        ))}
        <style>{`
          .sr-mws-bar {
            transform: scaleY(0);
            transform-origin: bottom;
            animation: sr-mws-grow .55s cubic-bezier(.4,0,.2,1) forwards;
          }
          @keyframes sr-mws-grow { to { transform: scaleY(1); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-mws-bar { animation: none !important; transform: none; }
          }
        `}</style>
      </div>
    </MCardShell>
  )
}
