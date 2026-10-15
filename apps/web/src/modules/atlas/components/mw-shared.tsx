import type { ReactNode } from 'react'
import { useCountUp } from './use-count-up'

/**
 * M 系统计卡公共骨架 —— Pixso Widgets & Indicator 页 M widget (182×220) 共用结构
 * （Spend this week / Total cashback 等共用）
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-11 #000000, radius 12, padding 24/20
 *  - 标题: Text Inter Regular 14/16, Gray-0 #FFF @ (20,24)
 *  - 数值: Header/H6 Inter SemiBold 20/18, #FFF @ (20,54)
 *  - 趋势: Text Bold Inter SemiBold 14/16 @ (20,81), 颜色随组件
 */

export interface MCardShellProps {
  title?: string
  /** 主数值（入场从 0 滚动计数） */
  value?: number
  valuePrefix?: string
  /** 趋势文本, 如 "↓2.5%" / "+5.4%" */
  trend?: string
  /** 趋势色, 默认绿 #15FFAA */
  trendColor?: string
  /** 图表区内容（绝对定位, 由调用方给出位置） */
  children?: ReactNode
}

export function MCardShell({
  title = '',
  value = 0,
  valuePrefix = '¥',
  trend = '',
  trendColor = '#15ffaa',
  children,
}: MCardShellProps) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-mw relative h-full w-full select-none overflow-hidden rounded-[12px] bg-black font-sans"
      style={{ containerType: 'size' }}
    >
      <span
        className="sr-mw-fade absolute text-white"
        style={{ left: '10.99%', top: '10.91%', fontSize: 'min(7.69cqw, 6.36cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.1s' }}
      >
        {title}
      </span>
      <span
        className="sr-mw-fade absolute font-semibold text-white"
        style={{ left: '10.99%', top: '24.55%', fontSize: 'min(10.99cqw, 9.09cqh)', lineHeight: 0.9, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.25s' }}
      >
        {valuePrefix}
        {count.toLocaleString('en-US')}
      </span>
      <span
        className="sr-mw-fade absolute font-semibold"
        style={{ left: '10.99%', top: '36.82%', fontSize: 'min(7.69cqw, 6.36cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', color: trendColor, animationDelay: '0.4s' }}
      >
        {trend}
      </span>
      {children}
      <style>{`
        .sr-mw-fade { opacity: 0; animation: sr-mw-fadein .6s ease-out forwards; }
        @keyframes sr-mw-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sr-mw-fade { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
