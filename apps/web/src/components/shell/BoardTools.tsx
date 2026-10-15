// 🔴 改动 2026-10-11 · 顶栏画板工具组 —— 移植 Evoloop 顶栏控件：
// ProcessCounter（已完成任务计数，放铃铛左侧）/ Project（打开画板文件）/ View（缩放百分比下拉）/ Sync（立即落盘）。
// 引擎未挂载（非版图页）时工具按钮禁用、计数归零。
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, FolderOpen, RefreshCw } from 'lucide-react'
import { useBoardDocVersion, useBoardEngine, useBoardZoom } from '@/modules/atlas/board/hooks'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300]

/** 已完成任务计数（绿色徽标 · 铃铛左侧）：实时统计画板 todo 卡中已勾选的条目数 */
export function ProcessCounter({ dark }: { dark: boolean }) {
  const engine = useBoardEngine()
  const docVersion = useBoardDocVersion()
  const { t } = useLang()

  const done = useMemo(() => {
    void docVersion // 文档每次变更触发重算
    if (!engine) return 0
    let n = 0
    for (const card of engine.getDoc().cards) {
      if (card.type !== 'todo') continue
      for (const item of card.meta.items ?? []) if (item.done) n += 1
    }
    return n
  }, [engine, docVersion])

  return (
    <div
      title={t('counter.title')}
      aria-label={`${t('counter.title')}: ${done}`}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        dark ? 'border-white/10 bg-white/4' : 'border-black/8 bg-black/3',
      )}
    >
      <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
      <span
        className={cn(
          'min-w-[1ch] text-center text-[13px] font-semibold leading-4 tabular-nums',
          dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11',
        )}
      >
        {done}
      </span>
    </div>
  )
}

/** Project / View / Sync 三个画板工具按钮（顶栏右侧） */
export function BoardTools({ dark }: { dark: boolean }) {
  const engine = useBoardEngine()
  const zoom = useBoardZoom()
  const { t } = useLang()
  const fileRef = useRef<HTMLInputElement>(null)
  const viewWrapRef = useRef<HTMLDivElement>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [synced, setSynced] = useState(false)
  const noEngine = !engine

  // 点击 View 下拉外自动收起
  useEffect(() => {
    if (!viewOpen) return
    const onDown = (e: PointerEvent) => {
      if (viewWrapRef.current && e.target instanceof Node && !viewWrapRef.current.contains(e.target)) setViewOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [viewOpen])

  // Project：选择本地画板 JSON → 引擎校验并整体替换当前画板
  const openBoardFile = async (file: File) => {
    try {
      const doc: unknown = JSON.parse(await file.text())
      if (!engine || !engine.loadDoc(doc)) window.alert(t('project.invalid'))
    } catch (e) {
      window.alert(`${t('project.openFailed')}：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Sync：绕过 800ms 防抖立即落盘，勾选图标反馈 1.2s
  const syncNow = () => {
    if (!engine) return
    engine.flushSave()
    setSynced(true)
    window.setTimeout(() => setSynced(false), 1200)
  }

  const btnCls = (disabled: boolean, text = false) =>
    cn(
      'transition-colors',
      text && 'rounded-md px-1.5 py-0.5 text-[13px] font-semibold tabular-nums',
      disabled
        ? 'cursor-not-allowed opacity-35'
        : dark
          ? 'text-sr-d-gray-2 hover:text-sr-d-gray-1'
          : 'text-sr-l-gray-8 hover:text-sr-l-gray-11',
    )

  const zoomPct = zoom === null ? null : Math.round(zoom * 100)

  return (
    <div className="flex items-center gap-4">
      {/* Project · 打开画板文件（隐藏 file input 承接选择） */}
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void openBoardFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        aria-label={t('project.title')}
        title={t('project.title')}
        disabled={noEngine}
        onClick={() => fileRef.current?.click()}
        className={btnCls(noEngine)}
      >
        <FolderOpen size={22} strokeWidth={1.6} />
      </button>
      {/* View · 缩放百分比（复刻 Evoloop 视图下拉：25%–300% 预设，当前值高亮） */}
      <div ref={viewWrapRef} className="relative">
        <button
          type="button"
          aria-label={t('view.title')}
          title={t('view.title')}
          aria-haspopup="menu"
          aria-expanded={viewOpen}
          disabled={noEngine}
          onClick={() => setViewOpen((o) => !o)}
          className={btnCls(noEngine, true)}
        >
          <span>{zoomPct === null ? '—' : `${zoomPct}%`}</span>
        </button>
        {viewOpen && !noEngine && (
          <div
            role="menu"
            aria-label={t('view.title')}
            className={cn(
              'absolute right-0 top-[calc(100%+10px)] z-50 flex max-h-64 w-24 flex-col overflow-y-auto rounded-xl border p-1.5 shadow-2xl',
              dark ? 'border-white/10 bg-sr-d-gray-10' : 'border-black/8 bg-sr-l-gray-0',
            )}
          >
            {ZOOM_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                role="menuitem"
                onClick={() => {
                  engine?.setZoomPct(pct)
                  setViewOpen(false)
                }}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-left text-[12px] tabular-nums transition-colors',
                  pct === zoomPct
                    ? 'bg-sr-nav-active font-semibold text-white'
                    : dark
                      ? 'text-sr-d-gray-2 hover:bg-white/6'
                      : 'text-sr-l-gray-8 hover:bg-black/5',
                )}
              >
                {pct}%
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Sync · 立即落盘 */}
      <button
        type="button"
        aria-label={synced ? t('sync.done') : t('sync.title')}
        title={synced ? t('sync.done') : t('sync.title')}
        disabled={noEngine}
        onClick={syncNow}
        className={btnCls(noEngine)}
      >
        {synced ? <Check size={22} strokeWidth={2} className="text-emerald-400" /> : <RefreshCw size={22} strokeWidth={1.6} />}
      </button>
    </div>
  )
}
