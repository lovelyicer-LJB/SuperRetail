// 🔴 改动 2026-10-11 · 实物（食品原材料）画布卡内容建造器 —— 版图引擎与侧栏「实物」浮窗共用同一渲染，
// 数据契约直接复用工坊 food-card 模块的 FoodCardData（meta.foodId → demoFoodCards 查表）。
// 视觉规格：200×280（5:7，介于符文图标与角色卡之间），版式见 design/canvas-ingredient-card 评审稿 v0.1。
// 🔴 改动 2026-10-12 · 同一资产四种形态进画板：icon 图标 / node 节点 / info 组件 / card 卡片，
// 按 card.meta.form 分发（缺省 card 兼容存量）；视觉类名复用资产体系（asset-system.css / asset-runes.css），
// 节点圆角括号路径与 RuneOrnament.tsx 的 TalentFrame 共用同一纯函数。
import type { BoardCard } from './types'
import { foodFormSize } from './types'
import { demoFoodCards, type FoodCardData } from '@/modules/workshop/food-card/data'
import { talentFrameCorners } from '@/modules/workshop/asset-system/talentFrame'

/** 品类图腾：香辛料 · 辣椒剪影（评审稿 v0.1 同款） */
const CHILI_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="p-pod" d="M5.2 13.1c-1.1 4.6 2.4 7.6 6.3 6.6 4.5-1.1 6.6-5.8 6-11.2l-2.1-1.1c-4.2 1.1-9.3 2.9-10.2 5.7z"/><path class="p-stem" d="M17.6 8.3c.8-2 2.4-2.9 3.9-3.1" fill="none" stroke-width="1.6" stroke-linecap="round"/></svg>`

/** 认证徽章：金色圆形简化章（麦穗母题；工坊大卡继续用官方原图，画布卡 24px 下官方图不可读） */
const SEAL_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path d="M12 3.2c1.1 1.6 1.1 3.4 0 5-1.1-1.6-1.1-3.4 0-5z"/><path d="M6.6 6.4c1.7.5 2.8 1.9 3.1 3.7-1.7-.5-2.8-1.9-3.1-3.7z"/><path d="M17.4 6.4c-1.7.5-2.8 1.9-3.1 3.7 1.7-.5 2.8-1.9-3.1-3.7z"/><path d="M5.6 11.2c1.8.2 3.1 1.3 3.8 3-1.8-.2-3.1-1.3-3.8-3z"/><path d="M18.4 11.2c-1.8.2-3.1 1.3-3.8 3 1.8-.2 3.1-1.3 3.8-3z"/><path d="M12 9.6c.9 1.1.9 2.6 0 3.8-.9-1.2-.9-2.7 0-3.8z"/><rect x="11.35" y="12.6" width="1.3" height="7.6" rx="0.65"/></g></svg>`

const PIN_SVG = `<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>`

/** 🔴 改动 2026-10-12 · 符文镶边 SVG 字符串：雕刻内容与 RuneOrnament.tsx 保持一致
 * （画板引擎是纯 DOM 渲染，无法直接挂 React 组件；改动镶边时两处同步）
 * 🔴 改动 2026-10-12 · 导出给 character / recipe 卡内容建造器共用（同一镶边语言，单一事实源） */
export const RUNE_SVG = `<svg class="rune-ornament" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect class="rune-outer" x="2" y="2" width="96" height="96" rx="22"/><rect class="rune-inner" x="7" y="7" width="86" height="86" rx="17"/><path class="rune-corners" d="M3 29V24A21 21 0 0 1 24 3H29 M71 3H76A21 21 0 0 1 97 24V29 M97 71V76A21 21 0 0 1 76 97H71 M29 97H24A21 21 0 0 1 3 76V71"/><g class="rune-inscription"><path d="M36 5h5m18 0h5M36 95h5m18 0h5M46 5l4-3 4 3-4 3zM46 95l4-3 4 3-4 3z"/><path d="M5 34v6m0 20v6m90-32v6m0 20v6"/></g></svg>`

/** 卡片形态（原 200×280 数字卡，评审稿 v0.1 版式） */
function cardHTML(d: FoodCardData): string {
  const pct = ((d.owned / d.total) * 100).toFixed(2)
  const barW = Math.max((d.owned / d.total) * 100, 1.2)
  const seals = d.badges
    .map((b) => `<span class="sr-food-seal" title="${b.label}">${SEAL_SVG}</span>`)
    .join('')
  const extra = d.extraBadge ? `<span class="sr-food-extra" title="${d.extraBadge}">${d.extraBadge}</span>` : ''
  return `
  <div class="sr-food-card sr-tone-${d.editionTone}" data-food-id="${d.id}">
    <i class="sr-food-tone" aria-hidden="true"></i>
    <i class="sr-food-port in" data-port="in" data-port-side="in" title="输入端口 · 产地 / 供应商 / 资金（从其他卡的输出端口拖线至此）"></i>
    <i class="sr-food-port out" data-port="out" data-port-side="out" title="输出端口 · 按住拖向另一张卡的输入端口即可连线"></i>
    <header class="sr-food-head">
      <span class="sr-food-cat" title="品类 · 香辛料">${CHILI_SVG}</span>
      <span class="sr-food-vintage">${d.vintage}</span>
      <span class="sr-food-status"><i></i>${d.status}</span>
    </header>
    <figure class="sr-food-art">
      <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
      <span class="sr-food-edition">${d.edition}</span>
      ${seals}${extra}
    </figure>
    <div class="sr-food-name">
      <h3>${d.name}</h3>
      <p>${PIN_SVG}${d.origin}</p>
    </div>
    <div class="sr-food-qty">
      <div class="row">
        <strong>${d.owned.toLocaleString()}</strong>
        <span class="of">/ ${d.total.toLocaleString()} ${d.unit} · ${pct}%</span>
        <span class="price">${d.unitPrice.replace(/^单价\s*/, '')}</span>
      </div>
      <div class="bar"><i style="width:${barW}%"></i></div>
    </div>
    <footer class="sr-food-asset">${d.assetNo}</footer>
  </div>`
}

