// 🔴 改动 2026-10-11 · 四态资产体验页使用独立的窄屏顶栏适配范围。
import { useState } from 'react'
// 🔴 改动 2026-10-09 · 全息卡片在窄屏收起侧栏，保留完整预览空间。
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Moon, Sun } from 'lucide-react'
import { TopMenu, type ShellTheme } from '@/components/shell/TopMenu'
import { SideRail, type PanelKey } from '@/components/shell/SideRail'
// 🔴 改动 2026-10-10 · 左侧固定资产栏撤掉，品牌列表改为侧边栏「品牌」浮窗。
// 🔴 改动 2026-10-11 · 「规划」浮窗随侧边栏入口一并退役（PlanPanel 组件已删除）。
import { BrandsPanel } from '@/components/shell/BrandsPanel'
// 🔴 改动 2026-10-11 · 「循环」改为吸附侧边栏的 Evoloop 内容类型浮窗（共用版图底层无限画板）；
// Evoloop 覆盖层客户端退役（modules/loop/evoloopHost.ts 保留未引用），画板名称/路径浮窗随循环面板出现。
import { LoopPanel } from '@/components/shell/LoopPanel'
// 🔴 改动 2026-10-11 · 「实物」浮窗：工坊原材料数字卡进版图（点击/拖放建卡）
import { PhysicalPanel } from '@/components/shell/PhysicalPanel'
// 🔴 改动 2026-10-12 · 「角色」「配方」浮窗：工坊角色卡 / 配方卡列表进版图（点击/拖放建卡）
import { CharacterPanel } from '@/components/shell/CharacterPanel'
import { RecipePanel } from '@/components/shell/RecipePanel'
// 🔴 改动 2026-10-12 · 「菜品」浮窗：工坊菜品卡列表进版图（点击/拖放建卡）
import { DishPanel } from '@/components/shell/DishPanel'
// 🔴 改动 2026-10-12 · 市场浮窗（工坊市场卡列表：用户 / 采购方）
import { MarketPanel } from '@/components/shell/MarketPanel'
// 🔴 改动 2026-10-11 · 「工具」浮窗：侧边栏功能模块仓库（增删改查入口，见 railModules.ts）
import { ToolsPanel } from '@/components/shell/ToolsPanel'
import { BoardTitleBar } from '@/components/shell/BoardTitleBar'
import { LanguageProvider } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Outlet 上下文: 主题 + 版图图表浮窗开关（非版图页 chartsOpen 恒为 false） */
export interface ShellOutletContext {
  theme: ShellTheme
  chartsOpen: boolean
  setChartsOpen: (open: boolean) => void
}

/**
 * 应用外壳 —— TopMenu + 页面容器
 * 右下角悬浮按钮切换 Dark/Light, 用于对照 Figma 两种主题变体做 review
 * review 参数: ?theme=light 强制浅色 · ?loggedOut=1 预览未登录变体
 */
