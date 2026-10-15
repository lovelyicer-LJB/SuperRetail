import { cn } from '@/lib/utils'
import logoMarkWhite from '@/assets/brand/logo-mark-white.png'

/**
 * 超零售品牌 LOGO
 * 标帜: Figma「Concept SuperRetail | 超零售概念」页的「超+ZR」monogram
 *   (jimeng 概念稿 44:20, 已抠白底并重着色为 白/#07070C 两版)
 * 槽位结构沿用 Figma Top menu Logo (93:2252): 30.72px 圆角方块 + 字标
 * 底色: 纯色 #0AB9E6 (--sr-logo-bg) + 白色标帜, 深浅主题一致
 */
export function BrandLogo({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const dark = theme === 'dark'
  return (
    <span className="flex select-none items-center gap-[7.34px]">
      <span
        className="flex size-[30.72px] items-center justify-center overflow-hidden rounded-[8.94px] bg-sr-logo-bg"
      >
        <img
          src={logoMarkWhite}
          alt="超零售"
          className="w-[23px] object-contain"
          draggable={false}
        />
      </span>
      <span
        className={cn(
          'font-display text-[21.73px] font-semibold leading-none tracking-[0.02em]',
          dark ? 'text-white' : 'text-sr-l-gray-11',
        )}
      >
        超零售
      </span>
    </span>
  )
}
