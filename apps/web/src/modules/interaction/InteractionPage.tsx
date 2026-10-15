// 🔴 改动 2026-10-13 · 互动页 v1：3D 交互为主的极简 Blender 风页面。
// 底层 = 一块全新的无限画板（独立 emptyBoard 文档，不持久化、与版图画板互不影响）；
// 上层 = 9 个品牌玻璃星球（three.js，数据与侧边栏品牌浮窗同源 @/lib/brands）：
// 星球摆放在画板世界坐标中，平移/缩放与点阵网格严格同步；拖动星球可移位，点击查看品牌卡。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { X } from 'lucide-react'
import { BoardCanvas } from '@/modules/atlas/board/BoardCanvas'
import { emptyBoard } from '@/modules/atlas/board/types'
import type { ShellOutletContext } from '@/components/shell/AppShell'
import { BRANDS, brandLogoUrl } from '@/lib/brands'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { BrandPlanetScene } from './scene/planets'

export function InteractionPage() {
  const { theme } = useOutletContext<ShellOutletContext>()
  const dark = theme === 'dark'
  const { t } = useLang()

  const hostRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<BrandPlanetScene | null>(null)
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  /** 全新的空白画板文档：初始视口把世界原点对准容器中心（星球星座即以原点为中心排布） */
  const doc = useMemo(() => {
    const d = emptyBoard('互动')
    d.viewport = { x: window.innerWidth / 2, y: (window.innerHeight - 68) / 2, zoom: 1 }
    return d
  }, [])

  // 3D 场景挂载（StrictMode 双跑安全：dispose 幂等，重建即全新场景）
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const scene = new BrandPlanetScene(host, {
      onHoverChange: (key, x, y) => setHover(key ? { key, x, y } : null),
      onSelectChange: (key) => setSelected(key),
    })
    scene.anchorEl = anchorRef.current
    scene.setViewport(doc.viewport) // 引擎创建早于本 effect，初始视口用文档值补齐
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
    // 场景仅挂载一次；视口/主题由下方 effect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 主题跟随
  useEffect(() => {
    sceneRef.current?.setTheme(dark)
  }, [dark])

  const hoverBrand = hover ? BRANDS.find((b) => b.key === hover.key) : null
  const selBrand = selected ? BRANDS.find((b) => b.key === selected) : null

  return (
    <div ref={hostRef} className="relative h-[calc(100svh-68px)] overflow-hidden font-sans">
      {/* 底层：全新无限画板（独立文档，不注册主引擎、不持久化）；3D 画布由场景类追加到本容器 */}
      <BoardCanvas
        dark={dark}
        doc={doc}
        primary={false}
        onViewChange={(v) => sceneRef.current?.setViewport(v)}
      />

      {/* 选中卡锚点：场景逐帧投影写入 left/top（opacity 亦由场景控制） */}
      <div
        ref={anchorRef}
        className="pointer-events-none absolute left-0 top-0 z-20 opacity-0 transition-opacity duration-150"
      >
        {selBrand && (
          <div
            role="dialog"
            aria-label={`${t('interaction.selected')} · ${selBrand.name}`}
            className={cn(
              'pointer-events-auto absolute bottom-[110px] w-[280px] -translate-x-1/2 rounded-2xl border p-4',
              dark ? 'sr-glass-dark' : 'sr-glass-light',
            )}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={t('interaction.closeCard')}
              className={cn(
                'absolute right-3 top-3 flex size-6 items-center justify-center rounded-full transition-colors',
                dark
                  ? 'text-sr-d-gray-4 hover:bg-white/10 hover:text-sr-d-gray-1'
                  : 'text-sr-l-gray-4 hover:bg-black/5 hover:text-sr-l-gray-11',
              )}
            >
              <X size={13} strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
                <img src={brandLogoUrl(selBrand.logo)} alt={selBrand.name} className="size-full object-contain" />
              </span>
              <span className="min-w-0">
                <span className={cn('block truncate text-[15px] font-semibold leading-5', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
                  {selBrand.name}
                </span>
                <span className={cn('mt-0.5 block text-[12px] leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
                  {selBrand.shares}
                </span>
              </span>
            </div>
            <div className={cn('mt-3 flex items-baseline justify-between border-t pt-3', dark ? 'border-white/8' : 'border-black/8')}>
              <span className={cn('text-[16px] font-semibold leading-6', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
                {selBrand.value}
              </span>
              <span className="text-[13px] leading-5 text-[#e0483f]">{selBrand.delta}</span>
            </div>
          </div>
        )}
      </div>

      {/* 悬停气泡：跟随光标 */}
      {hoverBrand && hover && (
        <div
          className={cn(
            'pointer-events-none absolute z-20 flex items-center gap-2 rounded-full border px-3 py-1.5',
            dark ? 'sr-glass-dark' : 'sr-glass-light',
          )}
          style={{ left: hover.x + 16, top: hover.y + 14 }}
        >
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: hoverBrand.color, boxShadow: `0 0 6px ${hoverBrand.color}` }}
          />
          <span className={cn('text-[12px] font-medium leading-4', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
            {hoverBrand.name}
          </span>
        </div>
      )}

      {/* 底部操作提示 */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-5 z-20 mx-auto w-fit rounded-full border px-4 py-2 text-[12px] leading-4',
          dark ? 'sr-glass-dark text-sr-d-gray-3' : 'sr-glass-light text-sr-l-gray-8',
        )}
      >
        {t('interaction.hint')}
      </div>
    </div>
  )
}
