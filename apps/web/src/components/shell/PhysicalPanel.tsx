// 🔴 改动 2026-10-11 · 实物浮窗 —— 侧栏「实物」按钮触发，列出工坊原材料数字卡（FoodCardData 契约）：
// 点击在画板中心建卡；HTML5 拖放（text/plain = food:<id>）到画板落点建卡。
// 🔴 改动 2026-10-12 · 画板新建默认节点形态（Tab+Q/W/E/R 切换图标/节点/组件/卡片）；
// 列表「卡片」预览与画板卡片形态共用 buildFoodCard（foodCardContent.ts），所见即所得。
// 🔴 改动 2026-10-12 · 列表顶部加「形态」筛选：默认资产图标形态（AssetIcon 符文图标网格），
// 可切换卡片形态（原 200×280 预览卡列表）；AssetIcon 的样式表在此显式引入（Vite 会去重）。
import { useEffect, useRef, useState } from 'react'
import { Box, Scan, X } from 'lucide-react'
import { getBoardEngine } from '@/modules/atlas/board/bridge'
import { buildFoodPreview } from '@/modules/atlas/board/foodCardContent'
import { demoFoodCards, type FoodCardData } from '@/modules/workshop/food-card/data'
import { AssetIcon } from '@/modules/workshop/asset-system/AssetForms'
// 🔴 改动 2026-10-12 · 拖出资产附加道具栏协议 MIME（HUD 道具栏据此吸附入槽）
import { ASSET_DND_MIME } from '@/modules/atlas/components/HudBars'
import '@/modules/workshop/asset-system/asset-system.css'
import '@/modules/workshop/asset-system/asset-runes.css'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ShellTheme } from './TopMenu'

/** 实物列表的展示形态：icon = 资产图标形态（默认），card = 卡片形态 */
type PhysicalView = 'icon' | 'card'

/** 列表项内的卡片预览：与画板上的实物卡同一渲染函数（内层禁指针，事件归列表项） */
function FoodPreview({ data }: { data: FoodCardData }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (host.current) buildFoodPreview(host.current, data.id)
  }, [data.id])
  return <div ref={host} className="pointer-events-none" style={{ width: 200, height: 280 }} aria-hidden="true" />
}

/** 实物浮窗 —— 吸附侧边栏右侧（与循环/图表浮窗同形式） */
export function PhysicalPanel({ theme, onClose }: { theme: ShellTheme; onClose: () => void }) {
  const dark = theme === 'dark'
  const { t } = useLang()
  // 🔴 改动 2026-10-12 · 形态筛选状态：默认资产图标形态
  const [view, setView] = useState<PhysicalView>('icon')

  const handlePick = (id: string) => {
    getBoardEngine()?.addFoodCard(id)
    onClose()
  }

  return (
    <aside
      aria-label="实物面板"
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
            {t('panel.physical')}
          </h2>
          <p className={cn('mt-0.5 text-[11px] leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
            {t('panel.physicalSub')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.physicalClose')}
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
      {/* 🔴 改动 2026-10-12 · 列表顶部形态筛选：资产图标形态（默认）/ 卡片形态 */}
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
        /* 资产图标形态：符文图标 3 列网格（复用资产体系列表图标的符文镶边样式） */
        <div className="sr-physical-scroll grid flex-1 grid-cols-3 content-start gap-x-2 gap-y-4 overflow-y-auto px-4 py-5">
          {demoFoodCards.map((d) => (
            <button
              key={d.id}
              type="button"
              draggable
              onDragStart={(e) => {
                // 与画板引擎 drop 协议一致（text/plain = food:<id>）
                e.dataTransfer.setData('text/plain', `food:${d.id}`)
                // 🔴 改动 2026-10-12 · 附加道具栏协议：版图底部 HUD 道具栏据此接收并吸附入槽
                e.dataTransfer.setData(ASSET_DND_MIME, d.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => handlePick(d.id)}
              title={`${d.name} · ${t('panel.physicalSub')}`}
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
        /* 卡片形态：200×280 预览卡列表（原渲染，与画板所见即所得） */
        <div className="sr-physical-scroll flex flex-1 flex-col items-center gap-6 overflow-y-auto px-4 py-5">
          {/* 🔴 改动 2026-10-11 · 列表项只保留卡片本体：卡下的名称/单价/状态/资产编号说明行按需求移除 */}
          {demoFoodCards.map((d) => (
            <button
              key={d.id}
              type="button"
              draggable
              onDragStart={(e) => {
                // 与画板引擎 drop 协议一致（text/plain = food:<id>）
                e.dataTransfer.setData('text/plain', `food:${d.id}`)
                // 🔴 改动 2026-10-12 · 附加道具栏协议：版图底部 HUD 道具栏据此接收并吸附入槽
                e.dataTransfer.setData(ASSET_DND_MIME, d.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => handlePick(d.id)}
              title={`${d.name} · ${t('panel.physicalSub')}`}
              className="cursor-grab rounded-[14px] transition-transform duration-150 hover:-translate-y-1 active:cursor-grabbing"
            >
              <FoodPreview data={d} />
            </button>
          ))}
        </div>
      )}
      <style>{`
        .sr-physical-scroll { scrollbar-width: thin; scrollbar-color: rgba(112,112,124,.45) transparent; }
        .sr-physical-scroll::-webkit-scrollbar { width: 6px; }
        .sr-physical-scroll::-webkit-scrollbar-thumb { background: rgba(112,112,124,.45); border-radius: 3px; }
        .sr-physical-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </aside>
  )
}
