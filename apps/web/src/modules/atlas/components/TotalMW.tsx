import { useCountUp } from './use-count-up'

/**
 * TotalMW —— Pixso Widgets & Indicator 页 Total / M widget
 * (节点 65:3780, 197×214, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-11 #000, radius 10, padding 24/18
 *  - 环形 80×80 @ (58,30)（图表区 161×91 内居中偏上）, stroke 6 (r=37):
 *    底环 #242424 整圈; 主弧 Frosty skies #06D7F6 270° 起 263.4° + 蓝辉光;
 *    次弧 Amethyst #A162F7 193.1° 起 58.6°
 *  - 中心 "27%": Header/H6 Inter SemiBold 20/18 #FFF
 *  - 标题 "Last Year": Text Inter Regular 14/16 #FFF @ (18,146)
 *  - 数值行 @ (18,172): "$98,120" Inter SemiBold 20/18 #FFF
 *    + "+2.5%" Inter SemiBold 14/16 #37FCB5 右对齐
 */

/** 主弧辉光（DSL 实测 6 层蓝） */
const ARC_GLOW = [
  'drop-shadow(0 2.77px 2.21px rgba(11,83,244,.065))',
  'drop-shadow(0 6.65px 5.32px rgba(11,83,244,.093))',
  'drop-shadow(0 12.52px 10.02px rgba(11,83,244,.115))',
  'drop-shadow(0 22.34px 17.87px rgba(11,83,244,.137))',
  'drop-shadow(0 41.78px 33.42px rgba(11,83,244,.165))',
  'drop-shadow(0 100px 80px rgba(11,83,244,.23))',
].join(' ')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface TotalMWProps {
  title?: string
  value?: number
  /** 涨幅文本, 默认 '+2.5%' */
  trend?: string
  /** 环形中心百分比, 默认 27 */
  percent?: number
}

export function TotalMW({ title = '去年', value = 98120, trend = '+2.5%', percent = 27 }: TotalMWProps = {}) {
  const count = useCountUp(value)
  const pct = useCountUp(percent, 1200, 600)
  return (
    <div
      className="sr-mwt2 relative h-full w-full select-none overflow-hidden rounded-[10px] bg-black font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 环形 80×80: 图表区 161×91 @ (18,24) 内 x=40,y=6 → 卡内 (29.44%, 11.21%+), 宽 40.61% */}
      <div
        className="absolute"
        style={{
          left: '29.44%',
          top: '14.02%',
          width: '40.61%',
          aspectRatio: '1',
          containerType: 'size',
        }}
      >
        <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" fill="none">
          <circle cx="40" cy="40" r="37" stroke="#242424" strokeWidth="6" />
          {/* 主弧 cyan 270°→263.4° */}
          <path
            d="M40 3 A 37 37 0 1 1 3.24 44.21"
            stroke="#06d7f6"
            strokeWidth="6"
            className="sr-mwt2-arc-main"
            style={{ filter: ARC_GLOW }}
          />
          {/* 次弧 amethyst 193.1°→58.6° */}
          <path
            d="M3.97 31.6 A 37 37 0 0 1 28.4 4.87"
            stroke="#a162f7"
            strokeWidth="6"
            className="sr-mwt2-arc-sub"
          />
        </svg>
        <span
          className="sr-mwt2-fade absolute inset-0 flex items-center justify-center font-semibold text-white"
          style={{ fontSize: '25cqw', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '1.0s' }}
        >
          {pct}%
        </span>
      </div>

      {/* 标题 @ (9.14%, 68.22%) */}
      <span
        className="sr-mwt2-fade absolute text-white"
        style={{ left: '9.14%', top: '68.22%', fontSize: 'min(7.11cqw, 6.54cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      {/* 数值行 @ (9.14%, 80.37%) */}
      <span
        className="sr-mwt2-fade absolute font-semibold text-white"
        style={{ left: '9.14%', top: '80.37%', fontSize: 'min(10.15cqw, 9.35cqh)', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.4s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      <span
        className="sr-mwt2-fade absolute right-[9.14%] font-semibold text-[#37fcb5]"
        style={{ top: '81.78%', fontSize: 'min(7.11cqw, 6.54cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.5s' }}
      >
        {trend}
      </span>

      <style>{`
        .sr-mwt2-fade { opacity: 0; animation: sr-mwt2-fadein .6s ease-out forwards; }
        @keyframes sr-mwt2-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-mwt2-arc-main {
          stroke-dasharray: 170.14;
          stroke-dashoffset: 170.14;
          animation: sr-mwt2-main 1.3s cubic-bezier(.4,0,.2,1) .35s forwards;
        }
        @keyframes sr-mwt2-main { to { stroke-dashoffset: 0; } }
        .sr-mwt2-arc-sub {
          stroke-dasharray: 37.85;
          stroke-dashoffset: 37.85;
          animation: sr-mwt2-sub .5s cubic-bezier(.4,0,.2,1) 1.45s forwards;
        }
        @keyframes sr-mwt2-sub { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .sr-mwt2-fade { animation: none !important; opacity: 1; }
          .sr-mwt2-arc-main, .sr-mwt2-arc-sub { animation: none !important; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
