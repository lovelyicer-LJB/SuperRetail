import { useCountUp } from './use-count-up'

/**
 * ProgressChartC —— Pixso Charts | 图表页 Progress chart
 * (节点 63:478, 388×73, 透明底)
 *
 * 设计值（DSL 实测）:
 *  - 标题 "信用额度": Userpic/7 Inter Medium 14/16, Gray-0 #FFF 居中 @ y0
 *  - 数值 "$4,430" / "$10,000": Header/H6 Inter SemiBold 20/18, #FFF,
 *    分别居中于左端 x0-71.8 / 右端 x307.2-388 @ Chart 区 y0
 *  - 轨道 388×8 @ y31( Chart 内 ), Gray-9 #1D1D24 r2
 *  - 进度 161×12 @ y29, Sea green #15FFAA r2 + 绿辉光 rgba(40,188,0,.34) blur10 y4
 */

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface ProgressChartCProps {
  /** 标题, 默认「信用额度」 */
  title?: string
  /** 当前值（左端）, 默认 4430 */
  value?: number
  /** 目标值（右端）, 默认 10000 */
  target?: number
  /** 进度条宽度比 0~1, 默认 41.49%（设计稿 161/388） */
  ratio?: number
}

export function ProgressChartC({ title = '信用额度', value = 4430, target = 10000, ratio = 0.4149 }: ProgressChartCProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-prc relative h-full w-full select-none overflow-hidden font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 标题 信用额度 居中 */}
      <span
        className="sr-prc-fade absolute w-full text-center font-medium text-white"
        style={{ left: 0, top: 0, fontSize: 'min(3.61cqw, 19.18cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif' }}
      >
        {title}
      </span>
      {/* Chart 区 388×41 @ y32 (43.84%) */}
      <div className="absolute" style={{ left: 0, top: '43.84%', width: '100%', height: '56.16%', containerType: 'size' }}>
        {/* 当前值左端居中（w71.8 → 18.51%） */}
        <span
          className="sr-prc-fade absolute text-center font-semibold text-white"
          style={{ left: 0, top: 0, width: '18.51%', fontSize: 'min(5.15cqw, 27.4cqh)', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.15s' }}
        >
          ¥{count.toLocaleString('en-US')}
        </span>
        {/* 目标值右端（x307.2 → right 0, w80.8 → 20.82%） */}
        <span
          className="sr-prc-fade absolute text-center font-semibold text-white"
          style={{ right: 0, top: 0, width: '20.82%', fontSize: 'min(5.15cqw, 27.4cqh)', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.15s' }}
        >
          ¥{target.toLocaleString('en-US')}
        </span>
        {/* 轨道 388×8 @ y31 (75.61%) */}
        <span className="absolute w-full bg-[#1d1d24]" style={{ left: 0, top: '75.61%', height: '19.51%', borderRadius: 'min(0.52cqw, 4.88cqh)' }} />
        {/* 进度条宽度由 ratio 驱动, 比轨道高 4px 上下各 2px */}
        <span
          className="sr-prc-bar absolute bg-[#15ffaa]"
          style={{
            left: 0,
            top: '70.73%',
            width: `${ratio * 100}%`,
            height: '29.27%',
            borderRadius: 'min(0.52cqw, 4.88cqh)',
            boxShadow: '0 4px 10px rgba(40,188,0,.34)',
          }}
        />
      </div>
      <style>{`
        .sr-prc-fade { opacity: 0; animation: sr-prc-fadein .6s ease-out forwards; }
        @keyframes sr-prc-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-prc-bar {
          transform: scaleX(0);
          transform-origin: left;
          animation: sr-prc-grow .9s cubic-bezier(.22,1,.36,1) .25s forwards;
        }
        @keyframes sr-prc-grow { to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-prc-fade { animation: none !important; opacity: 1; }
          .sr-prc-bar  { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
