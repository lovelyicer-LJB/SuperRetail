// 🔴 改动 2026-10-12 · 工坊演示页：收益连线的两种金色状态对比。
// 🔴 改动 2026-10-13 · 语义对齐版图画板技能系统：已形成收益（金色虚线框 · 「运行」技能激活）
// vs 已形成循环（收益节点回流买入端口 → 实线框 · 「运转」技能激活 → 收益循环）。
// 左右并排挂两台真实画板引擎（独立内存文档，onPersist 置空不落盘、不污染主画板）。
import { Link, useOutletContext } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import type { ShellTheme } from '@/components/shell/TopMenu'
import { BoardCanvas } from '@/modules/atlas/board/BoardCanvas'
import type { BoardDoc } from '@/modules/atlas/board/types'
import { cn } from '@/lib/utils'

/** 演示公共卡片：安集海辣皮子（卖方）、西湖龙井（对照链路）、辣龙腿配方（买方）、收益节点 */
function demoCards(): BoardDoc['cards'] {
  return [
    { id: 'c-chili', type: 'food', x: 20, y: 20, w: 238, h: 172, text: '', meta: { foodId: 'anjihai-chili', form: 'node' } },
    { id: 'c-tea', type: 'food', x: 20, y: 230, w: 238, h: 172, text: '', meta: { foodId: 'xihu-longjing', form: 'node' } },
    { id: 'c-recipe', type: 'recipe', x: 470, y: 90, w: 238, h: 232, text: '', meta: { recipeId: 'la-long-tui', form: 'node' } },
    { id: 'c-rev', type: 'revenue', x: 240, y: 400, w: 238, h: 160, text: '', meta: { sale: 'l-sale', title: '安集海辣皮子 · 收益' } },
  ]
}
function demoLines(): BoardDoc['lines'] {
  return [
    { id: 'l-supply', from: 'c-chili', to: 'c-recipe', fromPort: 'supply', toPort: 'ing-0' },
    { id: 'l-tea', from: 'c-tea', to: 'c-recipe', fromPort: 'supply', toPort: 'ing-1' },
    { id: 'l-sale', from: 'c-chili', to: 'c-recipe', fromPort: 'sell', toPort: 'buy' },
  ]
}

/** 已形成收益场景：收益节点已生成（卖出连线成立），链路连线渐变金 + 金色虚线框，可用「运行」技能激活 */
function staticDoc(): BoardDoc {
  return { title: '已形成收益 · 待激活', viewport: { x: 24, y: 8, zoom: 0.78 }, cards: demoCards(), lines: demoLines() }
}
/** 收益循环场景：收益节点「原料补货」回流到卖方买入端口 → 形成循环（实线框），已由「运转」技能激活 */
function loopDoc(): BoardDoc {
  return {
    title: '收益循环 · 已激活',
    viewport: { x: 24, y: 8, zoom: 0.78 },
    cards: demoCards().map((c) => (c.id === 'c-rev' ? { ...c, meta: { ...c.meta, activated: true } } : c)),
    lines: [...demoLines(), { id: 'l-back', from: 'c-rev', to: 'c-chili', fromPort: 'materials', toPort: 'in' }],
  }
}

export function RevenueWiresPage() {
  const { theme } = useOutletContext<{ theme: ShellTheme }>()
  const dark = theme === 'dark'
  return (
    <div className={cn('mx-auto max-w-6xl px-8 py-12 font-sans', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
      <Link to="/workshop" className="inline-flex items-center gap-2 text-[12px] opacity-60 transition-opacity hover:opacity-100">
        <ArrowLeft size={14} /> 返回工坊
      </Link>
      <p className={cn('mt-6 text-[11px] font-semibold uppercase tracking-[0.3em]', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
        REVENUE LOOP & THREAD / GOLDEN FRAME
      </p>
      <h1 className="mt-3 font-display text-[36px] font-bold leading-tight">收益循环 & 收益线程</h1>
      <p className={cn('mt-3 max-w-3xl text-[14px] leading-6', dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8')}>
        资产卡从「卖出」端口接线后会自动生成收益节点，链路连线变金并出现<strong>金色虚线框</strong>——
        系统提示「已形成收益」，用<strong>「运行」技能</strong>激活为<strong>收益线程</strong>；
        若收益节点连线到链路内资产的<strong>买入端口</strong>，则判定形成循环、外框转<strong>金色实线框</strong>，
        用<strong>「运转」技能</strong>激活为<strong>收益循环</strong>。
        激活后框线删除、只保留连线的 UE5 执行流脉冲，链路整体成为子画板挂进 Tab 坞。
        下面两块画板是真实引擎实例，可拖动卡片、缩放平移，连线会实时重算；紫色线为不在收益链路中的对照连线。
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DemoPanel
          dark={dark}
          badge="STATE 01"
          title="已形成收益 · 虚线框"
          desc="卖出连线成立 → 收益节点出现，链路连线渐变金 + 金色虚线框；「运行」技能可激活为收益线程。"
          doc={staticDoc()}
        />
        <DemoPanel
          dark={dark}
          badge="STATE 02"
          title="收益循环 · 已激活"
          desc="收益节点回流到卖方买入端口 → 外框转实线，「运转」技能激活 → 框线删除，只保留执行流脉冲。"
          doc={loopDoc()}
        />
      </div>

      <p className={cn('mt-6 text-[12px] leading-5', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
        提示：在画板中双击连线可删除 —— 删掉卖出连线时，收益节点及其直连连线会级联删除；演示画板的改动不会写入你的版图。
      </p>
    </div>
  )
}

function DemoPanel({ dark, badge, title, desc, doc }: { dark: boolean; badge: string; title: string; desc: string; doc: BoardDoc }) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border', dark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white')}>
      <header className="px-5 pb-3 pt-4">
        <p className="text-[10px] font-semibold tracking-[0.24em] opacity-50">{badge}</p>
        <h2 className="mt-1 text-[16px] font-medium">{title}</h2>
        <p className="mt-1 text-[12px] leading-5 opacity-60">{desc}</p>
      </header>
      {/* 引擎容器：相对定位撑出固定高度，BoardCanvas 以 absolute inset-0 铺满 */}
      <div className="relative h-[430px] border-t border-black/5 dark:border-white/5">
        <BoardCanvas dark={dark} primary={false} localViewport doc={doc} onPersist={() => { /* 演示实例不落盘 */ }} />
      </div>
    </section>
  )
}
