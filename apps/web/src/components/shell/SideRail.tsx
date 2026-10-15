// 🔴 改动 2026-10-02 · 新增左侧图标导航栏：上组工作区入口、下组工具入口，按设计稿还原。
// 🔴 改动 2026-10-10 · 新增「品牌」入口；图表/品牌改为浮窗开关，激活态由外壳层面板状态驱动。
// 🔴 改动 2026-10-11 · 撤掉「布局」「规划」入口（含规划浮窗及其画板建卡工具）。
// 🔴 改动 2026-10-11 · 上半部分按钮全部模块化（注册表见 railModules.ts），支持增删改查：
// 下组「检索」上方新增「工具」入口，面板列出全部模块（已在栏的灰显禁拖，未上栏的可拖入）；
// 栏内图标可拖拽排序，右键弹出「从侧边栏移除」；配置持久化 localStorage。「工具」按钮本身不参与增删改。
// 🔴 改动 2026-10-13 · 栏内模块拖拽时写入/清除「正在拖拽」内存态，供工具浮窗识别「拖回移除」落点。
import { useEffect, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  MessageSquareMore,
  Search,
  Settings,
  UserRoundPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang, type DictKey } from '@/lib/i18n'
import {
  RAIL_ADD_MIME,
  RAIL_MOVE_MIME,
  addRailModule,
  getRailModule,
  getRailOrder,
  moveRailModule,
  removeRailModule,
  setDraggingRailModule,
  useRailOrder,
  type PanelKey,
} from './railModules'
import type { ShellTheme } from './TopMenu'

export type { PanelKey } from './railModules'

/** 下组工具入口（静态，不模块化）：「工具」为模块仓库浮窗开关，其余仅导航高亮 */
interface BottomItem {
  key: string
  labelKey: DictKey
  icon: LucideIcon
  panel?: PanelKey
}
const BOTTOM_ITEMS: BottomItem[] = [
  { key: 'tools', labelKey: 'rail.tools', icon: Wrench, panel: 'tools' },
  { key: 'search', labelKey: 'rail.search', icon: Search },
  { key: 'feedback', labelKey: 'rail.feedback', icon: MessageSquareMore },
  { key: 'help', labelKey: 'rail.help', icon: UserRoundPlus },
  { key: 'settings', labelKey: 'rail.settings', icon: Settings },
]

interface RailButtonProps {
  icon: LucideIcon
  label: string
  active: boolean
  dark: boolean
  draggable?: boolean
  /** 拖放落点指示（inset 阴影线，不占布局不闪烁）：top = 插到本按钮前，bottom = 追加到末尾 */
  dropEdge?: 'top' | 'bottom' | null
  onSelect: () => void
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void
  onDragEnd?: () => void
  onDragOver?: (e: DragEvent<HTMLButtonElement>) => void
  onDrop?: (e: DragEvent<HTMLButtonElement>) => void
  onContextMenu?: (e: ReactMouseEvent<HTMLButtonElement>) => void
}

function RailButton({
  icon: Icon,
  label,
  active,
  dark,
  draggable,
  dropEdge,
  onSelect,
  ...handlers
}: RailButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      draggable={draggable}
      onClick={onSelect}
      {...handlers}
      className={cn(
        'flex w-full flex-col items-center gap-1.5 py-3.5 transition-colors',
        active
          ? 'text-[#397eff]'
          : dark
            ? 'text-sr-d-gray-5 hover:text-sr-d-gray-2'
            : 'text-sr-l-gray-4 hover:text-sr-l-gray-8',
        draggable && 'cursor-grab active:cursor-grabbing',
        dropEdge === 'top' && 'shadow-[inset_0_2px_0_#397eff]',
        dropEdge === 'bottom' && 'shadow-[inset_0_-2px_0_#397eff]',
      )}
    >
      <Icon size={22} strokeWidth={active ? 2 : 1.7} />
      <span className="text-[12px] font-medium leading-4">{label}</span>
    </button>
  )
}

