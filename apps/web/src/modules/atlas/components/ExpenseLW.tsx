import { LCardShell } from './lw-shared'

/**
 * ExpenseLW —— Pixso Widgets & Indicator 页 Expense widget / L widget
 * (节点 65:3576, 188×254, Dark Theme)
 *
 * 图表区（160×48 @ y178, DSL 实测）: 8 根 6 宽底对齐柱（radius 1），
 * 高度序列 13/28/13/48/28/48/13/48, 青绿色 #38FDB6。
 */

/** [x, height] —— chart 区 160×48 坐标系实测值 */
const COLS: [number, number][] = [
  [5, 13],
  [25, 28],
  [45, 13],
  [65, 48],
  [85, 28],
  [105, 48],
  [126, 13],
  [146, 48],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface ExpenseLWProps {
  title?: string
  value?: number
  /** 柱条 [x, height]（chart 区 160×48 坐标系） */
  cols?: [number, number][]
}

export function ExpenseLW({ title = '支出', value = 27632, cols = COLS }: ExpenseLWProps = {}) {
  return (
    <LCardShell icon="expense" title={title} value={value}>
      {/* 图表区 160×48 @ (7.45%, 70.08%) */}
      <div
        className="absolute"
        style={{ left: '7.45%', top: '70.08%', width: '85.11%', height: '18.90%', containerType: 'size' }}
      >
        {cols.map(([x, h], i) => (
          <span
            key={i}
            className="sr-lwe-col absolute bottom-0 block bg-[#38fdb6]"
            style={{
              left: `${(x / 160) * 100}%`,
              width: '3.75cqw',
              height: `${(h / 48) * 100}%`,
              borderRadius: 'min(0.625cqw, 2.08cqh)',
              animationDelay: `${0.5 + i * 0.06}s`,
            }}
          />
        ))}
        <style>{`
          .sr-lwe-col {
            transform: scaleY(0);
            transform-origin: bottom;
            animation: sr-lwe-grow .55s cubic-bezier(.4,0,.2,1) forwards;
          }
          @keyframes sr-lwe-grow { to { transform: scaleY(1); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-lwe-col { animation: none !important; transform: none; }
          }
        `}</style>
      </div>
    </LCardShell>
  )
}
