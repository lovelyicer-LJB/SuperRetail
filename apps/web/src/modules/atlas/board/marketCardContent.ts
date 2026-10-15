// 🔴 改动 2026-10-12 · 市场画布卡内容建造器 —— 版图引擎与侧栏「市场」浮窗共用同一渲染，
// 数据契约见 workshop/market-card/data.ts（meta.marketId → demoMarkets 查表）。
// 四种形态与原材料/角色/配方/菜品卡对齐：icon 图标 / node 节点 / info 组件 / card 卡片；
// 卡片形态沿用原材料卡版式（图窗 4:3 收高），芯片行展示运营指标（月活 / 复购）；
// 节点形态对齐资产体系采购方节点（238×142：买入/资金 入 + 卖出 出）。
import type { BoardCard } from './types'
import { assetFormSize } from './types'
import { demoMarkets, type MarketData } from '@/modules/workshop/market-card/data'
import { talentFrameCorners } from '@/modules/workshop/asset-system/talentFrame'
import { RUNE_SVG } from './foodCardContent'

/** 品类图腾：市场 · 用户群像剪影（与原材料卡的辣椒图腾同位） */
const MARKET_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="p-head" cx="9" cy="8.2" r="3.1" fill="none" stroke-width="1.7"/><path class="p-body" d="M3.2 19.2a5.8 5.8 0 0 1 11.6 0" fill="none" stroke-width="1.7" stroke-linecap="round"/><path class="p-peer" d="M15.6 5.4a3.1 3.1 0 0 1 0 5.6M17.2 13.4a5.8 5.8 0 0 1 3.6 5.8" fill="none" stroke-width="1.7" stroke-linecap="round"/></svg>`

const PIN_SVG = `<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>`

/** 卡片形态（200×280）：原材料卡版式 + 运营指标芯片行（月活 / 复购） */
function cardHTML(d: MarketData): string {
  const pct = ((d.owned / d.total) * 100).toFixed(2)
  const barW = Math.max((d.owned / d.total) * 100, 1.2)
  return `
  <div class="sr-food-card sr-recipe-card sr-market-card sr-tone-${d.editionTone}" data-market-id="${d.id}">
    <i class="sr-food-tone" aria-hidden="true"></i>
    <i class="sr-food-port in" data-port="in" data-port-side="in" title="输入端口 · 买入 / 资金（从其他卡的输出端口拖线至此）"></i>
    <i class="sr-food-port out" data-port="out" data-port-side="out" title="输出端口 · 卖出（按住拖向目标卡输入端口即可连线）"></i>
    <header class="sr-food-head">
      <span class="sr-food-cat sr-market-cat" title="品类 · 市场">${MARKET_SVG}</span>
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
    <div class="sr-recipe-ingredients" aria-label="运营指标">
      ${d.metrics.map((m) => `<span class="sr-recipe-chip" title="运营指标 · ${m.label} ${m.value}">${m.label}<small>${m.value}</small></span>`).join('')}
    </div>
    <div class="sr-food-qty">
      <div class="row">
        <strong>${d.owned.toLocaleString()}</strong>
        <span class="of">/ ${d.total.toLocaleString()} ${d.unit} · ${pct}%</span>
        <span class="price">${d.unitPrice.replace(/^客单价\s*/, '')}</span>
      </div>
      <div class="bar"><i style="width:${barW}%"></i></div>
    </div>
    <footer class="sr-food-asset">${d.assetNo}</footer>
  </div>`
}

/** 图标形态（96×96）：资产体系「画板图标」同款 —— 符文镶边 + 名称玻璃条 + 持有量玻璃标签 */
function iconHTML(d: MarketData): string {
  return `
  <div class="sr-food-form sr-market-form sr-food-form-icon" data-market-id="${d.id}">
    <span class="asset-board-token">
      <span class="asset-icon asset-icon-board asset-rune" data-rune-tone="${d.editionTone}">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        <span class="asset-icon-glass"><span>${d.name}</span></span>
        <span class="asset-quantity-glass" aria-label="持有 ${d.owned.toLocaleString()} ${d.unit}"><strong>${d.owned.toLocaleString()}</strong><span>${d.unit}</span></span>
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
    </span>
  </div>`
}

/** 节点形态（238×142）：对齐资产体系采购方节点 —— 输入：买入/资金；输出：卖出 */
function nodeHTML(d: MarketData): string {
  const { w, h } = assetFormSize('market', 'node')
  return `
  <div class="sr-food-form sr-market-form sr-food-form-node talent-network" data-market-id="${d.id}">
    <article class="asset-node flow-trade is-dormant" style="left:0;top:0;width:${w}px;height:${h}px">
      <svg class="talent-frame" viewBox="0 0 238 ${h}" aria-hidden="true"><path class="talent-frame-brackets" d="${talentFrameCorners(h)}" /></svg>
      <header>
        <span class="asset-node-thumbnail rune-thumbnail"><img src="${d.image}" alt="" draggable="false" />${RUNE_SVG}</span>
        <span><small>市场资产 · ${d.edition}</small><strong>${d.name}</strong></span>
        <i class="talent-node-led" title="${d.status}"></i>
      </header>
      <span class="asset-port input flow-trade" style="top:76px" data-port="buy" data-port-side="in" title="输入端口 · 买入 / 资金"><i><span></span></i><span>买入 / 资金</span></span>
      <span class="asset-port output flow-trade" style="top:76px" data-port="sell" data-port-side="out" title="输出端口 · 卖出（按住拖向目标卡输入端口）"><i><span></span></i><span>卖出</span></span>
      <footer><span>持有 ${d.owned.toLocaleString()} ${d.unit} · ${d.status}</span><span>${d.assetNo}</span></footer>
    </article>
  </div>`
}

/** 组件形态（288×72）：资产体系 AssetInfo 行同款 —— 符文小图标 + 名称/归属体系 + 价值/持有量 */
function infoHTML(d: MarketData): string {
  return `
  <div class="sr-food-form sr-market-form sr-food-form-info" data-market-id="${d.id}">
    <div class="asset-info-row">
      <span class="asset-icon asset-rune" data-rune-tone="${d.editionTone}" style="width:44px;height:44px">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
      <span class="asset-info-name"><strong>${d.name}</strong><small>市场 · ${d.origin}</small></span>
      <span class="asset-info-value"><strong>${d.value}</strong><small>${d.owned.toLocaleString()} ${d.unit} · ${d.status}</small></span>
    </div>
  </div>`
}

/** 引擎 buildCard 的 market 分支：与 food 同一形态分发（缺省 card） */
export function buildMarketCard(node: HTMLElement, card: BoardCard): void {
  const d = demoMarkets.find((x) => x.id === card.meta.marketId)
  if (!d) {
    node.classList.add('sr-card-food-missing')
    node.textContent = `未知市场资产：${card.meta.marketId ?? '(无 marketId)'}`
    return
  }
  const form = card.meta.form ?? 'card'
  node.dataset.marketForm = form
  node.innerHTML =
    form === 'icon' ? iconHTML(d)
    : form === 'node' ? nodeHTML(d)
    : form === 'info' ? infoHTML(d)
    : cardHTML(d)
}

/** 侧栏「市场」浮窗的预览实例（与画板渲染同一函数，保证所见即所得）；卡片形态预览固定 200×280 */
export function buildMarketPreview(node: HTMLElement, marketId: string): void {
  buildMarketCard(node, {
    id: `preview-${marketId}`,
    type: 'market',
    x: 0,
    y: 0,
    w: 200,
    h: 280,
    text: '',
    meta: { marketId, form: 'card' },
  })
}
