import { useCountUp } from './use-count-up'
import avaTransfer from '../assets/ava_transfer.png'

/**
 * LastTransferXSW —— Pixso Widgets & Indicator 页 Last transfet / XS widget
 * (节点 65:3872, 216×68, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-9 #1D1D24, radius 9.115
 *  - 头像: 44×44 @ (12,12) 圆形照片（Avatar 实例 88×88@2x 导出）
 *  - 未读徽标: 21×21 #1E1E24 圆 @ (40,39), 内嵌 9×9 #F70318 红点居中
 *  - 数值: "$27,632" Header/H7 Inter Bold 18/22, #FFF @ (69,15)
 *  - 标题: "Last transfer" Inter Regular 12.76/14.58, Gray-2 #D0D0DA @ (69,42)
 */

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface LastTransferXSWProps {
  title?: string
  /** 转账金额, 默认 27632 */
  value?: number
  /** 对方头像 src */
  avatarSrc?: string
  /** 未读红点徽标, 默认 true */
  hasUnread?: boolean
}

export function LastTransferXSW({ title = '最近转账', value = 27632, avatarSrc = avaTransfer, hasUnread = true }: LastTransferXSWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-lt relative h-full w-full select-none overflow-hidden rounded-[9.115px] bg-[#1d1d24] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 头像 44×44 @ (5.56%, 17.65%) */}
      <span className="sr-lt-pop absolute block" style={{ left: '5.56%', top: '17.65%', width: '20.37%', height: '64.71%' }}>
        <img src={avatarSrc} alt="" className="block h-full w-full rounded-full object-cover" draggable={false} />
      </span>
      {/* 未读徽标 21×21 @ (18.52%, 57.35%), 红点 9×9 居中 */}
      {hasUnread && (
        <span
          className="sr-lt-pop absolute flex items-center justify-center rounded-full bg-[#1e1e24]"
          style={{ left: '18.52%', top: '57.35%', width: '9.72%', height: '30.88%', animationDelay: '0.35s' }}
        >
          <span className="block rounded-full bg-[#f70318]" style={{ width: '42.86%', height: '42.86%' }} />
        </span>
      )}
      {/* 数值 $27,632 @ (31.94%, 22.06%) */}
      <span
        className="sr-lt-fade absolute font-bold text-white"
        style={{ left: '31.94%', top: '22.06%', fontSize: 'min(8.33cqw, 26.47cqh)', lineHeight: 1.222, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.15s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>
      {/* 标题 Last transfer @ (31.94%, 61.76%) */}
      <span
        className="sr-lt-fade absolute text-[#d0d0da]"
        style={{ left: '31.94%', top: '61.76%', fontSize: 'min(5.91cqw, 18.77cqh)', lineHeight: 1.143, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      <style>{`
        .sr-lt-fade { opacity: 0; animation: sr-lt-fadein .6s ease-out forwards; }
        @keyframes sr-lt-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-lt-pop {
          transform: scale(0);
          animation: sr-lt-popin .5s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes sr-lt-popin { to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-lt-fade { animation: none !important; opacity: 1; }
          .sr-lt-pop { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
