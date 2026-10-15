// 🔴 改动 2026-10-12 · 收益节点画布卡内容建造器 —— 参考工坊资产节点 graph.ts 的收益分支节点：
// 卖出连线成立后自动生成；金色卡面 + 3 个资金输出端口（原料补货 / 厨师报酬 / 配方许可）。
// 节点上的端口用 data-port / data-port-side 标记，供引擎 portAnchor 实测锚点（与资产卡同规约）。
import type { BoardCard } from './types'
import { demoFoodCards } from '@/modules/workshop/food-card/data'
import { demoCharacters } from '@/modules/workshop/character-card/data'
import { demoRecipes } from '@/modules/workshop/recipe-card/data'
import { demoDishes } from '@/modules/workshop/dish-card/data'
// 🔴 改动 2026-10-12 · market 市场卡展示名（收益节点标题用）
import { demoMarkets } from '@/modules/workshop/market-card/data'

/** 金色收益徽章（圆形硬币母题，简洁可读；工坊大卡用 lucide CircleDollarSign，画布用内联 SVG 避免依赖） */
const COIN_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.2v9.6 M9.2 9.6c.5-1 1.5-1.4 2.8-1.4 1.8 0 2.8.7 2.8 1.9 0 2.4-5.6 1.2-5.6 3.6 0 1.2 1 1.9 2.8 1.9 1.3 0 2.3-.4 2.8-1.4"/></svg>`

/**
 * 资产卡展示名：原材料/角色/配方/菜品按各自数据契约取 name；非资产卡回退到标题/文本。
 * 用于收益节点标题「<资产> · 收益」。
 */
export function assetCardName(card: BoardCard): string {
  switch (card.type) {
    case 'food': return demoFoodCards.find((d) => d.id === card.meta.foodId)?.name ?? '原材料资产'
    case 'character': return demoCharacters.find((d) => d.id === card.meta.characterId)?.name ?? '角色资产'
    case 'recipe': return demoRecipes.find((d) => d.id === card.meta.recipeId)?.name ?? '配方资产'
    case 'dish': return demoDishes.find((d) => d.id === card.meta.dishId)?.name ?? '菜品资产'
    // 🔴 改动 2026-10-12 · market 市场卡展示名（卖出连线生成收益节点时取资产名）
    case 'market': return demoMarkets.find((d) => d.id === card.meta.marketId)?.name ?? '市场资产'
    case 'todo': return card.meta.title || '待办'
    case 'board': return card.meta.title || '子画板'
    case 'note': return (card.text || '').split('\n')[0] || '笔记'
    default: return '资产'
  }
}

/**
 * 引擎 buildCard 的 revenue 分支：外壳已带 sr-board-card sr-card-revenue 类，本函数只注入内容。
 * 输出端口顺序与工坊 graph.ts 收益节点一致（原料补货 / 厨师报酬 / 配方许可，均 flow-fund）。
 * 🔴 改动 2026-10-13 · 循环/激活状态标注：
 * 未循环 = 已形成收益（虚线框 · 「运行」技能激活 → 收益线程）；
 * 已循环（回流到链路内资产买入端口）= 实线框 · 「运转」技能激活 → 收益循环。
 */
export function buildRevenueCard(node: HTMLElement, card: BoardCard, looped: boolean): void {
  const title = card.meta.title || '收益'
  const thread = card.meta.activated === true
  const small = thread ? (looped ? '收益循环 · 已激活' : '收益线程 · 已激活') : looped ? '收益分支 · 已形成循环' : '收益分支 · 已形成收益'
  const foot = thread ? (looped ? '收益循环运行中 · 尚未结算' : '收益线程运行中 · 尚未结算') : looped ? '已形成循环 · 用「运转」技能激活' : '已形成收益 · 用「运行」技能激活'
  node.innerHTML = `
  <div class="sr-revenue-card${thread ? ' is-thread' : ''}">
    <header class="sr-revenue-head">
      <span class="sr-revenue-coin">${COIN_SVG}</span>
      <span class="sr-revenue-title"><small>${small}</small><strong>${title}</strong></span>
    </header>
    <div class="sr-revenue-ports">
      <span class="sr-revenue-port" data-port="materials" data-port-side="out" title="输出 · 原料补货（按住拖向目标卡输入端口）"><i></i>原料补货</span>
      <span class="sr-revenue-port" data-port="labor" data-port-side="out" title="输出 · 厨师报酬（按住拖向目标卡输入端口）"><i></i>厨师报酬</span>
      <span class="sr-revenue-port" data-port="license" data-port-side="out" title="输出 · 配方许可（按住拖向目标卡输入端口）"><i></i>配方许可</span>
    </div>
    <footer class="sr-revenue-foot">${foot}</footer>
  </div>`
}
