import { LwGlyph } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * IncomeXSW —— Pixso Widgets & Indicator 页 Income / XS widget
 * (节点 65:3864, 216×68, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-9 #1D1D24, radius 9.115
 *  - 图标盒: 44×44 @ (12,12), #040404 radius 12 + 6 层黑色投影, 金色下载图标 20×20 居中
 *  - 数值: "$27,632" Header/H7 Inter Bold 18/22, #FFF @ (69,15)
 *  - 标题: "Income" Inter Regular 12.76/14.58, Gray-2 #D0D0DA @ (69,42)
 *  - 省略号: 32×32 @ (179,2), Gray-5 横向三点
 */

/** 图标盒 6 层投影（DSL 实测值, 极淡黑色） */
const ICON_BOX_SHADOW = [
  '0 2.52px 2.02px rgba(0,0,0,.0056)',
  '0 6.06px 4.85px rgba(0,0,0,.0081)',
  '0 11.41px 9.13px rgba(0,0,0,.01)',
  '0 20.36px 16.29px rgba(0,0,0,.0119)',
  '0 38.08px 30.46px rgba(0,0,0,.0144)',
  '0 91.15px 72.92px rgba(0,0,0,.02)',
].join(',')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface IncomeXSWProps {
  title?: string
  /** 主数值, 默认 27632 */
  value?: number
}

export function IncomeXSW({ title = '收入', value = 27632 }: IncomeXSWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-xs relative h-full w-full select-none overflow-hidden rounded-[9.115px] bg-[#1d1d24] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 图标盒 44×44 @ (5.56%, 17.65%) */}
      <span
        className="sr-xs-pop absolute block rounded-[12px] bg-[#040404]"
        style={{
          left: '5.56%',
          top: '17.65%',
          width: '20.37%',
          height: '64.71%',
          boxShadow: ICON_BOX_SHADOW,
          containerType: 'size',
        }}
      >
        <span className="absolute" style={{ left: '27.27%', top: '27.27%', width: '45.45%', height: '45.45%' }}>
          <LwGlyph name="income" />
        </span>
      </span>
      {/* 数值 $27,632 @ (31.94%, 22.06%) */}
      <span
        className="sr-xs-fade absolute font-bold text-white"
        style={{ left: '31.94%', top: '22.06%', fontSize: 'min(8.33cqw, 26.47cqh)', lineHeight: 1.222, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.15s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      {/* 标题 Income @ (31.94%, 61.76%) */}
      <span
        className="sr-xs-fade absolute text-[#d0d0da]"
        style={{ left: '31.94%', top: '61.76%', fontSize: 'min(5.91cqw, 18.77cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      {/* 省略号 32×32 @ (82.87%, 2.94%) */}
      <span className="sr-xs-fade absolute" style={{ left: '82.87%', top: '2.94%', width: '14.81%', aspectRatio: '1', animationDelay: '0.5s' }}>
        <LwGlyph name="more_crypto" />
      </span>
      <style>{`
        .sr-xs-fade { opacity: 0; animation: sr-xs-fadein .6s ease-out forwards; }
        @keyframes sr-xs-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-xs-pop {
          transform: scale(0);
          animation: sr-xs-popin .5s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-xs-popin { to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-xs-fade { animation: none !important; opacity: 1; }
          .sr-xs-pop { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
