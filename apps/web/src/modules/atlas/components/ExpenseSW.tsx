import { SStatShell } from './sw-shared'

/**
 * ExpenseSW —— Pixso Widgets & Indicator 页 Expense / S widget
 * (节点 65:3798, 165×138, Dark Theme)
 *
 * 图表区（137×47 @ (14,75), DSL 实测）: 8 根 6×21 圆角柱（radius 6）纵向波动,
 * 金色三档: 亮 #FCCF5E / 中 #9F8543 / 暗 #5C4F30
 */

/** [x, y, color] —— chart 区 137×47 坐标系实测值 */
const BARS: [number, number, string][] = [
  [0, 17, '#9f8543'],
  [19, 27, '#5c4f30'],
  [38, 17, '#9f8543'],
  [57, 8, '#fccf5e'],
  [76, 0, '#fccf5e'],
  [94, 8, '#fccf5e'],
  [114, 18, '#9f8543'],
  [132, 17, '#9f8543'],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface ExpenseSWProps {
  title?: string
  value?: number
  /** 柱条 [x, y, color]（chart 区 137×47 坐标系） */
  bars?: [number, number, string][]
}

export function ExpenseSW({ title = '支出', value = 27632, bars = BARS }: ExpenseSWProps = {}) {
  return (
    <SStatShell title={title} value={value}>
      {/* 图表区 137×47 @ (8.48%, 54.35%) */}
      <div
        className="absolute"
        style={{ left: '8.48%', top: '54.35%', width: '83.03%', height: '34.06%', containerType: 'size' }}
      >
        {bars.map(([x, y, color], i) => (
          <span
            key={i}
            className="sr-swe-bar absolute block rounded-full"
            style={{
              left: `${(x / 137) * 100}%`,
              top: `${(y / 47) * 100}%`,
              width: '4.38cqw',
              height: '44.68cqh',
              background: color,
              animationDelay: `${0.4 + i * 0.05}s`,
            }}
          />
        ))}
        <style>{`
          .sr-swe-bar {
            transform: scale(0);
            animation: sr-swe-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;
          }
          @keyframes sr-swe-pop { to { transform: scale(1); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-swe-bar { animation: none !important; transform: none; }
          }
        `}</style>
      </div>
    </SStatShell>
  )
}
