import { LwGlyph } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * CryptoLW —— Pixso Widgets & Indicator 页 Crypto / L widget
 * (节点 65:3658, 216×310, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-10 #0F0F13, radius 16, padding 24/28
 *  - 日期 "05.01.2020": Description Inter Regular 12/16, Gray-5 #70707C @ (28,32.5)
 *  - More: 32×32 @ (156,24), 横向三点 #70707C
 *  - 数值 "$32,430": Header/H4 Inter SemiBold 28/34, #FFF @ (28,113)
 *  - 明细 @ y159: 左 "32 ETH" Inter Bold 16/16 Gray-3 #A9A9B6; 右 "+4.5%" Inter SemiBold 14/16 #37FCB5
 *  - 图标盒 79×79 #000 radius 21.5 + 6 层投影 @ (28,207), 内嵌金色下载图标 35.9×35.9
 *  - 文本列 @ (123,248): "ETH" Inter SemiBold 14/20 #F5F5FF / "Etherium" Inter Regular 14/16 #70707C
 */

/** 图标盒 6 层投影（DSL 实测） */
const ICON_BOX_SHADOW = [
  '0 4.53px 3.62px rgba(0,0,0,.0056)',
  '0 10.88px 8.71px rgba(0,0,0,.0081)',
  '0 20.49px 16.39px rgba(0,0,0,.01)',
  '0 36.56px 29.24px rgba(0,0,0,.0119)',
  '0 68.37px 54.70px rgba(0,0,0,.0144)',
  '0 163.66px 130.93px rgba(0,0,0,.02)',
].join(',')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface CryptoLWProps {
  /** 日期标签, 默认 '05.01.2020' */
  date?: string
  /** 主数值（入场滚动计数）, 默认 32430 */
  value?: number
  /** 持仓数量文本, 默认 '32 ETH' */
  amount?: string
  /** 涨幅文本, 默认 '+4.5%' */
  trend?: string
  /** 币种符号, 默认 'ETH' */
  symbol?: string
  /** 币种中文名, 默认「以太坊」 */
  name?: string
}

export function CryptoLW({
  date = '05.01.2020',
  value = 32430,
  amount = '32 ETH',
  trend = '+4.5%',
  symbol = 'ETH',
  name = '以太坊',
}: CryptoLWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-lwc2 relative h-full w-full select-none overflow-hidden rounded-[16px] bg-[#0f0f13] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 日期 @ (12.96%, 10.48%) */}
      <span
        className="sr-lwc2-fade absolute text-[#70707c]"
        style={{ left: '12.96%', top: '10.48%', fontSize: 'min(5.56cqw, 3.87cqh)', lineHeight: 1.333, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.1s' }}
      >
        {date}
      </span>
      {/* More 32×32 @ (72.22%, 7.74%) */}
      <div
        className="sr-lwc2-fade absolute"
        style={{ left: '72.22%', top: '7.74%', width: 'min(14.81cqw, 10.32cqh)', height: 'min(14.81cqw, 10.32cqh)', animationDelay: '0.2s' }}
      >
        <LwGlyph name="more_crypto" />
      </div>

      {/* 数值 @ (12.96%, 36.45%) */}
      <span
        className="sr-lwc2-fade absolute font-semibold text-white"
        style={{ left: '12.96%', top: '36.45%', fontSize: 'min(12.96cqw, 9.03cqh)', lineHeight: 1.214, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      {/* 明细行 @ y51.29% */}
      <span
        className="sr-lwc2-fade absolute font-bold text-[#a9a9b6]"
        style={{ left: '12.96%', top: '51.29%', fontSize: 'min(7.41cqw, 5.16cqh)', lineHeight: 1, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.4s' }}
      >
        {amount}
      </span>
      <span
        className="sr-lwc2-fade absolute font-semibold text-[#37fcb5]"
        style={{ left: '66.67%', top: '51.94%', fontSize: 'min(6.48cqw, 4.52cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.45s' }}
      >
        {trend}
      </span>

      {/* 图标盒 79×79 @ (12.96%, 66.77%) */}
      <div
        className="sr-lwc2-fade absolute flex items-center justify-center bg-black"
        style={{
          left: '12.96%',
          top: '66.77%',
          width: '36.57%',
          height: '25.48%',
          borderRadius: 'min(9.98cqw, 6.95cqh)',
          boxShadow: ICON_BOX_SHADOW,
          animationDelay: '0.55s',
        }}
      >
        <div style={{ width: 'min(16.62cqw, 11.58cqh)', height: 'min(16.62cqw, 11.58cqh)' }}>
          <LwGlyph name="crypto_big" />
        </div>
      </div>
      {/* 文本列 @ (56.94%, 80%) */}
      <div className="absolute flex flex-col" style={{ left: '56.94%', top: '80%', gap: '0.65cqh' }}>
        <span
          className="sr-lwc2-fade font-semibold text-[#f5f5ff]"
          style={{ fontSize: 'min(6.48cqw, 4.52cqh)', lineHeight: 1.43, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.65s' }}
        >
          {symbol}
        </span>
        <span
          className="sr-lwc2-fade text-[#70707c]"
          style={{ fontSize: 'min(6.48cqw, 4.52cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.75s' }}
        >
          {name}
        </span>
      </div>

      <style>{`
        .sr-lwc2-fade { opacity: 0; animation: sr-lwc2-fadein .6s ease-out forwards; }
        @keyframes sr-lwc2-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sr-lwc2-fade { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
