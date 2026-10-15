import type { CSSProperties, ReactNode } from 'react'
import { LW_ICONS } from './lw-icons'
import { useCountUp } from './use-count-up'

/**
 * L 系统计卡公共骨架 —— Pixso Widgets & Indicator 页 L widget (188×254) 共用结构
 *
 * 设计值（DSL 实测）:
 *  - 卡片: Gray-11 #000000, radius 12, padding T16 R14 B28 L14
 *  - 图标盒: 44×44 @ (14,16), Gray-10 #0F0F13, radius 12 + 6 层黑色投影; 图标 20×20 居中
 *  - 省略号: 32×32 @ (142,22), Gray-5 #70707C 三点
 *  - 数值: Inter Bold 18/22 (Header/H7), Gray-0 #FFFFFF @ (14,77)
 *  - 标题: Inter Regular 12/16 (Description), Gray-2 #D0D0DA @ (14,104)
 *
 * 全部尺寸用 cqw/cqh, 随容器等比缩放; 图表区由各组件自行实现（左 7.45% 起）。
 */

/** Pixso 导出图标路径渲染器（颜色已在路径数据内） */
export type LwIconName = keyof typeof LW_ICONS

export function LwGlyph({
  name,
  style,
}: {
  name: LwIconName
  style?: CSSProperties
}) {
  const icon = LW_ICONS[name]
  return (
    <svg viewBox={icon.viewBox} style={style} fill="none" aria-hidden className="block h-full w-full">
      {icon.paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} fillRule="nonzero" transform={p.transform} />
      ))}
    </svg>
  )
}

/** 图标盒 6 层投影（DSL 实测值, 极淡黑色） */
const ICON_BOX_SHADOW = [
  '0 2.52px 2.02px rgba(0,0,0,.0056)',
  '0 6.06px 4.85px rgba(0,0,0,.0081)',
  '0 11.41px 9.13px rgba(0,0,0,.01)',
  '0 20.36px 16.29px rgba(0,0,0,.0119)',
  '0 38.08px 30.46px rgba(0,0,0,.0144)',
  '0 91.15px 72.92px rgba(0,0,0,.02)',
].join(',')

export interface LCardShellProps {
  /** 左上角图标（lw-icons 键名） */
  icon: keyof typeof LW_ICONS
  /** 主数值（入场从 0 滚动计数）, 默认 27632 */
  value?: number
  valuePrefix?: string
  valueSuffix?: string
  /** 标题, 如 "Income" */
  title?: string
  /** 图表区内容（绝对定位, 由调用方给出位置） */
  children?: ReactNode
}

export function LCardShell({
  icon,
  value = 27632,
  valuePrefix = '¥',
  valueSuffix = '',
  title = '',
  children,
}: LCardShellProps) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-lw relative h-full w-full select-none overflow-hidden rounded-[12px] bg-black font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 图标盒 44×44 @ (7.45%, 6.30%) */}
      <div
        className="sr-lw-fade absolute flex items-center justify-center bg-[#0f0f13]"
        style={{
          left: '7.45%',
          top: '6.30%',
          width: '23.40%',
          height: '17.32%',
          borderRadius: 'min(6.38cqw, 4.72cqh)',
          boxShadow: ICON_BOX_SHADOW,
          animationDelay: '0.05s',
        }}
      >
        <div style={{ width: 'min(10.64cqw, 7.87cqh)', height: 'min(10.64cqw, 7.87cqh)' }}>
          <LwGlyph name={icon} />
        </div>
      </div>

      {/* 省略号 32×32 @ (75.53%, 8.66%) */}
      <div
        className="sr-lw-fade absolute"
        style={{ left: '75.53%', top: '8.66%', width: 'min(17.02cqw, 12.60cqh)', height: 'min(17.02cqw, 12.60cqh)', animationDelay: '0.15s' }}
      >
        <LwGlyph name="ellipsis" />
      </div>

      {/* 数值 Inter Bold 18/22 @ (7.45%, 30.31%) */}
      <span
        className="sr-lw-fade absolute font-bold text-white"
        style={{
          left: '7.45%',
          top: '30.31%',
          fontSize: 'min(9.57cqw, 7.09cqh)',
          lineHeight: 1.222,
          fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif',
          animationDelay: '0.25s',
        }}
      >
        {valuePrefix}
        {count.toLocaleString('en-US')}
        {valueSuffix}
      </span>

      {/* 标题 Inter Regular 12/16 @ (7.45%, 40.94%) */}
      <span
        className="sr-lw-fade absolute text-[#d0d0da]"
        style={{
          left: '7.45%',
          top: '40.94%',
          fontSize: 'min(6.38cqw, 4.72cqh)',
          lineHeight: 1.333,
          fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif',
          animationDelay: '0.35s',
        }}
      >
        {title}
      </span>

      {children}

      <style>{`
        .sr-lw-fade { opacity: 0; animation: sr-lw-fadein .6s ease-out forwards; }
        @keyframes sr-lw-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sr-lw-fade { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
