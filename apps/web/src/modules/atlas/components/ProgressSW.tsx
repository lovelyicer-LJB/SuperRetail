import { LwGlyph } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * ProgressSW —— Pixso Widgets & Indicator 页 Progress / S widget
 * (节点 65:3791, 106×141, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-9 #1D1D24, radius 10
 *  - 环形 62×62 @ (22,20):
 *    底弧 #05050E stroke 3, 30.7° 起顺时针 241.8°（r=29.5）;
 *    进度弧 #15FFAA stroke 5, 149.1° 起 96.3°（r=28.5）+ 6 层青辉光 rgba(56,255,228,…)
 *  - 中心房子线图标 24×24 #FFF @ (41,39)
 *  - "House": Text Inter Regular 14/16 #FFF 居中 @ y82
 *  - "$43,540": Button label Inter Bold 16/16 #FFF 居中 @ y103
 */

/** 进度弧辉光（DSL 实测 6 层） */
const ARC_GLOW = [
  'drop-shadow(0 1.85px 3.15px rgba(56,255,228,.053))',
  'drop-shadow(0 8.15px 6.52px rgba(56,255,228,.086))',
  'drop-shadow(0 20px 13px rgba(56,255,228,.11))',
  'drop-shadow(0 38.52px 25.48px rgba(56,255,228,.134))',
  'drop-shadow(0 64.81px 46.85px rgba(56,255,228,.167))',
  'drop-shadow(0 100px 80px rgba(56,255,228,.22))',
].join(' ')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface ProgressSWProps {
  /** 类目名, 默认「住房」 */
  label?: string
  /** 主数值, 默认 43540 */
  value?: number
}

export function ProgressSW({ label = '住房', value = 43540 }: ProgressSWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-swp relative h-full w-full select-none overflow-hidden rounded-[10px] bg-[#1d1d24] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 环形 62×62 @ (20.75%, 14.18%) */}
      <div className="absolute" style={{ left: '20.75%', top: '14.18%', width: '58.49%', aspectRatio: '1', containerType: 'size' }}>
        <svg viewBox="0 0 62 62" className="absolute inset-0 h-full w-full" fill="none">
          {/* 底弧 30.7°→241.8° */}
          <path d="M56.35 46.08 A 29.5 29.5 0 1 1 32.3 1.53" stroke="#05050e" strokeWidth="3" />
          {/* 进度弧 149.1°→96.3° */}
          <path
            d="M6.55 45.65 A 28.5 28.5 0 0 1 19.12 5.1"
            stroke="#15ffaa"
            strokeWidth="5"
            className="sr-swp-arc"
            style={{ filter: ARC_GLOW }}
          />
        </svg>
        {/* 中心图标 24×24 */}
        <div className="absolute" style={{ left: '30.65%', top: '30.65%', width: '38.71%', height: '38.71%' }}>
          <LwGlyph name="house_line" />
        </div>
      </div>

      {/* House @ y58.16% 居中 */}
      <span
        className="sr-swp-fade absolute inset-x-0 text-center text-white"
        style={{ top: '58.16%', fontSize: 'min(13.21cqw, 9.93cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.5s' }}
      >
        {label}
      </span>
      {/* 数值 @ y73.05% 居中 */}
      <span
        className="sr-swp-fade absolute inset-x-0 text-center font-bold text-white"
        style={{ top: '73.05%', fontSize: 'min(15.09cqw, 11.35cqh)', lineHeight: 1, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.65s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>

      <style>{`
        .sr-swp-fade { opacity: 0; animation: sr-swp-fadein .6s ease-out forwards; }
        @keyframes sr-swp-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-swp-arc {
          stroke-dasharray: 47.9;
          stroke-dashoffset: 47.9;
          animation: sr-swp-draw 1s cubic-bezier(.4,0,.2,1) .3s forwards;
        }
        @keyframes sr-swp-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .sr-swp-fade { animation: none !important; opacity: 1; }
          .sr-swp-arc { animation: none !important; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
