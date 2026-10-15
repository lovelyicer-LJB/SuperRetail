// 🔴 改动 2026-10-12 · 菜品画布卡内容建造器 —— 版图引擎与侧栏「菜品」浮窗共用同一渲染，
// 数据契约见 workshop/dish-card/data.ts（meta.dishId → demoDishes 查表）。
// 四种形态与原材料/角色/配方卡对齐：icon 图标 / node 节点 / info 组件 / card 卡片；
// 卡片形态沿用原材料卡版式（图窗 4:3 收高），新增出品链路芯片行（配方 + 主厨，锚定对应资产）。
import type { BoardCard } from './types'
import { assetFormSize } from './types'
import { demoDishes, type DishData } from '@/modules/workshop/dish-card/data'
import { demoRecipes } from '@/modules/workshop/recipe-card/data'
import { demoCharacters } from '@/modules/workshop/character-card/data'
import { talentFrameCorners } from '@/modules/workshop/asset-system/talentFrame'
import { RUNE_SVG } from './foodCardContent'

/** 品类图腾：菜品 · 餐盖剪影（与原材料卡的辣椒图腾同位） */
const DISH_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="p-dome" d="M5 16.5a7 7 0 0 1 14 0" fill="none" stroke-width="1.7" stroke-linecap="round"/><path class="p-base" d="M3.5 19h17" fill="none" stroke-width="1.7" stroke-linecap="round"/><circle class="p-knob" cx="12" cy="8.2" r="1.1"/></svg>`

const PIN_SVG = `<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>`

/** 出品链路芯片：配方 + 主厨（名称从对应契约实时查表，避免两处手抄） */
function provenance(d: DishData): { recipeName: string; chefName: string } {
  return {
    recipeName: demoRecipes.find((r) => r.id === d.recipeId)?.name ?? d.recipeId,
    chefName: demoCharacters.find((c) => c.id === d.chefId)?.name ?? d.chefId,
  }
}

/** 卡片形态（200×280）：原材料卡版式 + 出品链路芯片行（配方 / 主厨） */
function cardHTML(d: DishData): string {
  const pct = ((d.owned / d.total) * 100).toFixed(2)
  const barW = Math.max((d.owned / d.total) * 100, 1.2)
  const { recipeName, chefName } = provenance(d)
  return `
  <div class="sr-food-card sr-recipe-card sr-dish-card sr-tone-${d.editionTone}" data-dish-id="${d.id}">
    <i class="sr-food-tone" aria-hidden="true"></i>
    <i class="sr-food-port in" data-port="in" data-port-side="in" title="输入端口 · 买入 / 资金（从其他卡的输出端口拖线至此）"></i>
    <i class="sr-food-port out" data-port="out" data-port-side="out" title="输出端口 · 卖出（按住拖向市场卡 / 采购方输入端口即可连线）"></i>
    <header class="sr-food-head">
      <span class="sr-food-cat sr-dish-cat" title="品类 · 菜品">${DISH_SVG}</span>
      <span class="sr-food-vintage">${d.vintage}</span>
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
    <div class="sr-recipe-ingredients" aria-label="出品链路">
      <span class="sr-recipe-chip" title="配方资产 · ${recipeName}">配方「${recipeName}」</span>
      <span class="sr-recipe-chip" title="角色资产 · 主厨 ${chefName}">主厨「${chefName}」</span>
    </div>
    <div class="sr-food-qty">
      <div class="row">
        <strong>${d.owned.toLocaleString()}</strong>
        <span class="of">/ ${d.total.toLocaleString()} ${d.unit} · ${pct}%</span>
        <span class="price">${d.unitPrice.replace(/^售价\s*/, '')}</span>
      </div>
      <div class="bar"><i style="width:${barW}%"></i></div>
    </div>
    <footer class="sr-food-asset">${d.assetNo}</footer>
  </div>`
}

/** 图标形态（96×96）：资产体系「画板图标」同款 —— 符文镶边 + 名称玻璃条 + 库存玻璃标签 */
function iconHTML(d: DishData): string {
  return `
  <div class="sr-food-form sr-dish-form sr-food-form-icon" data-dish-id="${d.id}">
    <span class="asset-board-token">
      <span class="asset-icon asset-icon-board asset-rune" data-rune-tone="${d.editionTone}">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        <span class="asset-icon-glass"><span>${d.name}</span></span>
        <span class="asset-quantity-glass" aria-label="库存 ${d.owned.toLocaleString()} ${d.unit}"><strong>${d.owned.toLocaleString()}</strong><span>${d.unit}</span></span>
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
    </span>
  </div>`
}

/** 节点形态（238×202）：对齐资产体系食品节点 —— 输入：配方服务* / 厨师* / 买入/资金；输出：卖出 */
function nodeHTML(d: DishData): string {
  const { w, h } = assetFormSize('dish', 'node')
  const { recipeName, chefName } = provenance(d)
  return `
  <div class="sr-food-form sr-dish-form sr-food-form-node talent-network" data-dish-id="${d.id}">
    <article class="asset-node flow-material is-dormant" style="left:0;top:0;width:${w}px;height:${h}px">
      <svg class="talent-frame" viewBox="0 0 238 ${h}" aria-hidden="true"><path class="talent-frame-brackets" d="${talentFrameCorners(h)}" /></svg>
      <header>
        <span class="asset-node-thumbnail rune-thumbnail"><img src="${d.image}" alt="" draggable="false" />${RUNE_SVG}</span>
        <span><small>菜品资产 · ${d.edition}</small><strong>${d.name}</strong></span>
        <i class="talent-node-led" title="${d.status}"></i>
      </header>
      <span class="asset-port input flow-recipe" style="top:76px" data-port="recipe" data-port-side="in" title="输入端口 · 配方服务（必备 · 从配方卡输出端口拖线至此）"><i><span></span></i><span>配方「${recipeName}」<b title="必备">*</b></span></span>
      <span class="asset-port input flow-chef" style="top:106px" data-port="chef" data-port-side="in" title="输入端口 · 厨师（必备 · 从角色卡输出端口拖线至此）"><i><span></span></i><span>主厨「${chefName}」<b title="必备">*</b></span></span>
      <span class="asset-port input flow-trade" style="top:136px" data-port="buy" data-port-side="in" title="输入端口 · 买入 / 资金"><i><span></span></i><span>买入 / 资金</span></span>
      <span class="asset-port output flow-trade" style="top:76px" data-port="sell" data-port-side="out" title="输出端口 · 卖出（按住拖向市场卡 / 采购方输入端口，连线成立自动生成收益节点）"><i><span></span></i><span>卖出</span></span>
      <footer><span>库存 ${d.owned.toLocaleString()} ${d.unit} · ${d.status}</span><span>${d.assetNo}</span></footer>
    </article>
  </div>`
}

/** 组件形态（288×72）：资产体系 AssetInfo 行同款 —— 符文小图标 + 名称/出品厨房 + 价值/库存 */
function infoHTML(d: DishData): string {
  return `
  <div class="sr-food-form sr-dish-form sr-food-form-info" data-dish-id="${d.id}">
    <div class="asset-info-row">
      <span class="asset-icon asset-rune" data-rune-tone="${d.editionTone}" style="width:44px;height:44px">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
      <span class="asset-info-name"><strong>${d.name}</strong><small>菜品 · ${d.origin}</small></span>
      <span class="asset-info-value"><strong>${d.value}</strong><small>${d.owned.toLocaleString()} ${d.unit} · ${d.status}</small></span>
    </div>
  </div>`
}

/** 引擎 buildCard 的 dish 分支：与 food 同一形态分发（缺省 card） */
export function buildDishCard(node: HTMLElement, card: BoardCard): void {
  const d = demoDishes.find((x) => x.id === card.meta.dishId)
  if (!d) {
    node.classList.add('sr-card-food-missing')
    node.textContent = `未知菜品：${card.meta.dishId ?? '(无 dishId)'}`
    return
  }
  const form = card.meta.form ?? 'card'
  node.dataset.dishForm = form
  node.innerHTML =
    form === 'icon' ? iconHTML(d)
    : form === 'node' ? nodeHTML(d)
    : form === 'info' ? infoHTML(d)
    : cardHTML(d)
}

/** 侧栏「菜品」浮窗的预览实例（与画板渲染同一函数，保证所见即所得）；卡片形态预览固定 200×280 */
export function buildDishPreview(node: HTMLElement, dishId: string): void {
  buildDishCard(node, {
    id: `preview-${dishId}`,
    type: 'dish',
    x: 0,
    y: 0,
    w: 200,
    h: 280,
    text: '',
    meta: { dishId, form: 'card' },
  })
}
