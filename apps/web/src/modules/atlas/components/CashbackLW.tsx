import { LCardShell, LwGlyph, type LwIconName } from './lw-shared'

/**
 * CashbackLW —— Pixso Widgets & Indicator 页 Cashback widget / L widget
 * (节点 65:3595, 188×254, Dark Theme)
 *
 * 图表区（160×53 @ y173, DSL 实测）:
 *  - 三个 32×32 类目圆形图标横向交叠（间距 26, 重叠 6）:
 *    Gamepad 底 Gray-7 #40404A / House 底 Alizarin red #FD4438 / Car 底 Blue #323EFF,
 *    图标 16×16 白色居中
 *  - 进度条 160×6 @ y47: 轨道 Gray-10 #0F0F13, 进度 123/160 (76.9%)
 *    Frosty skies #06D7F6 + 6 层青色辉光 rgba(46,249,255,…)
 */

/** [icon, bg] —— 顺序即设计稿从左到右（x=0/26/52） */
const CATEGORIES: [LwIconName, string][] = [
  ['gamepad', '#40404a'],
  ['house', '#fd4438'],
  ['car', '#323eff'],
]

const PROGRESS = 123 / 160

/** 进度条辉光（DSL 实测 6 层 drop-shadow） */
const BAR_GLOW = [
  '0 2.77px 2.21px rgba(46,249,255,.053)',
  '0 6.65px 5.32px rgba(46,249,255,.077)',
  '0 12.52px 10.02px rgba(46,249,255,.095)',
  '0 22.34px 17.87px rgba(46,249,255,.113)',
  '0 41.78px 33.42px rgba(46,249,255,.137)',
  '0 100px 80px rgba(46,249,255,.19)',
].join(',')

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface CashbackLWProps {
  title?: string
  value?: number
  /** 类目图标组 [icon, 底色] */
  categories?: [LwIconName, string][]
  /** 进度 0~1, 默认 123/160 */
  progress?: number
}

export function CashbackLW({ title = '返现', value = 27632, categories = CATEGORIES, progress = PROGRESS }: CashbackLWProps = {}) {
  return (
    <LCardShell icon="cashback" title={title} value={value}>
      {/* 图表区 160×53 @ (7.45%, 68.11%) */}
      <div
        className="absolute"
        style={{ left: '7.45%', top: '68.11%', width: '85.11%', height: '20.87%', containerType: 'size' }}
      >
        {/* 类目图标组 84×32, 水平居中 */}
        <div className="absolute left-1/2 top-0" style={{ width: '52.5%', height: '60.38%', transform: 'translateX(-50%)' }}>
          {categories.map(([icon, bg], i) => (
            <span
              key={icon}
              className="sr-lwc-icon absolute top-0 flex items-center justify-center rounded-full"
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

        {/* 进度条 160×6 @ y47 */}
        <div
          className="absolute w-full overflow-hidden rounded-full bg-[#0f0f13]"
          style={{ top: '88.68%', height: '11.32%' }}
        >
          <span
            className="sr-lwc-bar absolute left-0 top-0 block h-full rounded-full bg-[#06d7f6]"
            style={{ width: `${progress * 100}%`, boxShadow: BAR_GLOW }}
          />
        </div>

        <style>{`
          .sr-lwc-icon {
            transform: scale(0);
            animation: sr-lwc-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;
          }
          @keyframes sr-lwc-pop { to { transform: scale(1); } }
          .sr-lwc-bar {
            clip-path: inset(0 100% 0 0);
            animation: sr-lwc-fill 1.1s cubic-bezier(.4,0,.2,1) .75s forwards;
          }
          @keyframes sr-lwc-fill { to { clip-path: inset(0 0 0 0); } }
          @media (prefers-reduced-motion: reduce) {
            .sr-lwc-icon { animation: none !important; transform: none; }
            .sr-lwc-bar { animation: none !important; clip-path: none; }
          }
        `}</style>
      </div>
    </LCardShell>
  )
}
