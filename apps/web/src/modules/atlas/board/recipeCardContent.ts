// 🔴 改动 2026-10-12 · 配方画布卡内容建造器 —— 版图引擎与侧栏「配方」浮窗共用同一渲染，
// 数据契约见 workshop/recipe-card/data.ts（meta.recipeId → demoRecipes 查表）。
// 四种形态与原材料卡对齐：icon 图标 / node 节点 / info 组件 / card 卡片；
// 卡片形态沿用原材料卡版式（头/图窗/名称/份额/编号），新增原料清单芯片行（图窗改 4:3 收高）。
import type { BoardCard } from './types'
import { assetFormSize } from './types'
import { demoRecipes, type RecipeData } from '@/modules/workshop/recipe-card/data'
import { talentFrameCorners } from '@/modules/workshop/asset-system/talentFrame'
import { RUNE_SVG } from './foodCardContent'

/** 品类图腾：配方 · 卷轴剪影（与原材料卡的辣椒图腾同位） */
const RECIPE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="p-pod" d="M6 3.5h9.5A2.5 2.5 0 0 1 18 6v12a2.5 2.5 0 0 0 2.5 2.5H8A2.5 2.5 0 0 1 5.5 18V5a1.5 1.5 0 0 1 .5-1.5z"/><path class="p-scroll" d="M18 15.5h2.5v3a2 2 0 0 1-2 2" fill="none" stroke-width="1.6" stroke-linecap="round"/><path class="p-lines" d="M8.5 7.5h6M8.5 10.5h6M8.5 13.5h3.5" fill="none" stroke-width="1.5" stroke-linecap="round"/></svg>`

const PIN_SVG = `<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>`

/** 卡片形态（200×280）：原材料卡版式 + 原料芯片行（图窗 4:3 收高给清单让位） */
function cardHTML(d: RecipeData): string {
  const pct = ((d.owned / d.total) * 100).toFixed(2)
  const barW = Math.max((d.owned / d.total) * 100, 1.2)
  const chips = d.ingredients.map((ing) => `<span class="sr-recipe-chip" title="${ing.name} · ${ing.amount}">${ing.name}<small>${ing.amount}</small></span>`).join('')
  return `
  <div class="sr-food-card sr-recipe-card sr-tone-${d.editionTone}" data-recipe-id="${d.id}">
    <i class="sr-food-tone" aria-hidden="true"></i>
    <i class="sr-food-port in" data-port="in" data-port-side="in" title="输入端口 · 原料卡（从原料卡的输出端口拖线至此）"></i>
    <i class="sr-food-port out" data-port="out" data-port-side="out" title="输出端口 · 按住拖向食品卡的输入端口即可连线"></i>
    <header class="sr-food-head">
      <span class="sr-food-cat sr-recipe-cat" title="品类 · 配方">${RECIPE_SVG}</span>
      <span class="sr-food-vintage">${d.vintage} · ${d.license}</span>
      <span class="sr-food-status"><i></i>${d.status}</span>
    </header>
    <figure class="sr-food-art">
      <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
      <span class="sr-food-edition">${d.edition}</span>
    </figure>
    <div class="sr-food-name">
      <h3>${d.name}</h3>
      <p>${PIN_SVG}${d.origin}</p>
    </div>
    <div class="sr-recipe-ingredients" aria-label="所需原料">${chips}</div>
    <div class="sr-food-qty">
      <div class="row">
        <strong>${d.owned.toLocaleString()}</strong>
        <span class="of">/ ${d.total.toLocaleString()} ${d.unit} · ${pct}%</span>
        <span class="price">${d.unitPrice.replace(/^许可费\s*/, '')}</span>
      </div>
      <div class="bar"><i style="width:${barW}%"></i></div>
    </div>
    <footer class="sr-food-asset">${d.assetNo}</footer>
  </div>`
}

/** 图标形态（96×96）：资产体系「画板图标」同款 —— 符文镶边 + 名称玻璃条 + 授权份额标签 */
function iconHTML(d: RecipeData): string {
  return `
  <div class="sr-food-form sr-recipe-form sr-food-form-icon" data-recipe-id="${d.id}">
    <span class="asset-board-token">
      <span class="asset-icon asset-icon-board asset-rune" data-rune-tone="${d.editionTone}">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        <span class="asset-icon-glass"><span>${d.name}</span></span>
        <span class="asset-quantity-glass" aria-label="授权份额 ${d.owned.toLocaleString()} ${d.unit}"><strong>${d.owned.toLocaleString()}</strong><span>${d.unit}</span></span>
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
    </span>
  </div>`
}

/** 节点形态（238×232）：对齐资产体系配方节点 —— 输入：三原料（必备）+ 买入/资金；输出：配方服务、卖出 */
function nodeHTML(d: RecipeData): string {
  const { w, h } = assetFormSize('recipe', 'node')
  const inputs = d.ingredients.map((ing, i) =>
    `<span class="asset-port input flow-material" style="top:${76 + i * 30}px" data-port="ing-${i}" data-port-side="in" title="输入端口 · ${ing.name}（必备 · ${ing.amount}）"><i><span></span></i><span>${ing.name}<b title="必备">*</b></span></span>`
  ).join('')
  return `
  <div class="sr-food-form sr-recipe-form sr-food-form-node talent-network" data-recipe-id="${d.id}">
    <article class="asset-node flow-recipe is-dormant" style="left:0;top:0;width:${w}px;height:${h}px">
      <svg class="talent-frame" viewBox="0 0 238 ${h}" aria-hidden="true"><path class="talent-frame-brackets" d="${talentFrameCorners(h)}" /></svg>
      <header>
        <span class="asset-node-thumbnail rune-thumbnail"><img src="${d.image}" alt="" draggable="false" />${RUNE_SVG}</span>
        <span><small>配方资产 · ${d.license}</small><strong>${d.name}</strong></span>
        <i class="talent-node-led" title="${d.status}"></i>
      </header>
      ${inputs}
      <span class="asset-port input flow-trade" style="top:${76 + d.ingredients.length * 30}px" data-port="buy" data-port-side="in" title="输入端口 · 买入 / 资金"><i><span></span></i><span>买入 / 资金</span></span>
      <span class="asset-port output flow-recipe" style="top:76px" data-port="serve" data-port-side="out" title="输出端口 · 配方服务（按住拖向食品卡输入端口）"><i><span></span></i><span>配方服务</span></span>
      <span class="asset-port output flow-trade" style="top:106px" data-port="sell" data-port-side="out" title="输出端口 · 卖出（按住拖向目标卡输入端口）"><i><span></span></i><span>卖出</span></span>
      <footer><span>授权 ${d.owned.toLocaleString()}/${d.total.toLocaleString()} ${d.unit} · ${d.status}</span><span>${d.assetNo}</span></footer>
    </article>
  </div>`
}

/** 组件形态（288×72）：资产体系 AssetInfo 行同款 —— 符文小图标 + 名称/出品方 + 价值/份额 */
function infoHTML(d: RecipeData): string {
  return `
  <div class="sr-food-form sr-recipe-form sr-food-form-info" data-recipe-id="${d.id}">
    <div class="asset-info-row">
      <span class="asset-icon asset-rune" data-rune-tone="${d.editionTone}" style="width:44px;height:44px">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
      <span class="asset-info-name"><strong>${d.name}</strong><small>配方 · ${d.origin}</small></span>
      <span class="asset-info-value"><strong>${d.value}</strong><small>${d.owned.toLocaleString()} ${d.unit} · ${d.status}</small></span>
    </div>
  </div>`
}

/** 引擎 buildCard 的 recipe 分支：与 food 同一形态分发（缺省 card） */
export function buildRecipeCard(node: HTMLElement, card: BoardCard): void {
  const d = demoRecipes.find((x) => x.id === card.meta.recipeId)
  if (!d) {
    node.classList.add('sr-card-food-missing')
    node.textContent = `未知配方：${card.meta.recipeId ?? '(无 recipeId)'}`
    return
  }
  const form = card.meta.form ?? 'card'
  node.dataset.recipeForm = form
  node.innerHTML =
    form === 'icon' ? iconHTML(d)
    : form === 'node' ? nodeHTML(d)
    : form === 'info' ? infoHTML(d)
    : cardHTML(d)
}

/** 侧栏「配方」浮窗的预览实例（与画板渲染同一函数，保证所见即所得）；卡片形态预览固定 200×280 */
export function buildRecipePreview(node: HTMLElement, recipeId: string): void {
  buildRecipeCard(node, {
    id: `preview-${recipeId}`,
    type: 'recipe',
    x: 0,
    y: 0,
    w: 200,
    h: 280,
    text: '',
    meta: { recipeId, form: 'card' },
  })
}
