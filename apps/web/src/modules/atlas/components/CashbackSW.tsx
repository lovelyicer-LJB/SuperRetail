import { SStatShell } from './sw-shared'

/**
 * CashbackSW —— Pixso Widgets & Indicator 页 Cashback / S widget
 * (节点 65:3830, 165×138, Dark Theme)
 *
 * 图表区（137×47 @ (14,75), DSL 实测）: 8 根 6×21 圆角柱（radius 6）纵向波动,
 * 金色三档: 亮 #FCCF5E / 中 #9F8543 / 暗 #4F462D
 */

/** [x, y, color] —— chart 区 137×47 坐标系实测值 */
const BARS: [number, number, string][] = [
  [0, 17, '#9f8543'],
  [19, 4, '#fccf5e'],
  [38, 21, '#4f462d'],
  [57, 8, '#fccf5e'],
  [76, 0, '#fccf5e'],
  [94, 8, '#fccf5e'],
  [114, 21, '#4f462d'],
  [132, 9, '#fccf5e'],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface CashbackSWProps {
  title?: string
  value?: number
  /** 柱条 [x, y, color]（chart 区 137×47 坐标系） */
  bars?: [number, number, string][]
}

export function CashbackSW({ title = '返现', value = 1869, bars = BARS }: CashbackSWProps = {}) {
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
            className="sr-swc-bar absolute block rounded-full"
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
          .sr-swc-bar {
            transform: scale(0);
            animation: sr-swc-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;
          }
          @keyframes sr-swc-pop { to { transform: scale(1); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-swc-bar { animation: none !important; transform: none; }
          }
        `}</style>
      </div>
    </SStatShell>
  )
}
