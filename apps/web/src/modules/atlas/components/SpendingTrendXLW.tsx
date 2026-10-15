import { LwGlyph, type LwIconName } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * SpendingTrendXLW —— Pixso Widgets & Indicator 页 Spending trend / XL widget
 * (节点 65:4019, 582×582, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-11 #000, radius 28, padding 36/30
 *  - 标题 "Spending trend": Header/H4 Inter SemiBold 28/34, Gray-1 #F5F5FF @ (30,36)
 *  - Graph area 522×208 @ (30,86): 5 条网格线 #1E1E24 @ y 0.5/46.5/92.5/138.5/184.5;
 *    13 根柱 20 宽间距 38 底对齐: 深灰 #2C2C35(1-2,13) / Persian blue #4807EA(3-5,9-12)
 *    / Frosty skies #06D7F6 + 青色辉光(6-8); 日期 5-17 @ (32,192), 9-16 青色其余蓝
 *  - Legend layout @ (30,328): Subtitle SemiBold 16/20 白标题 + Text 14/16 Gray-3 描述
 *    + 3 张 Category 卡（166×157, x 0/178/356）
 */

/** 13 根柱: [高度, 类型]（Columns 476×154 坐标系, 底对齐） */
const COLS: [number, 'dark' | 'blue' | 'cyan'][] = [
  [131, 'dark'], [58, 'dark'], [79, 'blue'], [119, 'blue'], [102, 'blue'],
  [139, 'cyan'], [154, 'cyan'], [139, 'cyan'],
  [75, 'blue'], [102, 'blue'], [119, 'blue'], [77, 'blue'], [79, 'dark'],
]

const COL_COLOR = { dark: '#2c2c35', blue: '#4807ea', cyan: '#06d7f6' } as const

/** 青柱辉光（DSL 实测 6 层 DROP_SHADOW, rgba(3,219,255,*)） */
const CYAN_GLOW = [
  '0 2.77px 2.21px rgba(3,219,255,.059)',
  '0 6.65px 5.32px rgba(3,219,255,.0848)',
  '0 12.52px 10.02px rgba(3,219,255,.105)',
  '0 22.34px 17.87px rgba(3,219,255,.1252)',
  '0 41.78px 33.42px rgba(3,219,255,.151)',
  '0 100px 80px rgba(3,219,255,.21)',
].join(',')

/** 日期: [文本, x, 是否青色]（Dates 468×16 坐标系实测） */
const DATES: [string, number, boolean][] = [
  ['5', 0, false], ['6', 38, false], ['7', 76, false], ['8', 112, false],
  ['9', 149, true], ['10', 182, true], ['11', 222, true], ['12', 262, true],
  ['13', 301, true], ['14', 339, true], ['15', 377, true], ['16', 415, true],
  ['17', 454, false],
]

/** 网格线 y（Graph area 208 坐标系） */
const GRIDLINES = [0.5, 46.5, 92.5, 138.5, 184.5]

interface CatCardProps {
  iconBg: string
  icon: LwIconName
  title: string
  value: number
  /** 在 Widgets 行的 x 偏移（0/178/356 → %） */
  xPct: number
}

/** Category 卡 166×157（实例自 65:3811, Gray-10 #0F0F13 r12, 图标盒 46×46 @ (18,18)） */
function CatCard({ iconBg, icon, title, value, xPct }: CatCardProps) {
  const count = useCountUp(value)
  return (
    <div
      className="absolute overflow-hidden bg-[#0f0f13]"
      style={{ left: `${xPct}%`, top: 0, width: '31.80%', height: '100%', borderRadius: 'min(7.23cqw, 7.64cqh)', containerType: 'size' }}
    >
      <span
        className="sr-stxl-pop absolute flex items-center justify-center"
        style={{ left: '10.84%', top: '11.46%', width: '27.71%', height: '29.30%', background: iconBg, borderRadius: 'min(7.23cqw, 7.64cqh)' }}
      >
        <span className="block" style={{ width: '52.17%', height: '52.17%' }}>
          <LwGlyph name={icon} />
        </span>
      </span>
      <span
        className="sr-stxl-fade absolute text-[#a9a9b6]"
        style={{ left: '10.84%', top: '59.24%', fontSize: 'min(8.43cqw, 8.92cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      <span
        className="sr-stxl-fade absolute font-bold text-white"
        style={{ left: '10.84%', top: '74.52%', fontSize: 'min(10.84cqw, 11.46cqh)', lineHeight: 1.222, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.4s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
    </div>
  )
}

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化: 柱数据与分类卡可注入
export interface TrendCategoryCard {
  iconBg: string
  icon: LwIconName
  title: string
  value: number
}

/** 底部分类卡默认数据（设计稿实测） */
const CAT_CARDS: TrendCategoryCard[] = [
  { iconBg: '#000000', icon: 'frame_cat', title: '餐饮', value: 4430 },
  { iconBg: '#f5f5f5', icon: 'apple', title: '订阅', value: 190 },
  { iconBg: '#000000', icon: 'coffee', title: '咖啡', value: 2401 },
]

export interface SpendingTrendXLWProps {
  /** 标题, 默认「消费趋势」 */
  title?: string
  /** 柱 [高度, 类型]（Columns 476×154 坐标系, 13 根） */
  columns?: [number, 'dark' | 'blue' | 'cyan'][]
  /** 日期标签 [文本, x, 是否青色]（Dates 468×16 坐标系） */
  dates?: [string, number, boolean][]
  /** 图例标题, 默认「月度支出分类」 */
  legendTitle?: string
  /** 图例描述, 默认「本月支出比上月增加 20%」 */
  legendDesc?: string
  /** 底部三张分类卡 */
  categories?: TrendCategoryCard[]
}

export function SpendingTrendXLW({
  title = '消费趋势',
  columns = COLS,
  dates = DATES,
  legendTitle = '月度支出分类',
  legendDesc = '本月支出比上月增加 20%',
  categories = CAT_CARDS,
}: SpendingTrendXLWProps = {}) {
  return (
    <div
      className="sr-stxl relative h-full w-full select-none overflow-hidden bg-black font-sans"
      style={{ containerType: 'size', borderRadius: 'min(4.81cqw, 4.81cqh)' }}
    >
      {/* 标题 Spending trend @ (5.15%, 6.19%) */}
      <span
        className="sr-stxl-fade absolute font-semibold text-[#f5f5ff]"
        style={{ left: '5.15%', top: '6.19%', fontSize: 'min(4.81cqw, 4.81cqh)', lineHeight: 1.214, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif' }}
      >
        {title}
      </span>

      {/* Graph area 522×208 @ (5.15%, 14.78%) */}
      <div className="absolute" style={{ left: '5.15%', top: '14.78%', width: '89.69%', height: '35.74%', containerType: 'size' }}>
        {/* 网格线 */}
        {GRIDLINES.map((y) => (
          <span key={y} className="sr-stxl-fade absolute bg-[#1e1e24]" style={{ left: 0, top: `${(y / 208) * 100}%`, width: '100%', height: '0.48cqh', animationDelay: '0.2s' }} />
        ))}
        {/* Columns 476×154 @ (4.98%, 14.42%) */}
        <div className="absolute" style={{ left: '4.98%', top: '14.42%', width: '91.19%', height: '74.04%', containerType: 'size' }}>
          {columns.map(([h, kind], i) => (
            <span
              key={i}
              className="sr-stxl-bar absolute bottom-0 block"
              style={{
                left: `${(i * 38 / 476) * 100}%`,
                width: '4.20%',
                height: `${(h / 154) * 100}%`,
                background: COL_COLOR[kind],
                boxShadow: kind === 'cyan' ? CYAN_GLOW : undefined,
                animationDelay: `${0.3 + i * 0.04}s`,
              }}
            />
          ))}
        </div>
        {/* Dates 468×16 @ (6.13%, 92.31%) */}
        <div className="absolute" style={{ left: '6.13%', top: '92.31%', width: '89.66%', height: '7.69%', containerType: 'size' }}>
          {dates.map(([d, x, cyan], i) => (
            <span
              key={d}
              className="sr-stxl-fade absolute"
              style={{
                left: `${(x / 468) * 100}%`,
                top: 0,
                color: cyan ? '#06d7f6' : '#4807ea',
                fontSize: 'min(2.56cqw, 75cqh)',
                lineHeight: 1.333,
                fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif',
                animationDelay: `${0.5 + i * 0.03}s`,
              }}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Legend 标题组 @ (5.15%, 56.36%) */}
      <span
        className="sr-stxl-fade absolute font-semibold text-white"
        style={{ left: '5.15%', top: '56.36%', fontSize: 'min(2.75cqw, 2.75cqh)', lineHeight: 1.25, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.2s' }}
      >
        {legendTitle}
      </span>
      <span
        className="sr-stxl-fade absolute text-[#a9a9b6]"
        style={{ left: '5.15%', top: '61.17%', fontSize: 'min(2.41cqw, 2.41cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {legendDesc}
      </span>

      {/* Widgets 行 522×157 @ (5.15%, 66.84%) */}
      <div className="absolute" style={{ left: '5.15%', top: '66.84%', width: '89.69%', height: '26.98%', containerType: 'size' }}>
        {categories.map((c, i) => (
          <CatCard key={c.title} {...c} xPct={i * 34.1} />
        ))}
      </div>

      <style>{`
        .sr-stxl-fade { opacity: 0; animation: sr-stxl-fadein .6s ease-out forwards; }
        @keyframes sr-stxl-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-stxl-pop {
          transform: scale(0);
          animation: sr-stxl-popin .5s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-stxl-popin { to { transform: scale(1); } }
        .sr-stxl-bar {
          transform: scaleY(0);
          transform-origin: bottom;
          animation: sr-stxl-grow .6s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes sr-stxl-grow { to { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-stxl-fade { animation: none !important; opacity: 1; }
          .sr-stxl-pop  { animation: none !important; transform: none; }
          .sr-stxl-bar  { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
