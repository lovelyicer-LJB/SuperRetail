// 🔴 改动 2026-10-12 · 市场浮窗 —— 侧栏「市场」按钮触发，列出工坊市场数字卡（MarketData 契约）：
// 点击在画板中心建卡；HTML5 拖放（text/plain = market:<id>）到画板落点建卡。
// 形态筛选与实物/角色/配方/菜品浮窗一致（图标 / 卡片）；卡片预览与画板共用 buildMarketCard 渲染，所见即所得。
import { useEffect, useRef, useState } from 'react'
import { Box, Scan, X } from 'lucide-react'
import { getBoardEngine } from '@/modules/atlas/board/bridge'
import { buildMarketPreview } from '@/modules/atlas/board/marketCardContent'
import { demoMarkets, type MarketData } from '@/modules/workshop/market-card/data'
import { AssetIcon } from '@/modules/workshop/asset-system/AssetForms'
import '@/modules/workshop/asset-system/asset-system.css'
import '@/modules/workshop/asset-system/asset-runes.css'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ShellTheme } from './TopMenu'

/** 市场列表的展示形态：icon = 资产图标形态（默认），card = 卡片形态 */
type MarketView = 'icon' | 'card'

/** 列表项内的卡片预览：与画板上的市场卡同一渲染函数（内层禁指针，事件归列表项） */
function MarketPreview({ data }: { data: MarketData }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (host.current) buildMarketPreview(host.current, data.id)
  }, [data.id])
  return <div ref={host} className="pointer-events-none" style={{ width: 200, height: 280 }} aria-hidden="true" />
}

/** 市场浮窗 —— 吸附侧边栏右侧（与实物/角色/配方/菜品浮窗同形式） */
export function MarketPanel({ theme, onClose }: { theme: ShellTheme; onClose: () => void }) {
  const dark = theme === 'dark'
  const { t } = useLang()
  const [view, setView] = useState<MarketView>('icon')

  const handlePick = (id: string) => {
    getBoardEngine()?.addMarketCard(id)
    onClose()
  }

  return (
    <aside
      aria-label={t('panel.market')}
      data-board-overlay
      className={cn(
        'fixed left-[84px] top-[76px] z-40 flex max-h-[calc(100vh-96px)] w-[300px] flex-col overflow-hidden rounded-2xl border',
        dark ? 'sr-glass-dark' : 'sr-glass-light',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-4 py-3',
          dark ? 'border-white/5' : 'border-black/5',
        )}
      >
        <div>
          <h2 className={cn('text-[14px] font-semibold leading-5', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
            {t('panel.market')}
          </h2>
          <p className={cn('mt-0.5 text-[11px] leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
            {t('panel.marketSub')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.marketClose')}
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
      {/* 形态筛选：资产图标形态（默认）/ 卡片形态（与实物浮窗同一交互） */}
      <div
        role="group"
        aria-label={t('panel.physicalView')}
        className={cn(
          'mx-4 mt-3 flex shrink-0 gap-1 rounded-lg p-0.5',
          dark ? 'bg-white/5' : 'bg-black/4',
        )}
      >
        {([
          ['icon', Scan, t('panel.physicalViewIcon')],
          ['card', Box, t('panel.physicalViewCard')],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors',
              view === key
                ? dark
                  ? 'bg-white/10 text-sr-d-gray-1'
                  : 'bg-white text-sr-l-gray-11 shadow-sm'
                : dark
                  ? 'text-sr-d-gray-4 hover:text-sr-d-gray-2'
                  : 'text-sr-l-gray-4 hover:text-sr-l-gray-8',
            )}
          >
            <Icon size={13} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>
      {view === 'icon' ? (
        /* 资产图标形态：符文图标网格（复用资产体系列表图标的符文镶边样式） */
        <div className="sr-market-scroll grid flex-1 grid-cols-3 content-start gap-x-2 gap-y-4 overflow-y-auto px-4 py-5">
          {demoMarkets.map((d) => (
            <button
              key={d.id}
              type="button"
              draggable
              onDragStart={(e) => {
                // 与画板引擎 drop 协议一致（text/plain = market:<id>）
                e.dataTransfer.setData('text/plain', `market:${d.id}`)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => handlePick(d.id)}
              title={`${d.name} · ${t('panel.marketSub')}`}
              className={cn(
                'flex cursor-grab flex-col items-center gap-2 rounded-xl py-2 transition-colors active:cursor-grabbing',
                dark ? 'hover:bg-white/6' : 'hover:bg-black/4',
              )}
            >
              <AssetIcon asset={d} size={60} rune />
              <span className={cn('text-[11px] font-medium leading-4', dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8')}>
                {d.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* 卡片形态：200×280 预览卡列表（与画板所见即所得） */
        <div className="sr-market-scroll flex flex-1 flex-col items-center gap-6 overflow-y-auto px-4 py-5">
          {demoMarkets.map((d) => (
            <button
              key={d.id}
              type="button"
              draggable
              aria-label={`${d.name} · 市场`}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', `market:${d.id}`)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => handlePick(d.id)}
              title={`${d.name} · ${t('panel.marketSub')}`}
              className="cursor-grab rounded-[14px] transition-transform duration-150 hover:-translate-y-1 active:cursor-grabbing"
            >
              <MarketPreview data={d} />
            </button>
          ))}
        </div>
      )}
      <style>{`
        .sr-market-scroll { scrollbar-width: thin; scrollbar-color: rgba(112,112,124,.45) transparent; }
        .sr-market-scroll::-webkit-scrollbar { width: 6px; }
        .sr-market-scroll::-webkit-scrollbar-thumb { background: rgba(112,112,124,.45); border-radius: 3px; }
        .sr-market-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </aside>
  )
}
