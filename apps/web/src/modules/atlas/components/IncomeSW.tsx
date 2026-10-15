import { SStatShell } from './sw-shared'

/**
 * IncomeSW —— Pixso Widgets & Indicator 页 Income / S widget
 * (节点 65:3818, 165×137, Dark Theme)
 *
 * 图表区（137×36 @ (14,85), DSL 实测）: 7 根 4 宽底对齐柱（radius 1）,
 * 高度 10/21/10/36/21/36/10, Sea green #15FFAA
 */

/** [x, height] —— chart 区 137×36 坐标系实测值 */
const COLS: [number, number][] = [
  [6, 10],
  [26, 21],
  [46, 10],
  [66, 36],
  [86, 21],
  [106, 36],
  [127, 10],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface IncomeSWProps {
  title?: string
  value?: number
  /** 柱条 [x, height]（chart 区 137×36 坐标系） */
  cols?: [number, number][]
}

export function IncomeSW({ title = '收入', value = 27632, cols = COLS }: IncomeSWProps = {}) {
  return (
    <SStatShell title={title} value={value}>
      {/* 图表区 137×36 @ (8.48%, 62.04%) */}
      <div
        className="absolute"
        style={{ left: '8.48%', top: '62.04%', width: '83.03%', height: '26.28%', containerType: 'size' }}
      >
        {cols.map(([x, h], i) => (
          <span
            key={i}
            className="sr-swi-col absolute bottom-0 block bg-[#15ffaa]"
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
          .sr-swi-col {
            transform: scaleY(0);
            transform-origin: bottom;
            animation: sr-swi-grow .55s cubic-bezier(.4,0,.2,1) forwards;
          }
          @keyframes sr-swi-grow { to { transform: scaleY(1); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-swi-col { animation: none !important; transform: none; }
          }
        `}</style>
      </div>
    </SStatShell>
  )
}
