import { LwGlyph, type LwIconName } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * OverallBalanceXLW —— Pixso Widgets & Indicator 页 Overall balance / XL widget
 * (节点 65:3880, 1162×308, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-11 #000, radius 20, padding 28
 *  - 标题 "Overall balance": Header/H5 Inter Medium 24/30 ls 0.11%, Gray-0 #FFF @ (19,29)
 *  - 按钮: Forecast 98×32 @ (635,28) / Last Month 137×32 @ (749,28), Ghost r6,
 *    标签 Mini-button label Inter Bold 14/20 Gray-1 #F5F5FF, 下拉 chevron #0062FF
 *  - 图表区 836×202 @ (34.5,77): 5 行网格（15k/10k/5k/1k/0, Description 12/16 Gray-5
 *    #70707C + 806×1 灰线 #1D1D24）; Columns 766×171 @ (48,31), 22 组堆叠柱
 *    （间距 36, 宽 10, 底对齐 148）: 上段 Persian blue #4807EA, 下段 Frosty skies
 *    #06D7F6 + 青色辉光 6 层投影; 日期 1-22 Description 12/16 Gray-1 #F5F5FF
 *  - 右侧 Legend 233×252 @ (901,28): 3 张 Income 2 XS 变体卡（233×74, 间距 15）
 */

/** 22 根柱: [总高, 蓝段高, 青段高]（Columns 766×171 坐标系, 底对齐 y=148） */
const COLS: [number, number, number][] = [
  [71, 55, 12], [112, 96, 12], [126, 96, 26], [94, 46, 44], [112, 96, 12],
  [122, 96, 22], [144, 96, 44], [144, 96, 44], [165, 96, 65], [165, 96, 65],
  [132, 46, 82], [166, 55, 107], [146, 60, 82], [144, 96, 44], [122, 96, 22],
  [112, 96, 12], [108, 60, 44], [126, 96, 26], [112, 96, 12], [144, 96, 44],
  [164, 55, 105], [144, 96, 44],
]

/** Y 轴标签行（chart 836×202 坐标系 y） */
const AXIS: [string, number][] = [
  ['15k', 0], ['10k', 44], ['5k', 88], ['1k', 132], ['0', 176],
]

/** 青段辉光（DSL 实测 6 层 DROP_SHADOW, rgba(0,255,233,*)） */
const CYAN_GLOW = [
  '0 2.77px 2.21px rgba(0,255,233,.0506)',
  '0 6.65px 5.32px rgba(0,255,233,.0727)',
  '0 12.52px 10.02px rgba(0,255,233,.09)',
  '0 22.34px 17.87px rgba(0,255,233,.1073)',
  '0 41.78px 33.42px rgba(0,255,233,.1294)',
  '0 100px 80px rgba(0,255,233,.18)',
].join(',')

/** 图例卡图标盒投影（同 Income 2 XS, DSL 实测） */
const ICON_BOX_SHADOW = [
  '0 2.77px 2.21px rgba(0,0,0,.0056)',
  '0 6.65px 5.32px rgba(0,0,0,.0081)',
  '0 12.52px 10.02px rgba(0,0,0,.01)',
  '0 22.34px 17.87px rgba(0,0,0,.0119)',
  '0 41.78px 33.42px rgba(0,0,0,.0144)',
  '0 100px 80px rgba(0,0,0,.02)',
].join(',')

interface LegendRowProps {
  iconBg: string
  icon: LwIconName
  title: string
  value: number
  trend?: string
  trendColor?: string
  delay?: number
}

/** Legend 图例卡 —— Income 2 / XS widget 实例变体（233×74, Gray-10 #0F0F13 r10） */
function LegendRow({ iconBg, icon, title, value, trend, trendColor, delay = 0 }: LegendRowProps) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-obxl-leg absolute overflow-hidden bg-[#0f0f13] font-sans"
      style={{ left: 0, width: '100%', height: '29.37%', borderRadius: 'min(4.29cqw, 13.51cqh)', containerType: 'size', top: `${delay * 35.32}%` }}
    >
      {/* 图标盒 40×40 @ (17,17) */}
      <span
        className="sr-obxl-pop absolute block"
        style={{
          left: '7.30%', top: '22.97%', width: '17.17%', height: '54.05%',
          background: iconBg, borderRadius: 'min(3.43cqw, 10.81cqh)', boxShadow: ICON_BOX_SHADOW, containerType: 'size',
        }}
      >
        <span className="absolute" style={{ left: '20%', top: '20%', width: '60%', height: '60%' }}>
          <LwGlyph name={icon} />
        </span>
      </span>
      <span
        className="sr-obxl-fade absolute text-[#d0d0da]"
        style={{ left: '30.90%', top: '24.32%', fontSize: 'min(6.01cqw, 18.92cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      <span
        className="sr-obxl-fade absolute font-bold text-white"
        style={{ left: '30.90%', top: '54.05%', fontSize: 'min(6.87cqw, 21.62cqh)', lineHeight: 1, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.15s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      {trend && (
        <span
          className="sr-obxl-fade absolute font-semibold"
          style={{ left: '68.67%', top: '55.41%', color: trendColor, fontSize: 'min(6.01cqw, 18.92cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.45s' }}
        >
          {trend}
        </span>
      )}
      <span className="sr-obxl-fade absolute" style={{ left: '82.83%', top: '10.81%', width: '13.73%', aspectRatio: '1', animationDelay: '0.5s' }}>
        <LwGlyph name="more_crypto" />
      </span>
    </div>
  )
}

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化: 图例卡与柱数据可注入
export interface BalanceLegendRow {
  iconBg: string
  icon: LwIconName
  title: string
  value: number
  trend?: string
  trendColor?: string
}

/** 右侧图例卡默认数据（设计稿实测） */
const LEGENDS: BalanceLegendRow[] = [
  { iconBg: '#15ffaa', icon: 'download_black', title: '收入', value: 27632, trend: '+¥542', trendColor: '#15ffaa' },
  { iconBg: '#0062ff', icon: 'moneyhand', title: '支出', value: 18461, trend: '-¥242', trendColor: '#8a8a98' },
  { iconBg: '#70707c', icon: 'moneyexchange', title: '返现', value: 1341 },
]

export interface OverallBalanceXLWProps {
  /** 标题, 默认「总余额」 */
  title?: string
  /** 左侧按钮文本, 默认「预测」 */
  forecastLabel?: string
  /** 周期按钮文本, 默认「上个月」 */
  periodLabel?: string
  /** 堆叠柱 [总高, 蓝段高, 青段高]（Columns 766×171 坐标系, 22 组） */
  columns?: [number, number, number][]
  /** Y 轴标签 [文本, y]（chart 836×202 坐标系） */
  axisLabels?: [string, number][]
  /** 右侧图例卡 */
  legends?: BalanceLegendRow[]
}

export function OverallBalanceXLW({
  title = '总余额',
  forecastLabel = '预测',
  periodLabel = '上个月',
  columns = COLS,
  axisLabels = AXIS,
  legends = LEGENDS,
}: OverallBalanceXLWProps = {}) {
  return (
    <div
      className="sr-obxl relative h-full w-full select-none overflow-hidden bg-black font-sans"
      style={{ containerType: 'size', borderRadius: 'min(1.72cqw, 6.49cqh)' }}
    >
      {/* 标题 Overall balance @ (1.64%, 9.42%) */}
      <span
        className="sr-obxl-fade absolute font-medium text-white"
        style={{ left: '1.64%', top: '9.42%', fontSize: 'min(2.07cqw, 7.79cqh)', lineHeight: 1.25, letterSpacing: '0.0011em', fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif' }}
      >
        {title}
      </span>
      {/* Forecast 按钮 98×32 @ (54.65%, 9.09%) */}
      <span
        className="sr-obxl-fade absolute flex items-center justify-center font-bold text-[#f5f5ff]"
        style={{
          left: '54.65%', top: '9.09%', width: '8.43%', height: '10.39%',
          borderRadius: 'min(0.52cqw, 1.95cqh)', fontSize: 'min(1.20cqw, 4.55cqh)', lineHeight: 1.429, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.1s',
        }}
      >
        {forecastLabel}
      </span>
      {/* Last Month 按钮 137×32 @ (64.46%, 9.09%), 标签左 20 + chevron 18×18 @ 103,7 */}
      <span
        className="sr-obxl-fade absolute flex items-center font-bold text-[#f5f5ff]"
        style={{
          left: '64.46%', top: '9.09%', width: '11.79%', height: '10.39%',
          borderRadius: 'min(0.52cqw, 1.95cqh)', fontSize: 'min(1.20cqw, 4.55cqh)', lineHeight: 1.429, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif',
          paddingLeft: '1.72%', animationDelay: '0.15s', containerType: 'size',
        }}
      >
        {periodLabel}
        <svg viewBox="0 0 18 18" className="absolute block" style={{ left: '75.18%', top: '21.88%', width: '13.14%', height: '56.25%' }} fill="none" aria-hidden>
          <path d="M4.5 7.5L9 12L13.5 7.5" stroke="#0062ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {/* 图表区 836×202 @ (2.97%, 25%) */}
      <div className="absolute" style={{ left: '2.97%', top: '25%', width: '71.94%', height: '65.58%', containerType: 'size' }}>
        {/* Y 轴标签 + 网格线 */}
        {axisLabels.map(([label, y]) => (
          <div key={label} className="absolute" style={{ left: 0, top: `${(y / 202) * 100}%`, width: '100%', height: '7.92%' }}>
            <span
              className="sr-obxl-fade absolute text-[#70707c]"
              style={{ left: 0, top: 0, fontSize: 'min(1.44cqw, 5.94cqh)', lineHeight: 1.333, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
            >
              {label}
            </span>
            <span className="absolute bg-[#1d1d24]" style={{ left: '3.59%', top: '50%', width: '96.41%', height: '0.5cqh' }} />
          </div>
        ))}
        {/* Columns 766×171 @ (5.74%, 15.35%) */}
        <div className="absolute" style={{ left: '5.74%', top: '15.35%', width: '91.63%', height: '84.65%', containerType: 'size' }}>
          {columns.map(([total, topH, botH], i) => (
            <div key={i} className="absolute" style={{ left: `${(i * 36 / 766) * 100}%`, width: '1.305%', top: 0, height: '100%' }}>
              {/* 柱体: 底对齐 148/171 → bottom 13.45% */}
              <div
                className="sr-obxl-bar absolute flex flex-col"
                style={{ left: 0, width: '100%', bottom: '13.45%', height: `${(total / 171) * 100}%`, animationDelay: `${0.35 + i * 0.03}s` }}
              >
                <span
                  className="block w-full bg-[#4807ea]"
                  style={{ height: `${(topH / total) * 100}%`, borderRadius: 'min(0.26cqw, 1.17cqh)' }}
                />
                <span className="block w-full" style={{ height: `${(4 / total) * 100}%` }} />
                <span
                  className="block w-full bg-[#06d7f6]"
                  style={{ height: `${(botH / total) * 100}%`, borderRadius: 'min(0.26cqw, 1.17cqh)', boxShadow: CYAN_GLOW }}
                />
              </div>
              {/* 日期标签, 居中于柱 */}
              <span
                className="sr-obxl-fade absolute text-center text-[#f5f5ff]"
                style={{
                  left: `${(-3 / 10) * 100}%`, width: '160%', top: '91.81%', fontSize: 'min(1.57cqw, 7.02cqh)',
                  lineHeight: 1.333, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: `${0.5 + i * 0.03}s`,
                }}
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧 Legend 233×252 @ (77.54%, 9.09%) */}
      <div className="absolute" style={{ left: '77.54%', top: '9.09%', width: '20.05%', height: '81.82%', containerType: 'size' }}>
        {legends.map((row, i) => (
          <LegendRow key={row.title} {...row} delay={i} />
        ))}
      </div>

      <style>{`
        .sr-obxl-fade { opacity: 0; animation: sr-obxl-fadein .6s ease-out forwards; }
        @keyframes sr-obxl-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-obxl-pop {
          transform: scale(0);
          animation: sr-obxl-popin .5s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-obxl-popin { to { transform: scale(1); } }
        .sr-obxl-bar {
          transform: scaleY(0);
          transform-origin: bottom;
          animation: sr-obxl-grow .6s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes sr-obxl-grow { to { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-obxl-fade { animation: none !important; opacity: 1; }
          .sr-obxl-pop  { animation: none !important; transform: none; }
          .sr-obxl-bar  { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
