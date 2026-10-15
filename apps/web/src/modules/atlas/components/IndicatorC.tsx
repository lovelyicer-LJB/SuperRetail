import { useCountUp } from './use-count-up'
import { arcPath, arcLen } from './chart-utils'

/**
 * IndicatorC —— Pixso Charts | 图表页 Indicator
 * (节点 63:460, 190×80, 透明底)
 *
 * 设计值（DSL 实测）:
 *  - 环 80×80: 底环 fill #000 stroke #242424 w6; 进度弧 #5500FE w6 + 蓝色辉光
 *    rgba(11,83,244,*) 6 层, arc start 4.712389（正上）→ end 9.310633（263.4°）, r=37
 *  - 中心 "27%": Header/H6 Inter SemiBold 20/18, #FFF 居中
 *  - 右侧 Info @ (96,0) 94×80 垂直居中: "92,980" H7 Bold 18/22 #FFF @ y19;
 *    "活跃用户" Userpic/7 Medium 14/16 #FFF @ y45
 */

const R = 37
const C = 40
const START = 4.712389
const END = 9.310633
const LEN = arcLen(R, START, END)

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface IndicatorCProps {
  /** 环形中心百分比, 默认 27 */
  percent?: number
  /** 主数值, 默认 92980 */
  value?: number
  /** 数值说明, 默认「活跃用户」 */
  label?: string
}

export function IndicatorC({ percent = 27, value = 92980, label = '活跃用户' }: IndicatorCProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-idc relative h-full w-full select-none overflow-hidden font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 环 80×80（左侧, 42.11% 宽） */}
      <div className="absolute" style={{ left: 0, top: 0, width: '42.11%', height: '100%', containerType: 'size' }}>
        <div className="absolute inset-0 rounded-full bg-black" style={{ boxShadow: 'inset 0 0 0 6px #242424' }} />
        <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" fill="none" aria-hidden style={{ filter: `drop-shadow(0 6px 12px rgba(11,83,244,.35))` }}>
          <path
            className="sr-idc-arc"
            d={arcPath(C, C, R, START, END)}
            stroke="#5500fe"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={LEN}
            style={{ ['--sr-idc-len' as string]: LEN }}
          />
        </svg>
        {/* 27% 居中 */}
        <span
          className="sr-idc-fade absolute inset-0 flex items-center justify-center font-semibold text-white"
          style={{ fontSize: 'min(25cqw, 25cqh)', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
        >
          {percent}%
        </span>
      </div>
      {/* Info @ (50.53%, 垂直居中): 数值 / 说明 */}
      <div className="absolute flex flex-col items-start justify-center" style={{ left: '50.53%', top: 0, width: '49.47%', height: '100%' }}>
        <span
          className="sr-idc-fade block font-bold text-white"
          style={{ fontSize: 'min(9.47cqw, 22.5cqh)', lineHeight: 1.222, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.2s' }}
        >
          {count.toLocaleString('en-US')}
        </span>
        <span
          className="sr-idc-fade block text-white"
          style={{ marginTop: '2.5%', fontSize: 'min(7.37cqw, 17.5cqh)', lineHeight: 1.143, fontWeight: 500, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.35s' }}
        >
          {label}
        </span>
      </div>
      <style>{`
        .sr-idc-fade { opacity: 0; animation: sr-idc-fadein .6s ease-out forwards; }
        @keyframes sr-idc-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-idc-arc {
          stroke-dashoffset: var(--sr-idc-len);
          animation: sr-idc-draw 1.1s cubic-bezier(.22,1,.36,1) .2s forwards;
        }
        @keyframes sr-idc-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .sr-idc-fade { animation: none !important; opacity: 1; }
          .sr-idc-arc  { animation: none !important; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
