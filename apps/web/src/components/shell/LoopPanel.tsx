// 🔴 改动 2026-10-11 · 循环浮窗 —— 移植版 Evoloop 的内容类型栏改造为「吸附版图侧边栏右侧」的弹出列表
// （与图表/品牌浮窗同形式）；点击在共用画板中心建卡，拖拽到画板落点建卡。
// 图标与样式 1:1 复刻 Evoloop「All cards」组件池：深色圆角方块 + 浅色描边 SVG（railIcon 变体），
// 3 列网格；底层画板当前仅支持 笔记/待办/连线/画板，其余类型以禁用态陈列（即将支持）。
import { X } from 'lucide-react'
import { getBoardEngine } from '@/modules/atlas/board/bridge'
import { useLang, type DictKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ShellTheme } from './TopMenu'

/** 内容类型 label 的 i18n 键（item.label 中文保留为回退） */
const LABEL_KEYS: Record<string, DictKey> = {
  note: 'tool.note', todo: 'tool.todo', line: 'tool.line', board: 'tool.board',
  link: 'type.link', workflow: 'type.workflow', column: 'type.column', comment: 'type.comment',
  table: 'type.table', sketch: 'type.sketch', color: 'type.color', document: 'type.document',
  audio: 'type.audio', map: 'type.map', video: 'type.video', image: 'type.image',
  upload: 'type.upload', draw: 'type.draw',
}

interface LoopItem {
  type: string
  label: string
  /** 原版 Evoloop SVG 路径（client.js railIcon / contentIcon，24×24 描边风格） */
  path: string
  /** board 为实心填充图标（railIcon 特例：fill=currentColor, stroke=none） */
  filled?: boolean
  enabled: boolean
}

/** 底层画板已支持的类型（映射 engine 的 addCard / drop 协议） */
const ENABLED = new Set(['note', 'todo', 'line', 'board'])

/**
 * 1:1 复刻 Evoloop railIcon：note/todo/board/comment/column 走 rail 变体路径，
 * 其余走 contentIcon 路径（描边 1.6 / 圆角端点）。
 */
const PATHS: Record<string, string> = {
  note: 'M3 6h18 M3 10h18 M3 14h18 M3 18h13',
  link: 'M10 14l4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M13 17a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1',
  todo: 'M3 7l2 2 3-4 M11 7h10 M3 16l2 2 3-4 M11 16h10',
  workflow: 'M3 9h6v6H3z M15 2h6v6h-6z M15 16h6v6h-6z M9 12h3 M12 5v14 M12 5h3 M12 19h3',
  line: 'M4 20L20 4 M11 4h9v9',
  board: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  column: 'M3 3h18v18H3z M3 8h18',
  comment: 'M3 6h18 M3 10h18 M3 14h18 M10 18h4',
  table: 'M3 4h18v16H3z M3 9h18 M3 14h18 M9 4v16 M15 4v16',
  sketch: 'M4 20l1-6L16 3l5 5L10 19z M13 6l5 5 M5 14l5 5',
  color: 'M12 3L4 14a5 5 0 0 0 4 7h8a5 5 0 0 0 4-7z M7 13h10',
  document: 'M5 3h9l5 5v13H5z M14 3v5h5 M8 12h8 M8 16h8',
  audio: 'M9 18V5l11-2v13 M9 9l11-2 M9 18c0 4-7 4-7 0s7-4 7 0 M20 16c0 4-7 4-7 0s7-4 7 0',
  map: 'M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  video: 'M4 4h16v16H4z M10 8l6 4-6 4z',
  image: 'M3 4h18v16H3z M3 16l6-6 5 5 3-3 4 4 M17 8h.01',
  upload: 'M12 16V3 M6 9l6-6 6 6 M4 15v6h16v-6',
  draw: 'M3 19c4-10 5-14 8-13s-5 12-2 13 5-11 8-10-4 7-1 8 4-3 5-2',
}

