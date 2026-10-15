import { LwGlyph } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * Income2XSW —— Pixso Widgets & Indicator 页 Income 2 / XS widget
 * (节点 65:3855, 238×74, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-9 #1D1D24, radius 10
 *  - 图标盒: 40×40 @ (17,17), #37FCB5 radius 8 + 6 层黑色投影, 黑色下载图标 24×24 居中
 *  - 标题: "Income" Text Inter Regular 14/16, Gray-2 #D0D0DA @ (72,18)
 *  - 数值: "$27,632" Inter Bold 16/16, #FFF @ (72,40)
 *  - 涨幅: "+$542" Inter SemiBold 14/16, #37FCB5, 右对齐右缘 17 @ y41
 *  - 省略号: 32×32 @ (198,8), Gray-5 横向三点
 */

/** 图标盒 6 层投影（DSL 实测值, 极淡黑色） */
const ICON_BOX_SHADOW = [
  '0 2.77px 2.21px rgba(0,0,0,.0056)',
  '0 6.65px 5.32px rgba(0,0,0,.0081)',
  '0 12.52px 10.02px rgba(0,0,0,.01)',
  '0 22.34px 17.87px rgba(0,0,0,.0119)',
  '0 41.78px 33.42px rgba(0,0,0,.0144)',
  '0 100px 80px rgba(0,0,0,.02)',
].join(',')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface Income2XSWProps {
  title?: string
  /** 主数值, 默认 27632 */
  value?: number
  /** 涨幅金额文本, 默认 '+¥542' */
  delta?: string
}

export function Income2XSW({ title = '收入', value = 27632, delta = '+¥542' }: Income2XSWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-x2 relative h-full w-full select-none overflow-hidden rounded-[10px] bg-[#1d1d24] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 图标盒 40×40 @ (7.14%, 22.97%) */}
      <span
        className="sr-x2-pop absolute block rounded-[8px] bg-[#37fcb5]"
        style={{
          left: '7.14%',
          top: '22.97%',
          width: '16.81%',
          height: '54.05%',
          boxShadow: ICON_BOX_SHADOW,
          containerType: 'size',
        }}
      >
        <span className="absolute" style={{ left: '20%', top: '20%', width: '60%', height: '60%' }}>
          <LwGlyph name="download_black" />
        </span>
      </span>
      {/* 标题 Income @ (30.25%, 24.32%) */}
      <span
        className="sr-x2-fade absolute text-[#d0d0da]"
        style={{ left: '30.25%', top: '24.32%', fontSize: 'min(5.88cqw, 18.92cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      {/* 数值 $27,632 @ (30.25%, 54.05%) */}
      <span
        className="sr-x2-fade absolute font-bold text-white"
        style={{ left: '30.25%', top: '54.05%', fontSize: 'min(6.72cqw, 21.62cqh)', lineHeight: 1, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.15s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      {/* 涨幅金额, 右缘 7.14%, y 55.41% */}
      <span
        className="sr-x2-fade absolute font-semibold text-[#37fcb5]"
        style={{ right: '7.14%', top: '55.41%', fontSize: 'min(5.88cqw, 18.92cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.45s' }}
      >
        {delta}
      </span>
      {/* 省略号 32×32 @ (83.19%, 10.81%) */}
      <span className="sr-x2-fade absolute" style={{ left: '83.19%', top: '10.81%', width: '13.45%', aspectRatio: '1', animationDelay: '0.5s' }}>
        <LwGlyph name="more_crypto" />
      </span>
      <style>{`
        .sr-x2-fade { opacity: 0; animation: sr-x2-fadein .6s ease-out forwards; }
        @keyframes sr-x2-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-x2-pop {
          transform: scale(0);
          animation: sr-x2-popin .5s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-x2-popin { to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-x2-fade { animation: none !important; opacity: 1; }
          .sr-x2-pop { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
