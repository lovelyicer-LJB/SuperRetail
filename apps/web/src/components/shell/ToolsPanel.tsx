// 🔴 改动 2026-10-11 · 「工具」浮窗：侧边栏功能模块仓库。
// 列出 railModules 注册表里的全部功能——已在侧边栏的灰显且禁拖（防重复上栏），
// 未上栏的正常显示、可拖入侧边栏（落点与排序由 SideRail 处理）；
// 后续新开发的模块在注册表登记后自动以「可拖入」形态出现在这里。
// 🔴 改动 2026-10-13 · 浮窗整体变为栏内模块拖回的合法落点（RAIL_MOVE_MIME）：
// 拖到列表任意位置（未上栏行 / 空白 / 页头页脚）放手 = 从侧边栏移除，不做替换交换。
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import {
  RAIL_ADD_MIME,
  RAIL_MOVE_MIME,
  RAIL_MODULES,
  removeRailModule,
  useDraggingRailModule,
  useRailOrder,
} from './railModules'
import type { ShellTheme } from './TopMenu'

export function ToolsPanel({ theme, onClose }: { theme: ShellTheme; onClose: () => void }) {
  const dark = theme === 'dark'
  const { t } = useLang()
  const order = useRailOrder()
  const asideRef = useRef<HTMLElement>(null)
  // 🔴 改动 2026-10-13 · 悬停态：栏内模块拖到浮窗上方时为 true（浮窗整体高亮为可落点）
  const [hovering, setHovering] = useState(false)
  // 🔴 改动 2026-10-13 · 当前被拖的栏内模块（内存态，见 railModules.ts）——决定提示/行标记/禁拖感
  const draggingKey = useDraggingRailModule()
  const dragActive = draggingKey !== null

  // 🔴 改动 2026-10-13 · window 级 dragend/drop 清理悬停态，浮窗外放手不留残影；卸载时移除监听
  useEffect(() => {
    const clear = () => setHovering(false)
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clear)
    }
  }, [])

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    // 只接收栏内模块拖回（RAIL_MOVE_MIME）；不含该类型时放行，不干扰 RAIL_ADD_MIME 的既有逻辑
    if (e.dataTransfer.types.includes(RAIL_MOVE_MIME)) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      setHovering(true)
    }
  }

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const key = e.dataTransfer.getData(RAIL_MOVE_MIME)
    // 语义：落到未上栏行 / 空白 / 页头页脚任意位置，都只是把被拖模块移出侧栏
    if (key) removeRailModule(key)
    setHovering(false)
  }

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    // 与 SideRail 里 nav 的写法一致：真正离开浮窗（非掠过子元素）才清悬停态，避免闪断
    if (!asideRef.current?.contains(e.relatedTarget as Node | null)) setHovering(false)
  }

  return (
    // data-board-overlay：画板引擎把浮窗视为画板作用域，面板打开时 Del 删除卡片不失效
    <aside
      ref={asideRef}
      aria-label={t('panel.tools')}
      data-board-overlay
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      className={cn(
        // 浮窗背景换液态玻璃（sr-glass-*，见 index.css），与品牌/循环浮窗同款
        'fixed left-[84px] top-[76px] z-40 flex max-h-[calc(100vh-96px)] w-[176px] flex-col overflow-hidden rounded-2xl border',
        dark ? 'sr-glass-dark' : 'sr-glass-light',
        // 悬停时为落点：虚线淡蓝描边（outline 不挤占布局、不冲突玻璃边框）
        hovering && 'outline-2 outline-dashed outline-offset-2 outline-[#397eff]/70',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-4 py-3',
          dark ? 'border-white/5' : 'border-black/5',
        )}
      >
        <h2 className={cn('text-[14px] font-semibold leading-5', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
          {t('panel.tools')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.toolsClose')}
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
      <p
        className={cn(
          'shrink-0 border-b px-4 py-2 text-[11px] font-medium leading-4',
          dark ? 'border-white/5 text-sr-d-gray-5' : 'border-black/5 text-sr-l-gray-4',
        )}
      >
        {t('panel.toolsSub')}
      </p>
      {/* 🔴 改动 2026-10-13 · 拖拽进行中：列表上方提示「放手移出侧边栏」 */}
      {dragActive && (
        <div
          className={cn(
            'shrink-0 border-b px-4 py-2 text-[11px] font-medium leading-4 text-[#397eff]',
            dark ? 'border-white/5' : 'border-black/5',
          )}
        >
          {t('panel.toolsDropOut')}
        </div>
      )}
      <div
        className={cn(
          'flex flex-col gap-0.5 overflow-y-auto px-2 py-2',
          // 拖拽进行中：列表区整体呈现为可落点（虚线淡蓝描边 + 淡蓝底）。
          // 用 outline（内缩）而不是 border+margin：不占布局，指针进出浮窗时行宽不抖动
          dragActive && 'rounded-xl bg-[#397eff]/8 outline-2 outline-dashed -outline-offset-4 outline-[#397eff]/60',
        )}
      >
        {RAIL_MODULES.map((mod) => {
          const onRail = order.includes(mod.key)
          // 🔴 改动 2026-10-13 · 被拖拽的那一行：淡蓝描边 + 底，标记它即将离开侧栏
          const dragging = mod.key === draggingKey
          const Icon = mod.icon
          return (
            <div
              key={mod.key}
              role="button"
              aria-disabled={onRail}
              draggable={!onRail}
              onDragStart={
                !onRail
                  ? (e) => {
                      e.dataTransfer.setData(RAIL_ADD_MIME, mod.key)
                      e.dataTransfer.effectAllowed = 'copy'
                    }
                  : undefined
              }
              title={dragging ? t('panel.toolsDragging') : onRail ? t('panel.toolsOnRail') : t('panel.toolsDrag')}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition-colors',
                // 被拖的那一行：淡蓝描边 + 底，明确标记它即将离开侧栏。
                // 用 ring-inset 而不是 border：同样不占布局，拖拽中行高不变
                dragging && 'bg-[#397eff]/12 ring-1 ring-inset ring-[#397eff]/60',
                // 拖拽进行中，已在栏的行是落点，去掉禁拖感；未拖拽时维持原灰显禁拖
                !dragging && onRail && (dragActive ? 'cursor-default' : 'cursor-not-allowed opacity-40'),
                // 未上栏的行仍可拖入侧栏
                !onRail && 'cursor-grab active:cursor-grabbing ' + (dark ? 'hover:bg-white/6' : 'hover:bg-black/4'),
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg',
                  dark ? 'bg-sr-d-gray-11 text-sr-d-gray-2' : 'bg-sr-l-gray-1 text-sr-l-gray-8',
                )}
              >
                <Icon size={18} strokeWidth={1.7} />
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[12px] font-medium leading-4',
                  dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8',
                )}
              >
                {t(mod.labelKey)}
              </span>
              {onRail && (
                <span
                  className={cn(
                    'shrink-0 text-[10px] leading-3',
                    dragging ? 'text-[#397eff]' : dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4',
                  )}
                >
                  {dragging ? t('panel.toolsDragging') : t('panel.toolsAdded')}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
