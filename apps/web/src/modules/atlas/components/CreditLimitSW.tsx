import { SStatShell } from './sw-shared'

/**
 * CreditLimitSW —— Pixso Widgets & Indicator 页 Credit limit / S widget
 * (节点 65:3843, 165×137, Dark Theme)
 *
 * 图表区（137×36 @ (14,85), DSL 实测）: 7 根 4 宽圆角柱（radius 1）底对齐,
 * 全部 Sea green #15FFAA; 第 5 根高 43 超出图表框 7px, 由 overflow hidden 裁切。
 * 柱 x: 6/26/46/66/86/106/127, 高: 33/8/20/15/43/15/36（底边均对齐 36）
 */

/** [x, height] —— chart 区 137×36 坐标系实测值 */
const BARS: [number, number][] = [
  [6, 33],
  [26, 8],
  [46, 20],
  [66, 15],
  [86, 43],
  [106, 15],
  [127, 36],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface CreditLimitSWProps {
  title?: string
  value?: number
  /** 柱条 [x, height]（chart 区 137×36 坐标系, 超高由 overflow 裁切） */
  bars?: [number, number][]
}

export function CreditLimitSW({ title = '信用额度', value = 27632, bars = BARS }: CreditLimitSWProps = {}) {
  return (
    <SStatShell title={title} value={value}>
      {/* 图表区 137×36 @ (8.48%, 62.04%), 裁切超高柱 */}
      <div
        className="absolute overflow-hidden"
        style={{ left: '8.48%', top: '62.04%', width: '83.03%', height: '26.28%', containerType: 'size' }}
      >
        {bars.map(([x, h], i) => (
          <span
            key={i}
            className="sr-cls-bar absolute bottom-0 block bg-[#15ffaa]"
            style={{
              left: `${(x / 137) * 100}%`,
              width: '2.92cqw',
              height: `${(h / 36) * 100}%`,
              borderRadius: 'min(0.73cqw, 2.78cqh)',
              animationDelay: `${0.4 + i * 0.05}s`,
            }}
          />
        ))}
        <style>{`
          .sr-cls-bar {
            transform: scaleY(0);
            transform-origin: bottom;
            animation: sr-cls-grow .55s cubic-bezier(.22,1,.36,1) forwards;
          }
          @keyframes sr-cls-grow { to { transform: scaleY(1); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-cls-bar { animation: none !important; transform: none; }
          }
        `}</style>
      </div>
    </SStatShell>
  )
}
