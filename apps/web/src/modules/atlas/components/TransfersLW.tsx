import { LCardShell } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * TransfersLW —— Pixso Widgets & Indicator 页 Transfers widgets / L widget
 * (节点 65:3619, 188×254, Dark Theme)
 *
 * 图表区（DSL 实测）: 80×80 环形图 @ (54,146), 居中, stroke 6 inside (r=37)
 *  - 底环: #242424 整圈
 *  - 主弧: Frosty skies #06D7F6, 270° 起顺时针 263.4° + 6 层蓝色辉光 rgba(11,83,244,…)
 *  - 次弧: Dark Amber #FD7E07, 193.1° 起顺时针 58.6°
 *  - 中心: 27% Inter SemiBold 20/18 (Header/H6), Gray-0 #FFF
 */

const R = 37

/** 主弧辉光（DSL 实测 6 层 drop-shadow） */
const ARC_GLOW = [
  'drop-shadow(0 2.77px 2.21px rgba(11,83,244,.065))',
  'drop-shadow(0 6.65px 5.32px rgba(11,83,244,.093))',
  'drop-shadow(0 12.52px 10.02px rgba(11,83,244,.115))',
  'drop-shadow(0 22.34px 17.87px rgba(11,83,244,.137))',
  'drop-shadow(0 41.78px 33.42px rgba(11,83,244,.165))',
  'drop-shadow(0 100px 80px rgba(11,83,244,.23))',
].join(' ')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface TransfersLWProps {
  title?: string
  value?: number
  /** 环形中心百分比, 默认 27 */
  percent?: number
}

export function TransfersLW({ title = '转账', value = 27632, percent = 27 }: TransfersLWProps = {}) {
  const count = useCountUp(percent)
  return (
    <LCardShell icon="transfers" title={title} value={value}>
      {/* 环形 80×80: 居中 @ top 57.48% */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '57.48%',
          width: '42.55%',
          aspectRatio: '1',
          transform: 'translateX(-50%)',
          containerType: 'size',
        }}
      >
        <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" fill="none">
          {/* 底环 */}
          <circle cx="40" cy="40" r={R} stroke="#242424" strokeWidth="6" />
          {/* 主弧 270°→263.4° (cyan, 带蓝色辉光) */}
          <path
            d="M40 3 A 37 37 0 1 1 3.24 44.21"
            stroke="#06d7f6"
            strokeWidth="6"
            className="sr-lwt-arc-main"
            style={{ filter: ARC_GLOW }}
          />
          {/* 次弧 193.1°→58.6° (amber) */}
          <path
            d="M3.97 31.6 A 37 37 0 0 1 28.4 4.87"
            stroke="#fd7e07"
            strokeWidth="6"
            className="sr-lwt-arc-sub"
          />
        </svg>
        {/* 中心百分比 Inter SemiBold 20/18 */}
        <span
          className="sr-lw-fade absolute inset-0 flex items-center justify-center font-semibold text-white"
          style={{ fontSize: '25cqw', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '1.0s' }}
        >
          {count}%
        </span>
        <style>{`
          .sr-lwt-arc-main {
            stroke-dasharray: 170.14;
            stroke-dashoffset: 170.14;
            animation: sr-lwt-main 1.3s cubic-bezier(.4,0,.2,1) .45s forwards;
          }
          @keyframes sr-lwt-main { to { stroke-dashoffset: 0; } }
          .sr-lwt-arc-sub {
            stroke-dasharray: 37.85;
            stroke-dashoffset: 37.85;
            animation: sr-lwt-sub .5s cubic-bezier(.4,0,.2,1) 1.55s forwards;
          }
          @keyframes sr-lwt-sub { to { stroke-dashoffset: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .sr-lwt-arc-main, .sr-lwt-arc-sub { animation: none !important; stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    </LCardShell>
  )
}
