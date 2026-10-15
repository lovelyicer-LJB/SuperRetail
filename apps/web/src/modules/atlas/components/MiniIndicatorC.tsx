import { LwGlyph } from './lw-shared'
import { useCountUp } from './use-count-up'
import { arcPath, arcLen } from './chart-utils'

/**
 * MiniIndicatorC —— Pixso Charts | 图表页 Mini indicator
 * (节点 63:450, 240×50, 透明底)
 *
 * 设计值（DSL 实测）:
 *  - 环 50×50: 底环 stroke Gray-9 #1D1D24 w3; 进度弧 #5501FE w3,
 *    arc start 4.733809 → end 9.509102（≈271.2° 起 273.6° 顺时针）, r=23.5
 *  - 图标: car 18×18 #FFF @ (16,16)
 *  - 标题 "跑车": Userpic/7 Inter Medium 14/16, Gray-3 #A9A9B6 @ (68.5,7)
 *  - 数值 "$45,000": Inter Bold 16/16, #F1F0F6 @ (68.5,27)
 *  - 涨幅 "↑2.5%": Description 12/16, #37FCB5 @ (142.5,28)
 */

const R = 23.5
const C = 25
const START = 4.733809
const END = 9.509102
const LEN = arcLen(R, START, END)

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface MiniIndicatorCProps {
  /** 标的名称, 默认「跑车」 */
  title?: string
  /** 主数值, 默认 45000 */
  value?: number
  /** 涨幅文本, 默认 '↑2.5%' */
  trend?: string
}

export function MiniIndicatorC({ title = '跑车', value = 45000, trend = '↑2.5%' }: MiniIndicatorCProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-mic relative h-full w-full select-none overflow-hidden font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 环 50×50 */}
      <svg viewBox="0 0 50 50" className="absolute" style={{ left: 0, top: 0, width: '20.83%', height: '100%' }} fill="none" aria-hidden>
        <circle cx={C} cy={C} r={R} stroke="#1d1d24" strokeWidth={3} />
        <path
          className="sr-mic-arc"
          d={arcPath(C, C, R, START, END)}
          stroke="#5501fe"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={LEN}
          style={{ ['--sr-mic-len' as string]: LEN }}
        />
      </svg>
      {/* 图标 18×18 @ (32%, 32%) of 50 ring → 相对整卡 (6.67%, 32%) */}
      <span className="sr-mic-pop absolute" style={{ left: '6.67%', top: '32%', width: '7.5%', aspectRatio: '1' }}>
        <LwGlyph name="car_mini" />
      </span>
      {/* 标题 跑车 @ (28.54%, 14%) */}
      <span
        className="sr-mic-fade absolute text-[#a9a9b6]"
        style={{ left: '28.54%', top: '14%', fontSize: 'min(5.83cqw, 28cqh)', lineHeight: 1.143, fontWeight: 500, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.2s' }}
      >
        {title}
      </span>
      {/* 数值 @ (28.54%, 54%) */}
      <span
        className="sr-mic-fade absolute font-bold text-[#f1f0f6]"
        style={{ left: '28.54%', top: '54%', fontSize: 'min(6.67cqw, 32cqh)', lineHeight: 1, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      {/* 涨幅 @ (59.38%, 56%) */}
      <span
        className="sr-mic-fade absolute text-[#37fcb5]"
        style={{ left: '59.38%', top: '56%', fontSize: 'min(5cqw, 24cqh)', lineHeight: 1.333, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.45s' }}
      >
        {trend}
      </span>
      <style>{`
        .sr-mic-fade { opacity: 0; animation: sr-mic-fadein .6s ease-out forwards; }
        @keyframes sr-mic-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-mic-pop {
          transform: scale(0);
          animation: sr-mic-popin .5s cubic-bezier(.34,1.56,.64,1) .15s forwards;
        }
        @keyframes sr-mic-popin { to { transform: scale(1); } }
        .sr-mic-arc {
          stroke-dashoffset: var(--sr-mic-len);
          animation: sr-mic-draw 1.1s cubic-bezier(.22,1,.36,1) .2s forwards;
        }
        @keyframes sr-mic-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .sr-mic-fade { animation: none !important; opacity: 1; }
          .sr-mic-pop  { animation: none !important; transform: none; }
          .sr-mic-arc  { animation: none !important; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
