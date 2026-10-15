import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { Bell, Moon, Search, Sun } from 'lucide-react'
import { navigationModules } from '@/modules/registry'
import { useLang, type DictKey } from '@/lib/i18n'
import { BrandLogo } from './BrandLogo'
import { SettingsMenu } from './SettingsMenu'
import { BoardTools, ProcessCounter } from './BoardTools'
import { cn } from '@/lib/utils'

/** 中央导航 label 的 i18n 键（注册表中文 label 为回退） */
const NAV_KEYS: Record<string, DictKey> = {
  atlas: 'nav.atlas',
  market: 'nav.market',
  interaction: 'nav.interaction',
  workshop: 'nav.workshop',
}

export type ShellTheme = 'dark' | 'light'

export interface TopMenuUser {
  name: string
  role: string
}

interface TopMenuProps {
  theme?: ShellTheme
  loggedIn?: boolean
  user?: TopMenuUser
  onSearch?: (keyword: string) => void
  /** 🔴 改动 2026-10-11 · 深浅色模式开关回调（齿轮右侧） */
  onToggleTheme?: () => void
}

/**
 * 超零售 TopMenu —— 按 Figma「All Win SuperRetail Platform」Top menu (93:2236) 实现
 * 68px 高 · 左: LOGO+搜索 · 中: 四板块导航 · 右: 功能图标+用户/登录
 * 导航项由模块注册表 (src/modules/registry.ts) 装配, 新增板块无需改本组件
 */
export function TopMenu({
  theme = 'dark',
  loggedIn = true,
  user = { name: '林小超', role: '资产创作者' },
  onSearch,
  onToggleTheme,
}: TopMenuProps) {
  const dark = theme === 'dark'
  const navigate = useNavigate()
  const { t } = useLang()

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const keyword = new FormData(e.currentTarget).get('q')?.toString().trim()
    if (keyword) onSearch?.(keyword)
  }

  return (
    // 🔴 改动 2026-10-11 · 标记 data-board-overlay：顶栏按钮获得焦点后不阻断画板 Del 删除选中卡片
    <header
      data-board-overlay
      className={cn(
        // 🔴 改动 2026-10-01 · 提层级：顶部菜单始终在最顶层，不被放大后的地球画布等内容遮挡。
        'relative z-40 flex h-[68px] shrink-0 items-center px-6 font-sans',
        dark ? 'bg-sr-d-gray-10' : 'border-b border-sr-l-gray-2 bg-sr-l-gray-0',
      )}
    >
      {/* 左: 品牌 LOGO */}
      <NavLink to="/atlas" aria-label="超零售首页" className="shrink-0">
        <BrandLogo theme={theme} />
      </NavLink>

      {/* 左: 搜索框 (Figma: 220×36, rounded-5) */}
      <form
        onSubmit={handleSearch}
        className={cn(
          'ml-[70px] flex h-9 w-[220px] items-center gap-2 rounded-[5px] px-[14px]',
          dark ? 'bg-sr-d-gray-11' : 'bg-sr-l-gray-1',
        )}
      >
        <Search size={18} strokeWidth={1.8} className={dark ? 'text-sr-d-gray-6' : 'text-sr-l-gray-4'} />
        <input
          name="q"
          type="text"
          placeholder={t('top.searchPlaceholder')}
          autoComplete="off"
          className={cn(
            'w-full bg-transparent text-[16px] font-medium leading-4 tracking-[-0.144px] outline-none',
            dark
              ? 'text-sr-d-gray-1 placeholder:text-sr-d-gray-6'
              : 'text-sr-l-gray-11 placeholder:text-sr-l-gray-4',
          )}
        />
      </form>

      {/* 中: 四大板块导航 (居中, Figma: Inter SemiBold 16/20, gap 29) */}
      <nav className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[29px]">
        {navigationModules.map((m) => (
          <NavLink
            key={m.id}
            to={m.basePath}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap text-[16px] font-semibold leading-5 transition-colors',
                isActive
                  ? 'text-sr-nav-active'
                  : dark
                    ? 'text-sr-d-gray-2 hover:text-sr-d-gray-1'
                    : 'text-sr-l-gray-8 hover:text-sr-l-gray-11',
              )
            }
          >
            {NAV_KEYS[m.id] ? t(NAV_KEYS[m.id]) : m.navigation!.label}
          </NavLink>
        ))}
      </nav>

      {/* 右: 功能图标 + 用户 / 登录 */}
      <div className="ml-auto flex items-center">
        {loggedIn ? (
          <>
            {/* 🔴 改动 2026-10-11 · Evoloop 顶栏控件移植：process 计数（铃铛左）· 设置菜单（语言+Update）· Project/View/Sync（右侧） */}
            <div className="flex items-center gap-5">
              <ProcessCounter dark={dark} />
              <button
                type="button"
                aria-label={t('top.notifications')}
                className={cn(
                  'transition-colors',
                  dark ? 'text-sr-d-gray-2 hover:text-sr-d-gray-1' : 'text-sr-l-gray-8 hover:text-sr-l-gray-11',
                )}
              >
                <Bell size={24} strokeWidth={1.5} />
              </button>
              <SettingsMenu dark={dark} />
              {/* 🔴 改动 2026-10-11 · 深色/浅色模式开关（齿轮右侧）：滑块随主题移动，太阳=浅色 · 月亮=深色 */}
              <button
                type="button"
                role="switch"
                aria-checked={dark}
                aria-label={dark ? t('top.toLight') : t('top.toDark')}
                title={dark ? t('top.toLight') : t('top.toDark')}
                onClick={onToggleTheme}
                className={cn(
                  'relative flex h-7 w-[52px] shrink-0 items-center rounded-full border px-1 transition-colors',
                  dark ? 'border-white/15 bg-sr-d-gray-11' : 'border-black/10 bg-sr-l-gray-2',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full transition-transform duration-200',
                    dark
                      ? 'translate-x-[24px] bg-sr-d-gray-8 text-sr-d-gray-1'
                      : 'translate-x-0 bg-white text-sr-l-gray-8 shadow',
                  )}
                >
                  {dark ? <Moon size={13} strokeWidth={1.8} /> : <Sun size={13} strokeWidth={1.8} />}
                </span>
              </button>
              <BoardTools dark={dark} />
            </div>
            <button
              type="button"
              onClick={() => navigate('/me')}
              className="ml-10 flex items-center gap-2.5 rounded-md py-1 pr-1 text-left"
            >
              <span
                className="flex size-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ background: 'var(--sr-logo-gradient)' }}
              >
                {user.name.slice(0, 1)}
              </span>
              <span className="flex flex-col">
                <span
                  className={cn(
                    'whitespace-nowrap text-[14px] font-semibold leading-5 tracking-[-0.126px]',
                    dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-8',
                  )}
                >
                  {user.name}
                </span>
                <span className="whitespace-nowrap text-[12px] leading-4 text-sr-d-gray-5">{user.role}</span>
              </span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate('/me')}
              className={cn(
                'rounded-full px-5 py-2.5 text-[16px] font-bold leading-4 tracking-[-0.144px] transition-colors',
                dark ? 'text-sr-d-gray-1 hover:bg-white/5' : 'text-sr-l-gray-8 hover:bg-black/5',
              )}
            >
              {t('top.login')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/me')}
              className="rounded-md bg-sr-cta px-5 py-2.5 text-[16px] font-bold leading-4 tracking-[-0.144px] text-sr-d-gray-1 transition-opacity hover:opacity-90"
            >
              {t('top.join')}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
