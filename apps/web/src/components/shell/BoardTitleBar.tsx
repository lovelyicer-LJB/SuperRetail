// 🔴 改动 2026-10-11 · 画板名称 + 路径横向浮窗 —— 移植版 Evoloop 顶部标题栏的 SuperRetail 形态：
// 吸附在总顶部菜单栏下方居中；名称可直接编辑（blur/Enter 提交，写回共用画板文档并持久化）。
import { useEffect, useRef, useState } from 'react'
import { getBoardEngine } from '@/modules/atlas/board/bridge'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ShellTheme } from './TopMenu'

// 🔴 改动 2026-10-12 · 默认画板名「画板」（Tab 坞常驻默认标签同名）
const FALLBACK_TITLE = '画板'

export function BoardTitleBar({ theme }: { theme: ShellTheme }) {
  const dark = theme === 'dark'
  const [title, setTitle] = useState(FALLBACK_TITLE)
  const focusedRef = useRef(false)
  const { t } = useLang()

  // 引擎挂载可能晚于本浮窗：低频轮询读文档标题；输入框聚焦期间不回读，避免打断编辑
  useEffect(() => {
    const read = () => {
      if (focusedRef.current) return
      const t = getBoardEngine()?.getDoc().title
      if (t) setTitle(t)
    }
    read()
    const timer = window.setInterval(read, 800)
    return () => window.clearInterval(timer)
  }, [])

  const commit = (raw: string) => {
    focusedRef.current = false
    const next = raw.trim() || FALLBACK_TITLE
    setTitle(next)
    getBoardEngine()?.setTitle(next)
  }

  return (
    <div
      aria-label="画板名称与路径"
      className={cn(
        'fixed left-1/2 top-[76px] z-40 flex h-10 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border pl-4 pr-2 shadow-xl backdrop-blur',
        dark ? 'border-white/10 bg-sr-d-gray-10/90' : 'border-black/5 bg-white/90',
      )}
    >
      <span className={cn('text-[12px] leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
        SuperRetail / {t('board.path')} /
      </span>
      <input
        value={title}
        aria-label={t('board.nameAria')}
        spellCheck={false}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            focusedRef.current = false
            setTitle(getBoardEngine()?.getDoc().title || FALLBACK_TITLE)
            e.currentTarget.blur()
          }
        }}
        className={cn(
          'w-40 rounded-full bg-transparent px-2 py-1 text-[13px] font-semibold leading-5 outline-none transition-colors',
          dark
            ? 'text-sr-d-gray-1 hover:bg-white/6 focus:bg-white/8'
            : 'text-sr-l-gray-11 hover:bg-black/4 focus:bg-black/5',
        )}
      />
    </div>
  )
}
