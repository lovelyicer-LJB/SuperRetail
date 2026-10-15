import { LwGlyph, type LwIconName } from './lw-shared'
import { useCountUp } from './use-count-up'

/**
 * CategorySW —— Pixso Widgets & Indicator 页 Category / S widget
 * (节点 65:3811, 166×157, Dark Theme)
 *
 * 设计值（DSL 实测）:
 *  - 卡片: #0F0F13, radius 12, padding 18
 *  - 图标盒 46×46 #000 radius 12 @ (18,18), 内嵌餐厅图标 24×24 #FFF
 *  - 标题 "Restaurants": Text Inter Regular 14/16, Gray-3 #A9A9B6 @ (18,93)
 *  - 数值 "$4,430": Header/H7 Inter Bold 18/22, #FFF @ (18,117)
 */

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface CategorySWProps {
  /** 类目名, 默认「餐饮」 */
  title?: string
  /** 主数值, 默认 4430 */
  value?: number
  /** 类目图标（lw-icons 键名）, 默认 restaurant */
  icon?: LwIconName
}

export function CategorySW({ title = '餐饮', value = 4430, icon = 'restaurant' }: CategorySWProps = {}) {
  const count = useCountUp(value)
  return (
    <div
      className="sr-swc2 relative h-full w-full select-none overflow-hidden rounded-[12px] bg-[#0f0f13] font-sans"
      style={{ containerType: 'size' }}
    >
      {/* 图标盒 46×46 @ (10.84%, 11.46%) */}
      <div
        className="sr-swc2-fade absolute flex items-center justify-center bg-black"
        style={{
          left: '10.84%',
          top: '11.46%',
          width: '27.71%',
          height: '29.30%',
          borderRadius: 'min(7.23cqw, 7.64cqh)',
          animationDelay: '0.1s',
        }}
      >
        <div style={{ width: 'min(14.46cqw, 15.29cqh)', height: 'min(14.46cqw, 15.29cqh)' }}>
          <LwGlyph name={icon} />
        </div>
      </div>

      {/* 标题 @ (10.84%, 59.24%) */}
      <span
        className="sr-swc2-fade absolute text-[#a9a9b6]"
        style={{ left: '10.84%', top: '59.24%', fontSize: 'min(8.43cqw, 8.92cqh)', lineHeight: 1.14, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.3s' }}
      >
        {title}
      </span>
      {/* 数值 @ (10.84%, 74.52%) */}
      <span
        className="sr-swc2-fade absolute font-bold text-white"
        style={{ left: '10.84%', top: '74.52%', fontSize: 'min(10.84cqw, 11.46cqh)', lineHeight: 1.222, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.4s' }}
      >
        ¥{count.toLocaleString('en-US')}
      </span>

      <style>{`
        .sr-swc2-fade { opacity: 0; animation: sr-swc2-fadein .6s ease-out forwards; }
        @keyframes sr-swc2-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sr-swc2-fade { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
