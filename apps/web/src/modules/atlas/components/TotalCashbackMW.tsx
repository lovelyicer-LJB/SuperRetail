import { MCardShell } from './mw-shared'
import { LwGlyph, type LwIconName } from './lw-shared'

/**
 * TotalCashbackMW —— Pixso Widgets & Indicator 页 Total cashback / M widget
 * (节点 65:3712, 182×220, Dark Theme)
 *
 * 图表区（142×53 @ (20,143), DSL 实测）:
 *  - 三个 32×32 类目圆形图标横向交叠（间距 26）:
 *    Gamepad 底 Gray-7 #40404A / House 底 #FD4438 / Car 底 Persian blue #4807EA
 *  - 进度条 142×6 @ y47: 轨道 #0F0F13, 进度 109/142 (76.8%)
 *    Frosty skies #06D7F6 + 6 层青色辉光 rgba(46,249,255,…)
 * 趋势 "+5.4%": Sea green #15FFAA
 */

const CATEGORIES: [LwIconName, string][] = [
  ['gamepad', '#40404a'],
  ['house', '#fd4438'],
  ['car', '#4807ea'],
]

const PROGRESS = 109 / 142

const BAR_GLOW = [
  '0 2.77px 2.21px rgba(46,249,255,.053)',
  '0 6.65px 5.32px rgba(46,249,255,.077)',
  '0 12.52px 10.02px rgba(46,249,255,.095)',
  '0 22.34px 17.87px rgba(46,249,255,.113)',
  '0 41.78px 33.42px rgba(46,249,255,.137)',
  '0 100px 80px rgba(46,249,255,.19)',
].join(',')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface TotalCashbackMWProps {
  title?: string
  value?: number
  trend?: string
  /** 类目图标组 [icon, 底色] */
  categories?: [LwIconName, string][]
  /** 进度 0~1, 默认 109/142 */
  progress?: number
}

export function TotalCashbackMW({ title = '累计返现', value = 1531, trend = '+5.4%', categories = CATEGORIES, progress = PROGRESS }: TotalCashbackMWProps = {}) {
  return (
    <MCardShell title={title} value={value} trend={trend} trendColor="#15ffaa">
      {/* 图表区 142×53 @ (10.99%, 65%) */}
      <div
        className="absolute"
        style={{ left: '10.99%', top: '65%', width: '78.02%', height: '24.09%', containerType: 'size' }}
      >
        {/* 类目图标组 84×32, 水平居中 */}
        <div className="absolute left-1/2 top-0" style={{ width: '59.15%', height: '60.38%', transform: 'translateX(-50%)' }}>
          {categories.map(([icon, bg], i) => (
            <span
              key={icon}
              className="sr-mwt-icon absolute top-0 flex items-center justify-center rounded-full"
              style={{
                left: `${(i * 26 / 84) * 100}%`,
                width: '38.1%',
                aspectRatio: '1',
                background: bg,
                animationDelay: `${0.5 + i * 0.12}s`,
              }}
            >
              <span className="block" style={{ width: '50%', height: '50%' }}>
                <LwGlyph name={icon} />
              </span>
            </span>
          ))}
        </div>

        {/* 进度条 142×6 @ y47 */}
        <div
          className="absolute w-full overflow-hidden rounded-full bg-[#0f0f13]"
          style={{ top: '88.68%', height: '11.32%' }}
        >
          <span
            className="sr-mwt-bar absolute left-0 top-0 block h-full rounded-full bg-[#06d7f6]"
            style={{ width: `${progress * 100}%`, boxShadow: BAR_GLOW }}
          />
        </div>

        <style>{`
          .sr-mwt-icon {
            transform: scale(0);
            animation: sr-mwt-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;
          }
          @keyframes sr-mwt-pop { to { transform: scale(1); } }
          .sr-mwt-bar {
            clip-path: inset(0 100% 0 0);
            animation: sr-mwt-fill 1.1s cubic-bezier(.4,0,.2,1) .75s forwards;
          }
          @keyframes sr-mwt-fill { to { clip-path: inset(0 0 0 0); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-mwt-icon { animation: none !important; transform: none; }
            .sr-mwt-bar { animation: none !important; clip-path: none; }
          }
        `}</style>
      </div>
    </MCardShell>
  )
}
