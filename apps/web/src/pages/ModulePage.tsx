// 🔴 改动 2026-10-11 · 工坊新增醒目的四态数字资产入口，保留原卡片入口。
import { Link, useOutletContext } from 'react-router'
import type { ModuleId } from '@/modules/types'
import { getModule } from '@/modules/registry'
import type { ShellTheme } from '@/components/shell/TopMenu'
import { cn } from '@/lib/utils'

/**
 * 模块占位页 —— 板块内容后续实现; 当前展示模块清单(manifest)声明,
 * 验证 TopMenu 导航与模块化装配是否工作
 */
export function ModulePage({ id }: { id: ModuleId }) {
  const { theme } = useOutletContext<{ theme: ShellTheme }>()
  const dark = theme === 'dark'
  const mod = getModule(id)

  return (
    <div className="mx-auto max-w-5xl px-8 py-14 font-sans">
      <p
        className={cn(
          'font-display text-[13px] font-semibold uppercase tracking-[0.3em]',
          dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4',
        )}
      >
        {mod.nameEn} · {mod.basePath}
      </p>
      <h1
        className={cn(
          'mt-3 font-display text-[48px] font-bold leading-tight',
          dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11',
        )}
      >
        {mod.name}
      </h1>
      <p className={cn('mt-4 text-[16px] leading-6', dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8')}>
        {mod.tagline}
      </p>

      {id === 'workshop' && (
        <div className={cn('mt-10 flex flex-wrap gap-5', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
          <Link to="/workshop/asset-system" className={cn('flex w-full items-center gap-6 rounded-2xl border p-6 transition-colors', dark ? 'border-[#805241]/50 bg-[#261e1b] hover:bg-[#30231e]' : 'border-[#cfae9d] bg-[#f4e8e0] hover:bg-[#efded3]')}>
            <img src={`${import.meta.env.BASE_URL}assets/food-cards/anjihai-chili-clean.png`} alt="安集海辣皮子" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
            <div><p className="text-[10px] tracking-[.2em] opacity-50">ONE ASSET. FOUR FORMS.</p><h2 className="mt-2 text-2xl font-medium">数字资产 · 四种形态</h2><p className="mt-2 text-sm opacity-60">安集海辣皮子 / 信息组件 · 图标 · 卡片 · 节点</p><p className="mt-3 text-xs">查看四态设计与可交互资产网络 →</p></div>
          </Link>
          <Link to="/workshop/nft-card-05" className={cn('flex max-w-xl flex-1 items-center gap-7 rounded-2xl border p-6 transition-colors', dark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/10 bg-white hover:bg-violet-50')}>
            <img src={`${import.meta.env.BASE_URL}assets/nft-card-05/poster.webp`} alt="编号 5 全息卡片" className="h-40 w-28 object-contain" />
            <div><p className="text-[11px] tracking-[.2em] opacity-50">NFT CARD / 05</p><h2 className="mt-2 text-2xl font-medium">Holographic</h2><p className="mt-3 text-sm opacity-60">全息材质 · 动态预览</p><p className="mt-5 text-xs">查看卡片 →</p></div>
          </Link>
          {/* 🔴 改动 2026-10-09 · 工坊增加原材料数字卡对比页入口。 */}
          {/* 🔴 改动 2026-10-12 · 工坊增加收益连线金色状态对比演示入口。 */}
          {/* 🔴 改动 2026-10-13 · 语义对齐技能系统：已形成收益（金色虚线框）vs 收益线程（技能激活） */}
          <Link to="/workshop/revenue-wires" className={cn('flex max-w-xl flex-1 items-center gap-7 rounded-2xl border p-6 transition-colors', dark ? 'border-[#8a6a1f]/40 bg-[#26200f] hover:bg-[#2f2712]' : 'border-[#d8bd7a] bg-[#faf3e3] hover:bg-[#f6ecd4]')}>
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4ad57] via-[#eed193] to-[#90661f] text-3xl text-white shadow-lg">⌁</div>
            <div><p className="text-[10px] tracking-[.2em] opacity-50">REVENUE LOOP & THREAD / TWO STATES</p><h2 className="mt-2 text-2xl font-medium">收益循环 & 收益线程</h2><p className="mt-2 text-sm opacity-60">已形成收益 · 虚线框 vs 形成循环 · 实线框 · 技能激活执行流</p><p className="mt-3 text-xs">查看对比 →</p></div>
          </Link>
          {/* 🔴 改动 2026-10-13 · 工坊增加收益循环 & 收益线程演示入口：金色虚线框 + 技能点击/拖入激活。 */}
          <Link to="/workshop/revenue-thread" className={cn('flex max-w-xl flex-1 items-center gap-7 rounded-2xl border p-6 transition-colors', dark ? 'border-[#8a6a1f]/40 bg-[#26200f] hover:bg-[#2f2712]' : 'border-[#d8bd7a] bg-[#faf3e3] hover:bg-[#f6ecd4]')}>
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center text-3xl text-amber-500">
              <span className="absolute inset-0 rounded-2xl border-2 border-dashed border-amber-500/80" />
              <span className="relative">⌁</span>
            </div>
            <div><p className="text-[10px] tracking-[.2em] opacity-50">REVENUE LOOP & THREAD / SKILL ACTIVATION</p><h2 className="mt-2 text-2xl font-medium">收益循环 & 收益线程</h2><p className="mt-2 text-sm opacity-60">技能点击或拖入虚线框 → 激活工作流 · 循环回流 / 线程单向脉冲</p><p className="mt-3 text-xs">运行技能 →</p></div>
          </Link>
          <Link to="/workshop/food-cards" className={cn('flex max-w-xl flex-1 items-center gap-7 rounded-2xl border p-6 transition-colors', dark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/10 bg-white hover:bg-violet-50')}>
            <img src={`${import.meta.env.BASE_URL}assets/food-cards/xihu-longjing-clean.png`} alt="原材料数字卡" className="h-40 w-28 rounded-xl object-cover" />
            <div><p className="text-[11px] tracking-[.2em] opacity-50">FOOD ASSET CARDS / 03</p><h2 className="mt-2 text-2xl font-medium">原材料数字卡</h2><p className="mt-3 text-sm opacity-60">茶叶 · 火腿 · 辣椒 · 三卡对比</p><p className="mt-5 text-xs">查看卡片 →</p></div>
          </Link>
        </div>
      )}
      {/* 🔴 改动 2026-10-12 · 工坊页撤下能力占位声明（查询/命令/权限卡片 + 脚注）；其余模块占位页保留 */}
      {id !== 'workshop' && (
        <>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            <CapabilityCard theme={theme} title="查询 Queries" items={mod.capabilities.queries} />
            <CapabilityCard theme={theme} title="命令 Commands" items={mod.capabilities.commands} />
            <CapabilityCard theme={theme} title="权限 Permissions" items={mod.permissions} />
          </div>

          <p className={cn('mt-10 text-[12px] leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
            能力接口为占位声明（架构 §08），将来经同一应用服务暴露给 Web BFF 与 MCP tools；本页仅验证模块装配。
          </p>
        </>
      )}
    </div>
  )
}

function CapabilityCard({ theme, title, items }: { theme: ShellTheme; title: string; items: string[] }) {
  const dark = theme === 'dark'
  return (
    <section
      className={cn(
        'rounded-lg border p-5',
        dark ? 'border-white/5 bg-sr-d-gray-10' : 'border-black/5 bg-white',
      )}
    >
      <h2 className={cn('text-[12px] font-semibold leading-4', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              'rounded-[5px] px-2 py-1 font-mono text-[12px] leading-4',
              dark ? 'bg-sr-d-gray-11 text-sr-d-gray-2' : 'bg-sr-l-gray-1 text-sr-l-gray-8',
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