/** 🔴 改动 2026-10-12 · 图标形态（96×96）：资产体系「画板图标」同款 —— 符文镶边 + 名称玻璃条 + 数量玻璃标签 */
function iconHTML(d: FoodCardData): string {
  return `
  <div class="sr-food-form sr-food-form-icon" data-food-id="${d.id}">
    <span class="asset-board-token">
      <span class="asset-icon asset-icon-board asset-rune" data-rune-tone="${d.editionTone}">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        <span class="asset-icon-glass"><span>${d.name}</span></span>
        <span class="asset-quantity-glass" aria-label="资产数量 ${d.owned.toLocaleString()} ${d.unit}"><strong>${d.owned.toLocaleString()}</strong><span>${d.unit}</span></span>
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
    </span>
  </div>`
}

/** 🔴 改动 2026-10-12 · 节点形态（238×172）：资产体系天赋节点同款 —— 圆角括号描边 + 符文缩略图 + 入/出端口；
 *  端口与高度公式对齐 graph.ts 原材料节点（输入：买入/资金；输出：供给原料、卖出；112 + 2×30） */
function nodeHTML(d: FoodCardData): string {
  const h = foodFormSize('node').h
  return `
  <div class="sr-food-form sr-food-form-node talent-network" data-food-id="${d.id}">
    <article class="asset-node flow-material is-dormant" style="left:0;top:0;width:${foodFormSize('node').w}px;height:${h}px">
      <svg class="talent-frame" viewBox="0 0 238 ${h}" aria-hidden="true"><path class="talent-frame-brackets" d="${talentFrameCorners(h)}" /></svg>
      <header>
        <span class="asset-node-thumbnail rune-thumbnail"><img src="${d.image}" alt="" draggable="false" />${RUNE_SVG}</span>
        <span><small>原材料资产 · ${d.edition}</small><strong>${d.name}</strong></span>
        <i class="talent-node-led" title="${d.status}"></i>
      </header>
      <span class="asset-port input flow-trade" style="top:76px" data-port="in" data-port-side="in" title="输入端口 · 买入 / 资金"><i><span></span></i><span>买入 / 资金</span></span>
      <span class="asset-port output flow-material" style="top:76px" data-port="supply" data-port-side="out" title="输出端口 · 供给原料（按住拖向目标卡输入端口）"><i><span></span></i><span>供给原料</span></span>
      <span class="asset-port output flow-trade" style="top:106px" data-port="sell" data-port-side="out" title="输出端口 · 卖出（按住拖向目标卡输入端口）"><i><span></span></i><span>卖出</span></span>
      <footer><span>可用 ${d.owned.toLocaleString()} ${d.unit} · ${d.status}</span><span>${d.assetNo}</span></footer>
    </article>
  </div>`
}

/** 🔴 改动 2026-10-12 · 组件形态（288×72）：资产体系 AssetInfo 行同款 —— 符文小图标 + 名称/产地 + 价值/数量 */
function infoHTML(d: FoodCardData): string {
  return `
  <div class="sr-food-form sr-food-form-info" data-food-id="${d.id}">
    <div class="asset-info-row">
      <span class="asset-icon asset-rune" data-rune-tone="${d.editionTone}" style="width:44px;height:44px">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
      <span class="asset-info-name"><strong>${d.name}</strong><small>原材料 · ${d.origin}</small></span>
      <span class="asset-info-value"><strong>${d.value}</strong><small>${d.owned.toLocaleString()} ${d.unit} · ${d.status}</small></span>
    </div>
  </div>`
}

/**
 * 引擎 buildCard 的 food 分支：node 已带 sr-board-card sr-card-food 外壳类，
 * 本函数只注入内容（外壳定位/选中态由引擎统一管理）。
 * 🔴 改动 2026-10-12 · 按 meta.form 分发四种形态（缺省 card，兼容无存量的形态字段）。
 */
export function buildFoodCard(node: HTMLElement, card: BoardCard): void {
  const d = demoFoodCards.find((x) => x.id === card.meta.foodId)
  if (!d) {
    node.classList.add('sr-card-food-missing')
    node.textContent = `未知原材料：${card.meta.foodId ?? '(无 foodId)'}`
    return
  }
  const form = card.meta.form ?? 'card'
  node.dataset.foodForm = form
  node.innerHTML =
    form === 'icon' ? iconHTML(d)
    : form === 'node' ? nodeHTML(d)
    : form === 'info' ? infoHTML(d)
    : cardHTML(d)
}

/** 侧栏「实物」浮窗的预览实例（与画板渲染同一函数，保证所见即所得）；卡片形态预览固定 200×280 */
export function buildFoodPreview(node: HTMLElement, foodId: string): void {
  buildFoodCard(node, {
    id: `preview-${foodId}`,
    type: 'food',
    x: 0,
    y: 0,
    w: 200,
    h: 280,
    text: '',
    meta: { foodId },
  })
}