/** 左侧图标导航栏 —— 上组为可增删改查的功能模块，下组贴底静态工具入口 */
export function SideRail({
  theme,
  panel,
  onTogglePanel,
  onClosePanel,
}: {
  theme: ShellTheme
  panel: PanelKey | null
  onTogglePanel: (key: PanelKey) => void
  onClosePanel: () => void
}) {
  const dark = theme === 'dark'
  const [active, setActive] = useState('overview')
  const { t } = useLang()
  const order = useRailOrder()
  const asideRef = useRef<HTMLElement>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ key: string; x: number; y: number } | null>(null)

  const handleSelect = (item: { key: string; panel?: PanelKey }) => {
    if (item.panel) {
      onTogglePanel(item.panel)
    } else {
      setActive(item.key)
      onClosePanel()
    }
  }
  const isActive = (item: { key: string; panel?: PanelKey }) =>
    item.panel ? panel === item.panel : active === item.key

  // ---------- 拖放（增 = 面板拖入；改 = 栏内排序。落点下标 = 悬停按钮处插到其前，尾部空白 = 追加） ----------
  const hasRailMime = (e: DragEvent) =>
    e.dataTransfer.types.includes(RAIL_ADD_MIME) || e.dataTransfer.types.includes(RAIL_MOVE_MIME)
  const dropAt = (index: number) => (e: DragEvent) => {
    if (!hasRailMime(e)) return
    e.preventDefault()
    e.stopPropagation()
    const addKey = e.dataTransfer.getData(RAIL_ADD_MIME)
    const moveKey = e.dataTransfer.getData(RAIL_MOVE_MIME)
    if (addKey) addRailModule(addKey, index)
    else if (moveKey) moveRailModule(moveKey, index)
    setDropIndex(null)
  }
  const dragOverAt = (index: number) => (e: DragEvent<HTMLButtonElement>) => {
    if (!hasRailMime(e)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(RAIL_MOVE_MIME) ? 'move' : 'copy'
    setDropIndex(index)
  }

  // ---------- 删：栏内图标右键菜单「从侧边栏移除」 ----------
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [ctxMenu])
  const openCtxMenu = (key: string) => (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const rect = asideRef.current?.getBoundingClientRect()
    setCtxMenu({ key, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) })
  }
  const handleRemove = (key: string) => {
    const mod = getRailModule(key)
    removeRailModule(key)
    // 移除的模块若正开着浮窗则一并收起；高亮落到剩余第一项
    if (mod?.panel && panel === mod.panel) onClosePanel()
    if (active === key) setActive(getRailOrder()[0] ?? '')
    setCtxMenu(null)
  }

  return (
    // data-board-overlay：点击侧边栏按钮后焦点留在按钮上，
    // 画板引擎需把它视为画板作用域，否则面板打开时 Del 删除卡片被吞
    <aside
      ref={asideRef}
      aria-label="侧边导航"
      data-board-overlay
      className={cn(
        'relative z-30 flex w-[76px] shrink-0 flex-col items-center border-r py-3',
        dark ? 'border-white/5 bg-sr-d-gray-10' : 'border-black/5 bg-sr-l-gray-0',
      )}
    >
      <nav
        className="flex w-full flex-col"
        aria-label="工作区"
        onDragOver={(e) => {
          // 落在按钮间隙/尾部空白 = 追加到末尾（按钮自身的 dragover 已 stopPropagation）
          if (e.target === e.currentTarget && hasRailMime(e)) {
            e.preventDefault()
            setDropIndex(order.length)
          }
        }}
        onDrop={dropAt(order.length)}
        onDragLeave={(e) => {
          if (!asideRef.current?.contains(e.relatedTarget as Node | null)) setDropIndex(null)
        }}
      >
        {order.map((key, i) => {
          const mod = getRailModule(key)
          if (!mod) return null
          return (
            <RailButton
              key={key}
              icon={mod.icon}
              label={t(mod.labelKey)}
              active={isActive(mod)}
              dark={dark}
              draggable
              dropEdge={
                dropIndex === i
                  ? 'top'
                  : dropIndex === order.length && i === order.length - 1
                    ? 'bottom'
                    : null
              }
              onSelect={() => handleSelect(mod)}
              onDragStart={(e) => {
                e.dataTransfer.setData(RAIL_MOVE_MIME, key)
                e.dataTransfer.effectAllowed = 'move'
                // 记录「正在拖的是哪个栏内模块」，供工具浮窗做落点反馈（dragover 阶段读不到 dataTransfer）
                setDraggingRailModule(key)
              }}
              onDragEnd={() => {
                // dragend 在浮窗外放手也会触发，正好清干净
                setDraggingRailModule(null)
                setDropIndex(null)
              }}
              onDragOver={dragOverAt(i)}
              onDrop={dropAt(i)}
              onContextMenu={openCtxMenu(key)}
            />
          )
        })}
        {order.length === 0 && (
          // 上栏清空后的落点占位：从「工具」面板拖一个模块到这里即可重新上栏
          <div
            onDragOver={(e) => {
              if (hasRailMime(e)) {
                e.preventDefault()
                setDropIndex(0)
              }
            }}
            onDrop={dropAt(0)}
            className={cn(
              'mx-2 my-2 flex items-center justify-center rounded-xl border border-dashed px-2 py-4 text-center text-[11px] leading-4',
              dark ? 'border-white/15 text-sr-d-gray-5' : 'border-black/15 text-sr-l-gray-4',
            )}
          >
            {t('rail.dropHere')}
          </div>
        )}
      </nav>
      <nav className="mt-auto flex w-full flex-col pb-2" aria-label="工具">
        {BOTTOM_ITEMS.map((item) => (
          <RailButton
            key={item.key}
            icon={item.icon}
            label={t(item.labelKey)}
            active={isActive(item)}
            dark={dark}
            onSelect={() => handleSelect(item)}
          />
        ))}
      </nav>
      {ctxMenu && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 min-w-[120px] rounded-xl border py-1 shadow-xl',
            dark ? 'border-white/10 bg-sr-d-gray-10' : 'border-black/10 bg-white',
          )}
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          // 挡住 document 级 pointerdown 关闭，让菜单项 click 先发生
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleRemove(ctxMenu.key)}
            className={cn(
              'flex w-full items-center px-3 py-2 text-left text-[12px] font-medium',
              dark ? 'text-sr-d-gray-2 hover:bg-white/8' : 'text-sr-l-gray-8 hover:bg-black/5',
            )}
          >
            {t('rail.remove')}
          </button>
        </div>
      )}
    </aside>
  )
}
