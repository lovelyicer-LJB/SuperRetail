import { LwGlyph } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * PortfolioMW —— Pixso Widgets & Indicator 页 Portfolio / M widget
 * (节点 65:3675, 184×220, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-10 #0F0F13, radius 12
 *  - 图标盒 44×44 #000 radius 12 + 6 层投影 @ (22,23), 内嵌金色圆钻图标 20×20
 *  - 标题 "Portfolio": Text Inter Regular 14/16, #FFF @ (20,84)
 *  - 数值 "$34,394": Header/H6 Inter SemiBold 20/18, #FFF @ (20,110)
 *  - 明细 @ (20,181): "+4.5%" Inter SemiBold 14/16 #37FCB5 · 3×3 圆点 #F5F5FF · "$3,440" #70707C
 */

/** 图标盒 6 层投影（DSL 实测） */
const ICON_BOX_SHADOW = [
  '0 2.52px 2.02px rgba(0,0,0,.0056)',
  '0 6.06px 4.85px rgba(0,0,0,.0081)',
  '0 11.41px 9.13px rgba(0,0,0,.01)',
  '0 20.36px 16.29px rgba(0,0,0,.0119)',
  '0 38.08px 30.46px rgba(0,0,0,.0144)',
  '0 91.15px 72.92px rgba(0,0,0,.02)',
].join(',')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface PortfolioMWProps {
  title?: string
  /** 主数值, 默认 34394 */
  value?: number
  /** 涨幅文本, 默认 '+4.5%' */
  trend?: string
  /** 涨幅对应金额文本, 默认 '¥3,440' */
  trendValue?: string
}

export function PortfolioMW({ title = '投资组合', value = 34394, trend = '+4.5%', trendValue = '¥3,440' }: PortfolioMWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-mwp relative h-full w-full select-none overflow-hidden rounded-[12px] bg-[#0f0f13] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 图标盒 @ (11.96%, 10.45%) */}
      <div
        className="sr-mwp-fade absolute flex items-center justify-center bg-black"
        style={{
          left: '11.96%',
          top: '10.45%',
          width: '23.91%',
          height: '20%',
          borderRadius: 'min(6.52cqw, 5.45cqh)',
          boxShadow: ICON_BOX_SHADOW,
          animationDelay: '0.05s',
        }}
      >
        <div style={{ width: 'min(10.87cqw, 9.09cqh)', height: 'min(10.87cqw, 9.09cqh)' }}>
          <LwGlyph name="portfolio" />
        </div>
      </div>

      {/* 标题 @ (10.87%, 38.18%) */}
      <span
        className="sr-mwp-fade absolute text-white"
        style={{ left: '10.87%', top: '38.18%', fontSize: 'min(7.61cqw, 6.36cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.2s' }}
      >
        {title}
      </span>
      {/* 数值 @ (10.87%, 50%) */}
      <span
        className="sr-mwp-fade absolute font-semibold text-white"
        style={{ left: '10.87%', top: '50%', fontSize: 'min(10.87cqw, 9.09cqh)', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>

      {/* 明细行 @ (10.87%, 82.27%) */}
      <div className="absolute flex items-center" style={{ left: '10.87%', top: '82.27%', gap: '6.52cqw' }}>
        <span
          className="sr-mwp-fade font-semibold text-[#37fcb5]"
          style={{ fontSize: 'min(7.61cqw, 6.36cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.45s' }}
        >
          {trend}
        </span>
        <span
          className="sr-mwp-fade block rounded-full bg-[#f5f5ff]"
          style={{ width: 'min(1.63cqw, 1.36cqh)', height: 'min(1.63cqw, 1.36cqh)', animationDelay: '0.55s' }}
        />
        <span
          className="sr-mwp-fade font-semibold text-[#70707c]"
          style={{ fontSize: 'min(7.61cqw, 6.36cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.6s' }}
        >
          {trendValue}
        </span>
      </div>

      <style>{`
        .sr-mwp-fade { opacity: 0; animation: sr-mwp-fadein .6s ease-out forwards; }
        @keyframes sr-mwp-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sr-mwp-fade { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
