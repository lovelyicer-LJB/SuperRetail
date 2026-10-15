import { useCountUp } from './use-count-up'

/**
 * IncomeMW —— Pixso Widgets & Indicator 页 Income / M widget
 * (节点 65:3746, 197×214, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-11 #000, radius 10, padding 24/18
 *  - 图表区 161×91 @ (18,24): 10 根 7×27 圆角柱（radius 6）纵向波动,
 *    颜色三档金: 亮 #FCCF5E / 中 #9F8543 / 暗 #5C4F30
 *  - 标题 "Income": Text Inter Regular 14/16 #FFF @ (18,146)
 *  - 数值行 @ (18,172): "$34,394" Header/H6 Inter SemiBold 20/18 #FFF
 *    + "+4.5%" Text Bold Inter SemiBold 14/16 #37FCB5 右对齐
 */

/** [x, y, color] —— chart 区 161×91 坐标系实测值 */
const BARS: [number, number, string][] = [
  [0, 36, '#9f8543'],
  [17, 42, '#9f8543'],
  [34, 52, '#5c4f30'],
  [51, 42, '#9f8543'],
  [68, 28, '#fccf5e'],
  [85, 12, '#fccf5e'],
  [102, 28, '#fccf5e'],
  [119, 42, '#9f8543'],
  [136, 52, '#5c4f30'],
  [154, 42, '#9f8543'],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface IncomeMWProps {
  title?: string
  value?: number
  /** 涨幅文本, 默认 '+4.5%' */
  trend?: string
  /** 柱条 [x, y, color]（chart 区 161×91 坐标系） */
  bars?: [number, number, string][]
}

export function IncomeMW({ title = '收入', value = 34394, trend = '+4.5%', bars = BARS }: IncomeMWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-mwi relative h-full w-full select-none overflow-hidden rounded-[10px] bg-black font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 图表区 161×91 @ (9.14%, 11.21%) */}
      <div
        className="absolute"
        style={{ left: '9.14%', top: '11.21%', width: '81.73%', height: '42.52%', containerType: 'size' }}
      >
        {bars.map(([x, y, color], i) => (
          <span
            key={i}
            className="sr-mwi-bar absolute block rounded-full"
            style={{
              left: `${(x / 161) * 100}%`,
              top: `${(y / 91) * 100}%`,
              width: '4.35cqw',
              height: '29.67cqh',
              background: color,
              animationDelay: `${0.3 + i * 0.05}s`,
            }}
          />
        ))}
      </div>

      {/* 标题 @ (9.14%, 68.22%) */}
      <span
        className="sr-mwi-fade absolute text-white"
        style={{ left: '9.14%', top: '68.22%', fontSize: 'min(7.11cqw, 6.54cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.75s' }}
      >
        {title}
      </span>
      {/* 数值行 @ (9.14%, 80.37%) */}
      <span
        className="sr-mwi-fade absolute font-semibold text-white"
        style={{ left: '9.14%', top: '80.37%', fontSize: 'min(10.15cqw, 9.35cqh)', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.85s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      <span
        className="sr-mwi-fade absolute right-[9.14%] font-semibold text-[#37fcb5]"
        style={{ top: '81.78%', fontSize: 'min(7.11cqw, 6.54cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.9s' }}
      >
        {trend}
      </span>

      <style>{`
        .sr-mwi-fade { opacity: 0; animation: sr-mwi-fadein .6s ease-out forwards; }
        @keyframes sr-mwi-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-mwi-bar {
          transform: scale(0);
          animation: sr-mwi-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-mwi-pop { to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-mwi-fade { animation: none !important; opacity: 1; }
          .sr-mwi-bar { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