export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [theme, setTheme] = useState<ShellTheme>(params.get('theme') === 'light' ? 'light' : 'dark')
  const loggedOut = params.get('loggedOut') === '1'
  const dark = theme === 'dark'
  const isAtlas = location.pathname === '/atlas'
  // 🔴 改动 2026-10-10 · 侧边栏浮窗面板（图表/品牌）统一开关状态；非版图页点击先导航回版图画布。
  const [panel, setPanel] = useState<PanelKey | null>(null)

  const togglePanel = (key: PanelKey) => {
    setPanel((p) => (p === key ? null : key))
    // 所有浮窗（含循环）都只服务版图画布：非版图页点击先导航回版图
    if (!isAtlas) navigate('/atlas')
  }

  // 🔴 改动 2026-10-10 · 侧边栏仅版图页：离开版图时收起所有面板
  // 🔴 改动 2026-10-11 · effect 改为渲染期派生调整（React 推荐模式，消除 set-state-in-effect）
  if (!isAtlas && panel !== null) setPanel(null)

  return (
    // 🔴 改动 2026-10-11 · 中/英语言切换 Provider（设置菜单切换，覆盖外壳 chrome 文案）
    <LanguageProvider>
    <div className={cn('flex min-h-screen flex-col', dark ? 'bg-sr-d-gray-11' : 'bg-sr-l-gray-1', location.pathname === '/workshop/asset-system' && 'asset-lab-host')}>
      {/* 🔴 改动 2026-10-11 · 顶栏接入深浅色开关（齿轮右侧），与右下角 review 悬浮钮共用同一 theme 状态 */}
      <TopMenu theme={theme} loggedIn={!loggedOut} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      {/* 🔴 改动 2026-10-02 · 顶部菜单下方挂左侧图标导航栏，主内容区自适应收窄 */}
      {/* 🔴 改动 2026-10-09 · 卡片类全屏展示页（编号 5 全息卡、食品原材料卡）隐藏侧栏。 */}
      <div className={cn('flex flex-1', (location.pathname === '/workshop/nft-card-05' || location.pathname === '/workshop/food-cards') && 'nft-showcase-shell')}>
        {/* 🔴 改动 2026-10-10 · 侧边栏只在版图页渲染：商城/互动/工坊后续做各自 UI，不带这条栏 */}
        {isAtlas && (
          <SideRail theme={theme} panel={panel} onTogglePanel={togglePanel} onClosePanel={() => setPanel(null)} />
        )}
        <main className="min-w-0 flex-1">
          <Outlet
            context={
              {
                theme,
                chartsOpen: isAtlas && panel === 'charts',
                setChartsOpen: (open: boolean) => setPanel(open ? 'charts' : null),
              } satisfies ShellOutletContext
            }
          />
        </main>
      </div>

      {/* 🔴 改动 2026-10-10 · 品牌浮窗（图表浮窗由版图页渲染, 支持拖出到画板） */}
      {panel === 'brands' && <BrandsPanel theme={theme} onClose={() => setPanel(null)} />}

      {/* 🔴 改动 2026-10-11 · 循环浮窗（Evoloop 内容类型）+ 画板名称/路径浮窗，仅版图页 */}
      {isAtlas && panel === 'loop' && <LoopPanel theme={theme} onClose={() => setPanel(null)} />}
      {isAtlas && panel === 'loop' && <BoardTitleBar theme={theme} />}

      {/* 🔴 改动 2026-10-11 · 实物浮窗（工坊原材料卡列表，点击/拖放进版图），仅版图页 */}
      {isAtlas && panel === 'physical' && <PhysicalPanel theme={theme} onClose={() => setPanel(null)} />}

      {/* 🔴 改动 2026-10-12 · 角色 / 配方浮窗（工坊角色卡 / 配方卡列表，点击/拖放进版图），仅版图页 */}
      {isAtlas && panel === 'characters' && <CharacterPanel theme={theme} onClose={() => setPanel(null)} />}
      {isAtlas && panel === 'recipes' && <RecipePanel theme={theme} onClose={() => setPanel(null)} />}

      {/* 🔴 改动 2026-10-12 · 菜品浮窗（工坊菜品卡列表，点击/拖放进版图），仅版图页 */}
      {isAtlas && panel === 'dishes' && <DishPanel theme={theme} onClose={() => setPanel(null)} />}

      {/* 🔴 改动 2026-10-12 · 市场浮窗（工坊市场卡列表：用户 / 采购方，点击/拖放进版图），仅版图页 */}
      {isAtlas && panel === 'market' && <MarketPanel theme={theme} onClose={() => setPanel(null)} />}

      {/* 🔴 改动 2026-10-11 · 工具浮窗（侧边栏模块仓库：全部功能列表，未上栏的可拖入），仅版图页 */}
      {isAtlas && panel === 'tools' && <ToolsPanel theme={theme} onClose={() => setPanel(null)} />}

      {/* review 用主题切换 */}
      {/* 🔴 改动 2026-10-11 · data-board-overlay：按钮获得焦点后不阻断画板 Del 删除选中卡片 */}
      <button
        type="button"
        data-board-overlay
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label="切换主题"
        className={cn(
          'fixed bottom-6 right-6 z-50 flex size-10 items-center justify-center rounded-full border shadow-lg transition-colors',
          dark
            ? 'border-white/10 bg-sr-d-gray-10 text-sr-d-gray-2 hover:text-sr-d-gray-1'
            : 'border-black/10 bg-white text-sr-l-gray-8 hover:text-sr-l-gray-11',
        )}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
    </LanguageProvider>
  )
}
