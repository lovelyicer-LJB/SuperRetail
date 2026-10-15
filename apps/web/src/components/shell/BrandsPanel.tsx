// 🔴 改动 2026-10-10 · 原左侧固定资产栏改为侧边栏「品牌」按钮触发的浮窗（9 个餐饮品牌列表不变）。
// 🔴 改动 2026-10-13 · 品牌清单抽取为共享数据 @/lib/brands（互动页玻璃星球同源复用）。
import { useState } from 'react'
import { X } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { BRANDS, brandLogoUrl } from '@/lib/brands'
import type { ShellTheme } from './TopMenu'

/** 9 个餐饮品牌（数据见 @/lib/brands，logo 取自 public/assets/atlas/brands） */
const ASSETS = BRANDS

/** 品牌浮窗 —— 侧边栏「品牌」按钮触发, 圆形品牌头像 + 份额 + 估值, 自身滚动 */
export function BrandsPanel({ theme, onClose }: { theme: ShellTheme; onClose: () => void }) {
  const dark = theme === 'dark'
  const [active, setActive] = useState('laziji')
  const { t } = useLang()
  return (
    // 🔴 改动 2026-10-11 · 标记 data-board-overlay：画板引擎把浮窗视为画板作用域，面板打开时 Del 删除卡片不失效
    <aside
      aria-label="品牌面板"
      data-board-overlay
      className={cn(
        // 🔴 改动 2026-10-11 · 浮窗背景换液态玻璃（sr-glass-*，见 index.css），实心底+shadow-2xl 退役
        'fixed left-[84px] top-[76px] z-40 flex max-h-[calc(100vh-96px)] w-[320px] flex-col overflow-hidden rounded-2xl border',
        dark ? 'sr-glass-dark' : 'sr-glass-light',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-5 py-3',
          dark ? 'border-white/5' : 'border-black/5',
        )}
      >
        <h2 className={cn('text-[14px] font-semibold leading-5', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
          {t('panel.brands')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.brandsClose')}
          className={cn(
            'flex size-7 items-center justify-center rounded-full transition-colors',
            dark
              ? 'text-sr-d-gray-4 hover:bg-white/10 hover:text-sr-d-gray-1'
              : 'text-sr-l-gray-4 hover:bg-black/5 hover:text-sr-l-gray-11',
          )}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <div className="sr-brands-scroll flex-1 overflow-y-auto">
        {ASSETS.map((asset) => (
          <button
            key={asset.key}
            type="button"
            aria-pressed={active === asset.key}
            onClick={() => setActive(asset.key)}
            className={cn(
              'flex w-full items-center gap-3.5 border-b px-4 py-3.5 text-left transition-colors',
              dark ? 'border-white/5' : 'border-black/5',
              active === asset.key
                ? dark ? 'bg-white/8' : 'bg-black/6'
                : dark ? 'hover:bg-white/4' : 'hover:bg-black/3',
            )}
          >
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <img src={brandLogoUrl(asset.logo)} alt={asset.name} className="size-full object-contain" loading="lazy" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-[16px] font-medium leading-6', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
                {asset.name}
              </span>
              <span className={cn('block text-[13px] leading-5', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
                {asset.shares}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className={cn('block text-[16px] font-medium leading-6', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
                {asset.value}
              </span>
              <span className="block text-[13px] leading-5 text-[#e0483f]">{asset.delta}</span>
            </span>
          </button>
        ))}
      </div>
      <style>{`
        .sr-brands-scroll { scrollbar-width: thin; scrollbar-color: rgba(112,112,124,.45) transparent; }
        .sr-brands-scroll::-webkit-scrollbar { width: 6px; }
        .sr-brands-scroll::-webkit-scrollbar-thumb { background: rgba(112,112,124,.45); border-radius: 3px; }
        .sr-brands-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </aside>
  )
}
