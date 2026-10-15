// 🔴 改动 2026-10-11 · 顶栏「设置」菜单（齿轮下拉）—— 移植 Evoloop 顶栏两个入口：
// 语言切换（中/英，写 localStorage 全壳生效）+ Update（当前版本 + 手动检查更新，本地移植版无更新源 → 恒为最新）。
import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** 应用版本（与 package.json version 对齐；tsconfig 未开 resolveJsonModule，手工维护） */
const APP_VERSION = '0.0.0'

type UpdateState = 'idle' | 'checking' | 'uptodate'

export function SettingsMenu({ dark }: { dark: boolean }) {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)
  const [update, setUpdate] = useState<UpdateState>('idle')
  const wrapRef = useRef<HTMLDivElement>(null)

  // 点击菜单外自动收起
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // 本地移植版没有更新源：模拟一次检查，结论恒为「已是最新」（对齐原版降级应答）
  const checkUpdate = () => {
    if (update === 'checking') return
    setUpdate('checking')
    window.setTimeout(() => setUpdate('uptodate'), 700)
  }

  const langBtn = (active: boolean) =>
    cn(
      'flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors',
      active
        ? 'bg-sr-nav-active text-white'
        : dark
          ? 'text-sr-d-gray-3 hover:bg-white/6 hover:text-sr-d-gray-1'
          : 'text-sr-l-gray-6 hover:bg-black/5 hover:text-sr-l-gray-11',
    )

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={t('top.settings')}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('top.settings')}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'transition-colors',
          dark ? 'text-sr-d-gray-2 hover:text-sr-d-gray-1' : 'text-sr-l-gray-8 hover:text-sr-l-gray-11',
        )}
      >
        <Settings size={24} strokeWidth={1.5} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('top.settings')}
          className={cn(
            'absolute right-0 top-[calc(100%+10px)] z-50 flex w-[232px] flex-col gap-3 rounded-xl border p-3.5 shadow-2xl',
            dark ? 'border-white/10 bg-sr-d-gray-10' : 'border-black/8 bg-sr-l-gray-0',
          )}
        >
          {/* 语言切换（移植 Evoloop 顶栏语言下拉） */}
          <div>
            <div className={cn('mb-1.5 text-[12px] leading-4', dark ? 'text-sr-d-gray-4' : 'text-sr-l-gray-4')}>
              {t('settings.language')}
            </div>
            <div
              className={cn(
                'flex gap-1 rounded-lg p-1',
                dark ? 'bg-sr-d-gray-11' : 'bg-sr-l-gray-1',
              )}
            >
              <button type="button" role="menuitemradio" aria-checked={lang === 'zh'} onClick={() => setLang('zh')} className={langBtn(lang === 'zh')}>
                简体中文
              </button>
              <button type="button" role="menuitemradio" aria-checked={lang === 'en'} onClick={() => setLang('en')} className={langBtn(lang === 'en')}>
                English
              </button>
            </div>
          </div>
          <div className={cn('h-px', dark ? 'bg-white/6' : 'bg-black/6')} />
          {/* Update（移植 Evoloop version-menu：当前版本 + 手动检查） */}
          <div className="flex flex-col gap-2">
            <div className={cn('flex items-center justify-between text-[12px] leading-4', dark ? 'text-sr-d-gray-4' : 'text-sr-l-gray-4')}>
              <span>{t('settings.currentVersion')}</span>
              <b className={cn('font-semibold tabular-nums', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>{APP_VERSION}</b>
            </div>
            <button
              type="button"
              onClick={checkUpdate}
              disabled={update === 'checking'}
              className={cn(
                'rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors',
                update === 'checking'
                  ? 'cursor-wait opacity-60'
                  : 'bg-sr-nav-active text-white hover:opacity-90',
                update === 'checking' && (dark ? 'bg-sr-d-gray-8 text-sr-d-gray-3' : 'bg-sr-l-gray-2 text-sr-l-gray-5'),
              )}
            >
              {t('settings.update')}
            </button>
            {update !== 'idle' && (
              <div
                role="status"
                className={cn(
                  'text-[11px] leading-4',
                  update === 'uptodate' ? 'text-emerald-400' : dark ? 'text-sr-d-gray-4' : 'text-sr-l-gray-4',
                )}
              >
                {update === 'checking' ? t('settings.checking') : t('settings.upToDate')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
