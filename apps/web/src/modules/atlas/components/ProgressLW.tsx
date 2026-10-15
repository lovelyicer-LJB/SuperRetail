import { LwGlyph } from './lw-shared'
import { useCountUp } from './use-count-up'
import avaRight from '../assets/ava1.png'
import avaMid from '../assets/ava2.png'
import avaLeft from '../assets/ava3.png'

/**
 * ProgressLW —— Pixso Widgets & Indicator 页 Progress widget / L widget
 * (节点 65:3634, 296×184, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-9 #1D1D24, radius 6
 *  - 标题 "Finance App": Inter Bold 16/16, Gray-1 #F5F5FF @ (16,19); More 图标 32×32 @ (248,10)
 *  - 进度区 @ (16,69) 264×34: 标签/百分比 Inter Regular 14/16 #FFF;
 *    轨道 263×6 #000, 进度 146×6 Sea green #15FFAA + 6 层绿辉光 rgba(29,251,97,…)
 *  - 明细行 @ (16,132): 三个 32×36 头像（2px 外描边 #1E2025）交叠;
 *    右侧附件 13 / 任务 4/5, 图标 18×18 #F5F5FF, 文字 Inter Regular 14/16
 */

/** 进度条辉光（DSL 实测 6 层） */
const BAR_GLOW = [
  '0 2.77px 2.21px rgba(29,251,97,.051)',
  '0 6.65px 5.32px rgba(29,251,97,.073)',
  '0 12.52px 10.02px rgba(29,251,97,.09)',
  '0 22.34px 17.87px rgba(29,251,97,.107)',
  '0 41.78px 33.42px rgba(29,251,97,.129)',
  '0 100px 80px rgba(29,251,97,.18)',
].join(',')

const AVATARS = [avaLeft, avaMid, avaRight]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface ProgressLWProps {
  /** 项目标题, 默认「金融应用」 */
  title?: string
  /** 进度百分比文本, 默认 68 */
  percent?: number
  /** 进度条宽度比 0~1, 默认 55.51%（设计稿 146/263） */
  ratio?: number
  /** 成员头像（src 数组, 从左到右交叠） */
  avatars?: string[]
  /** 附件数文本, 默认 '13' */
  attachments?: string
  /** 任务完成文本, 默认 '4/5' */
  tasks?: string
}

export function ProgressLW({
  title = '金融应用',
  percent = 68,
  ratio = 0.5551,
  avatars = AVATARS,
  attachments = '13',
  tasks = '4/5',
}: ProgressLWProps = {}) {
  const count = useCountUp(percent)
  return (
    <div
      className="sr-lwp relative h-full w-full select-none overflow-hidden rounded-[6px] bg-[#1d1d24] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 标题 @ (5.41%, 10.33%) */}
      <span
        className="sr-lwp-fade absolute font-bold text-[#f5f5ff]"
        style={{ left: '5.41%', top: '10.33%', fontSize: 'min(5.41cqw, 8.70cqh)', lineHeight: 1, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.1s' }}
      >
        {title}
      </span>
      {/* More 图标 32×32 @ (83.78%, 5.43%), 内部图标 18×18 */}
      <div
        className="sr-lwp-fade absolute flex items-center justify-center"
        style={{ left: '83.78%', top: '5.43%', width: '10.81%', height: '17.39%', animationDelay: '0.2s' }}
      >
        <div style={{ width: 'min(6.08cqw, 9.78cqh)', height: 'min(6.08cqw, 9.78cqh)' }}>
          <LwGlyph name="more_light" />
        </div>
      </div>

      {/* 进度区 264×34 @ (5.41%, 37.5%) */}
      <div className="absolute" style={{ left: '5.41%', top: '37.5%', width: '89.19%', height: '18.48%', containerType: 'size' }}>
        <span
          className="sr-lwp-fade absolute text-white"
          style={{ left: 0, top: '26.5%', fontSize: 'min(5.3cqw, 41.2cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
        >
          进度
        </span>
        <span
          className="sr-lwp-fade absolute right-0 text-right text-white"
          style={{ top: '26.5%', fontSize: 'min(5.3cqw, 41.2cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.35s' }}
        >
          {count}%
        </span>
        {/* 轨道 */}
        <div className="absolute bottom-0 left-[0.38%] w-[99.6%] overflow-hidden rounded-full bg-black" style={{ height: '17.65%' }}>
          {/* 进度条宽度由 ratio 驱动 */}
          <span
            className="sr-lwp-bar absolute left-0 top-0 block h-full rounded-full bg-[#15ffaa]"
            style={{ width: `${ratio * 100}%`, boxShadow: BAR_GLOW }}
          />
        </div>
      </div>

      {/* 明细行 264×36 @ (5.41%, 71.74%) */}
      <div className="absolute" style={{ left: '5.41%', top: '71.74%', width: '89.19%', height: '19.57%', containerType: 'size' }}>
        {avatars.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="sr-lwp-ava absolute top-0 rounded-full"
            style={{ left: `${(i * 30 / 264) * 100}%`, width: '13.64cqw', height: '100cqh', animationDelay: `${0.45 + i * 0.12}s` }}
          />
        ))}
        {/* 右侧图标组: 附件 13 · 任务 4/5 */}
        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center" style={{ gap: '6.06cqw' }}>
          {[
            { icon: 'attach' as const, text: attachments },
            { icon: 'tasks' as const, text: tasks },
          ].map(({ icon, text }, i) => (
            <span key={icon} className="sr-lwp-fade flex items-center" style={{ gap: '1.52cqw', animationDelay: `${0.8 + i * 0.1}s` }}>
              <span className="block" style={{ width: '6.82cqw', height: '50cqh' }}>
                <LwGlyph name={icon} />
              </span>
              <span className="text-[#f5f5ff]" style={{ fontSize: 'min(5.3cqw, 38.9cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif' }}>
                {text}
              </span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .sr-lwp-fade { opacity: 0; animation: sr-lwp-fadein .6s ease-out forwards; }
        @keyframes sr-lwp-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-lwp-bar {
          clip-path: inset(0 100% 0 0);
          animation: sr-lwp-fill 1.1s cubic-bezier(.4,0,.2,1) .5s forwards;
        }
        @keyframes sr-lwp-fill { to { clip-path: inset(0 0 0 0); } }
        .sr-lwp-ava {
          transform: scale(0);
          animation: sr-lwp-pop .5s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-lwp-pop { to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-lwp-fade { animation: none !important; opacity: 1; }
          .sr-lwp-bar { animation: none !important; clip-path: none; }
          .sr-lwp-ava { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
