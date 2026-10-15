import { LCardShell } from './lw-shared'

/**
 * IncomeLW —— Pixso Widgets & Indicator 页 Income widget / L widget
 * (节点 65:3554, 188×254, Dark Theme)
 *
 * 图表区（160×59 @ y167, DSL 实测）: 11 根 7×27 圆角柱（radius 6, 近胶囊形），
 * 纵向位置各异形成波浪; 颜色三档金:
 *   亮 #FCCF5E / 中 #9F8543 / 暗 #5C4F30
 */

/** [x, y, color] —— chart 区 160×59 坐标系实测值 */
const BARS: [number, number, string][] = [
  [0, 31, '#5c4f30'],
  [14, 20, '#9f8543'],
  [29, 20, '#9f8543'],
  [44, 31, '#5c4f30'],
  [59, 20, '#9f8543'],
  [74, 10, '#fccf5e'],
  [89, 0, '#fccf5e'],
  [104, 10, '#fccf5e'],
  [119, 20, '#9f8543'],
  [134, 32, '#5c4f30'],
  [149, 20, '#9f8543'],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化: 数据可注入, 缺省渲染设计稿默认数据
export interface IncomeLWProps {
  /** 标题, 默认「收入」 */
  title?: string
  /** 主数值（入场滚动计数）, 默认 27632 */
  value?: number
  /** 柱条 [x, y, color]（chart 区 160×59 坐标系）, 默认设计稿波浪 */
  bars?: [number, number, string][]
}

export function IncomeLW({ title = '收入', value = 27632, bars = BARS }: IncomeLWProps = {}) {
  return (
    <LCardShell icon="income" title={title} value={value}>
      {/* 图表区 160×59 @ (7.45%, 65.75%) */}
      <div
        className="absolute"
        style={{ left: '7.45%', top: '65.75%', width: '85.11%', height: '23.23%', containerType: 'size' }}
      >
        {bars.map(([x, y, color], i) => (
          <span
            key={i}
            className="sr-lwi-bar absolute block rounded-full"
            style={{
              left: `${(x / 160) * 100}%`,
              top: `${(y / 59) * 100}%`,
              width: '4.375cqw',
              height: '45.76cqh',
              background: color,
              animationDelay: `${0.5 + i * 0.06}s`,
            }}
          />
        ))}
        <style>{`
          .sr-lwi-bar {
            transform: scale(0);
            animation: sr-lwi-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;
          }
          @keyframes sr-lwi-pop { to { transform: scale(1); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-lwi-bar { animation: none !important; transform: none; }
          }
        `}</style>
      </div>
    </LCardShell>
  )
}