/** 1:1 复刻 Evoloop CONTENT_TYPES 排列顺序（标签沿用中文版） */
const ITEMS: LoopItem[] = [
  { type: 'note', label: '笔记' },
  { type: 'link', label: '链接' },
  { type: 'todo', label: '待办' },
  { type: 'workflow', label: 'WorkFlow' },
  { type: 'line', label: '连线' },
  { type: 'board', label: '画板', filled: true },
  { type: 'column', label: '分栏' },
  { type: 'comment', label: '评论' },
  { type: 'table', label: '表格' },
  { type: 'sketch', label: '草图' },
  { type: 'color', label: '色块' },
  { type: 'document', label: '文档' },
  { type: 'audio', label: '音频' },
  { type: 'map', label: '地图' },
  { type: 'video', label: '视频' },
  { type: 'image', label: '图片' },
  { type: 'upload', label: '上传' },
  { type: 'draw', label: '绘图' },
].map((it) => ({ ...it, path: PATHS[it.type] ?? PATHS.note, enabled: ENABLED.has(it.type) }))

/** 循环浮窗 —— 侧边栏「循环」按钮触发, 驱动版图底层共用画板 */
export function LoopPanel({ theme, onClose }: { theme: ShellTheme; onClose: () => void }) {
  const dark = theme === 'dark'
  const { t } = useLang()

  const handlePick = (item: LoopItem) => {
    if (!item.enabled) return
    getBoardEngine()?.addCard(item.type as 'note' | 'todo' | 'line' | 'board')
    onClose()
  }

  return (
    // 🔴 改动 2026-10-11 · 标记 data-board-overlay：画板引擎把浮窗视为画板作用域，面板打开时 Del 删除卡片不失效
    <aside
      aria-label="循环面板"
      data-board-overlay
      className={cn(
        // 🔴 改动 2026-10-11 · 浮窗背景换液态玻璃（sr-glass-*，见 index.css），实心底+shadow-2xl 退役
        'fixed left-[84px] top-[76px] z-40 flex max-h-[calc(100vh-96px)] w-[272px] flex-col overflow-hidden rounded-2xl border',
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
            {t('panel.loop')}
          </h2>
          <p className={cn('mt-0.5 text-[11px] leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
            {t('panel.loopSub')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.loopClose')}
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
      <div className="sr-loop-scroll grid flex-1 grid-cols-3 content-start gap-1 overflow-y-auto px-3 py-3">
        {ITEMS.map((item) => {
          const label = LABEL_KEYS[item.type] ? t(LABEL_KEYS[item.type]) : item.label
          return (
          <button
            key={item.type}
            type="button"
            title={item.enabled ? `${label} · ${t('loop.tipCreate')}` : `${label} · ${t('loop.tipSoon')}`}
            disabled={!item.enabled}
            draggable={item.enabled}
            onDragStart={(e) => {
              // 与底层画板 drop 协议一致（text/plain = 类型）
              e.dataTransfer.setData('text/plain', item.type)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => handlePick(item)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-colors',
              item.enabled
                ? dark ? 'hover:bg-white/6' : 'hover:bg-black/4'
                : 'cursor-not-allowed opacity-35',
            )}
          >
            {/* 原版 Evoloop「All cards」深色方块图标（描边 SVG；board 为实心填充） */}
            <span
              className={cn(
                'flex size-10 items-center justify-center rounded-[10px]',
                dark ? 'bg-[#343434] text-[#e7e7e7]' : 'bg-[#e9e9ec] text-[#3a3a3e]',
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill={item.filled ? 'currentColor' : 'none'}
                stroke={item.filled ? 'none' : 'currentColor'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.path} />
              </svg>
            </span>
            <span className={cn('text-[11px] font-medium leading-4', dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8')}>
              {label}
            </span>
          </button>
          )
        })}
      </div>
      <style>{`
        .sr-loop-scroll { scrollbar-width: thin; scrollbar-color: rgba(112,112,124,.45) transparent; }
        .sr-loop-scroll::-webkit-scrollbar { width: 6px; }
        .sr-loop-scroll::-webkit-scrollbar-thumb { background: rgba(112,112,124,.45); border-radius: 3px; }
        .sr-loop-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </aside>
  )
}
