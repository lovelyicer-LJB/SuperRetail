import { useCountUp } from './use-count-up'
import { arcPath, sectorPath, arcLen } from './chart-utils'

/**
 * PieChartC —— Pixso Charts | 图表页 Pie chart
 * (节点 63:469, 208×208, 透明底)
 *
 * 设计值（DSL 实测）:
 *  - 底盘: 195×195 黑圆 @ (6,6)
 *  - 三环 stroke w6 r101 c104:
 *    蓝 #4807EA arc 1.703737→4.763961（97.6°→273°, 蓝色辉光 rgba(5,84,255)）
 *    青 stroke #15FFAA + 扇形填充 #0AAAFF arc 0→1.825356（0°→104.6°, 绿辉光 rgba(56,255,228)）
 *    品红 #E80FE9 arc 0→-1.523776（0° 逆时针 87.3°）
 *  - 内圆 148×148 @ (29,29) Gray-10 #0F0F13
 *  - 数值 "$22,870": Header/H5 Inter Medium 24/30 #FFF 居中 @ (38,75)
 *  - 描述 "Total expenses per month": Text 14/16 Gray-5 #70707C 居中 @ (42,112)
 */

const R = 101
const C = 104
const BLUE = { start: 1.703737, end: 4.763961 }
const CYAN = { start: 0, end: 1.825356 }
const MAGENTA = { start: 0, end: -1.523776 }

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface PieChartCProps {
  /** 中心数值, 默认 22870 */
  value?: number
  /** 中心描述, 默认「每月总支出」 */
  description?: string
}

export function PieChartC({ value = 22870, description = '每月总支出' }: PieChartCProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-piec relative h-full w-full select-none overflow-hidden font-sans"
      style={{ containerType: 'size' }}
    >
      <svg viewBox="0 0 208 208" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        {/* 底盘黑圆 195 @ (6,6) → c104 r97.5 */}
        <circle cx={C} cy={C} r={97.5} fill="#000" />
        {/* 青色扇形填充（到圆心, 内圆盖住中部） */}
        <path className="sr-piec-sector" d={sectorPath(C, C, R + 3, CYAN.start, CYAN.end)} fill="#0aaaff" style={{ transformOrigin: '104px 104px', animationDelay: '0.35s' }} />
        {/* 蓝弧 + 辉光 */}
        <path
          className="sr-piec-arc"
          d={arcPath(C, C, R, BLUE.start, BLUE.end)}
          stroke="#4807ea"
          strokeWidth={6}
          strokeDasharray={arcLen(R, BLUE.start, BLUE.end)}
          style={{
            ['--sr-piec-len' as string]: arcLen(R, BLUE.start, BLUE.end),
            filter: 'drop-shadow(0 4px 10px rgba(5,84,255,.45))',
            animationDelay: '0.15s',
          }}
        />
        {/* 青弧 + 辉光 */}
        <path
          className="sr-piec-arc"
          d={arcPath(C, C, R, CYAN.start, CYAN.end)}
          stroke="#15ffaa"
          strokeWidth={6}
          strokeDasharray={arcLen(R, CYAN.start, CYAN.end)}
          style={{
            ['--sr-piec-len' as string]: arcLen(R, CYAN.start, CYAN.end),
            filter: 'drop-shadow(0 4px 10px rgba(56,255,228,.4))',
            animationDelay: '0.3s',
          }}
        />
        {/* 品红弧 */}
        <path
          className="sr-piec-arc"
          d={arcPath(C, C, R, MAGENTA.start, MAGENTA.end)}
          stroke="#e80fe9"
          strokeWidth={6}
          strokeDasharray={arcLen(R, MAGENTA.start, MAGENTA.end)}
          style={{ ['--sr-piec-len' as string]: arcLen(R, MAGENTA.start, MAGENTA.end), animationDelay: '0.45s' }}
        />
        {/* 内圆 148 @ (29,29) → c104 r74 */}
        <circle cx={C} cy={C} r={74} fill="#0f0f13" />
      </svg>
      {/* 数值 $22,870 居中偏上 @ y75/208=36.06% */}
      <span
        className="sr-piec-fade absolute w-full text-center font-medium text-white"
        style={{ left: 0, top: '36.06%', fontSize: 'min(11.54cqw, 11.54cqh)', lineHeight: 1.25, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.5s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      {/* 描述 @ y112/208=53.85%, 宽 122/208=58.65% 居中 */}
      <span
        className="sr-piec-fade absolute text-center text-[#70707c]"
        style={{ left: '20.67%', top: '53.85%', width: '58.65%', fontSize: 'min(6.73cqw, 6.73cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.65s' }}
      >
        {description}
      </span>
      <style>{`
        .sr-piec-fade { opacity: 0; animation: sr-piec-fadein .6s ease-out forwards; }
        @keyframes sr-piec-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-piec-arc {
          stroke-dashoffset: var(--sr-piec-len);
          animation: sr-piec-draw 1s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes sr-piec-draw { to { stroke-dashoffset: 0; } }
        .sr-piec-sector {
          opacity: 0; transform: scale(.6);
          animation: sr-piec-sectorin .7s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-piec-sectorin { to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-piec-fade { animation: none !important; opacity: 1; }
          .sr-piec-arc  { animation: none !important; stroke-dashoffset: 0; }
          .sr-piec-sector { animation: none !important; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
