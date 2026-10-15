import type { ReactNode } from 'react'
import { useCountUp } from './use-count-up'

/**
 * S 系统计卡公共骨架 —— Pixso Widgets & Indicator 页 S widget (165×137/138) 共用结构
 * （Income / Expense / Cashback S 系共用）
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-10 #0F0F13, radius 12, padding 16/14
 *  - 数值: Header/H7 Inter Bold 18/22, Gray-0 #FFF @ (14,16)
 *  - 标题: Description Inter Regular 12/16, Gray-2 #D0D0DA @ (14,43)
 */

export interface SStatShellProps {
  title?: string
  /** 主数值（入场从 0 滚动计数） */
  value?: number
  valuePrefix?: string
  /** 图表区内容（绝对定位, 由调用方给出位置） */
  children?: ReactNode
}

export function SStatShell({ title = '', value = 0, valuePrefix = '¥', children }: SStatShellProps) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-sw relative h-full w-full select-none overflow-hidden rounded-[12px] bg-[#0f0f13] font-sans"
      style={{ containerType: 'size' }}
    >
      <span
        className="sr-sw-fade absolute font-bold text-white"
        style={{ left: '8.48%', top: '11.59%', fontSize: 'min(10.91cqw, 13.04cqh)', lineHeight: 1.222, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.15s' }}
      >
        {valuePrefix}
        {count.toLocaleString('en-US')}
      </span>
      <span
        className="sr-sw-fade absolute text-[#d0d0da]"
        style={{ left: '8.48%', top: '31.16%', fontSize: 'min(7.27cqw, 8.70cqh)', lineHeight: 1.333, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      {children}
      <style>{`
        .sr-sw-fade { opacity: 0; animation: sr-sw-fadein .6s ease-out forwards; }
        @keyframes sr-sw-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sr-sw-fade { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
