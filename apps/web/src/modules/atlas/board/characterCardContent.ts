// 🔴 改动 2026-10-12 · 角色画布卡内容建造器 —— 版图引擎与侧栏「角色」浮窗共用同一渲染，
// 数据契约见 workshop/character-card/data.ts（meta.characterId → demoCharacters 查表）。
// 四种形态与原材料卡对齐：icon 图标 / node 节点 / info 组件 / card 卡片。
// 卡片形态按需求改版：正面仅保留靠近卡片边缘的高亮镭射全息材质，卡面由人物照片铺满，
// UI 信息改为悬浮排版（眉行 / 姓名 / 头衔 / 玻璃数据条 / 资产编号）；卡背设计不变（溯源档案同款）。
import QRCode from 'qrcode'
import type { BoardCard } from './types'
import { assetFormSize } from './types'
import { demoCharacters, type CharacterData } from '@/modules/workshop/character-card/data'
import { talentFrameCorners } from '@/modules/workshop/asset-system/talentFrame'
import { RUNE_SVG } from './foodCardContent'

/** 卡背溯源二维码：建造器为同步 DOM 渲染，二维码生成后异步回填（与 FoodCard TraceQr 同款参数） */
function fillTraceQr(root: HTMLElement, d: CharacterData): void {
  const slot = root.querySelector<HTMLElement>('[data-char-qr]')
  if (!slot) return
  QRCode.toDataURL(d.back.traceUrl, { margin: 1, width: 148, color: { dark: '#0f0f13', light: '#ffffff' } })
    .then((dataUrl) => {
      const img = document.createElement('img')
      img.src = dataUrl
      img.alt = `${d.name}溯源二维码`
      img.className = 'sr-char-qr-img'
      slot.replaceChildren(img)
    })
    .catch(() => { slot.classList.add('is-failed') })
}

/**
 * 卡片形态（200×280）：正面 = 人物照片铺满 + 边缘镭射全息 + 悬浮信息排版；
 * 背面 = 与原材料卡一致的溯源档案（二维码 / 批次 / 证书 / 发行 / 流转记录），设计不变。
 */
function cardHTML(d: CharacterData): string {
  const fee = d.unitPrice.replace(/^服务费\s*/, '')
  const rows: [string, string][] = [['批次号', d.back.batchNo], ['证书编号', d.back.certNo], ['发行', d.back.issuePrice]]
  return `
  <div class="sr-char-card sr-tone-${d.editionTone}" data-character-id="${d.id}">
    <div class="sr-char-flip">
      <div class="sr-char-face sr-char-front">
        <img class="sr-char-photo" src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        <i class="sr-char-holo-band" aria-hidden="true"></i>
        <i class="sr-char-holo-edge" aria-hidden="true"></i>
        <header class="sr-char-top">
          <span class="sr-char-edition">${d.edition}</span>
          <span class="sr-char-status"><i></i>${d.status}</span>
        </header>
        <div class="sr-char-overlay">
          <p class="sr-char-eyebrow">CHEF · ${d.profession}</p>
          <h3 class="sr-char-name">${d.name}</h3>
          <p class="sr-char-desc">${d.title} · 从业 ${d.experience}</p>
          <p class="sr-char-sign">招牌「${d.signature}」 · ${d.origin.split(' · ')[0]}</p>
          <div class="sr-char-stats">
            <span><small>服务费</small><strong>${fee}</strong></span>
            <span><small>评分</small><strong>${d.rating}</strong></span>
            <span><small>席位</small><strong>${d.owned}<em>/${d.total}</em></strong></span>
          </div>
          <footer class="sr-char-asset">${d.assetNo}</footer>
        </div>
      </div>
      <div class="sr-char-face sr-char-back" aria-hidden="true">
        <header class="sr-char-top">
          <span class="sr-char-edition">溯源档案</span>
          <span class="sr-char-back-no">${d.assetNo}</span>
        </header>
        <div class="sr-char-back-body">
          <div class="sr-char-back-qr"><span class="sr-char-qr-slot" data-char-qr></span><p>扫码溯源 · 全程可查</p></div>
          <h3 class="sr-char-back-name">${d.name}<small>${d.profession} · ${d.title}</small></h3>
          <dl class="sr-char-back-rows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
          <ul class="sr-char-back-flow" aria-label="流转记录">
            ${d.back.circulation.map((r) => `<li><time>${r.date}</time><span>${r.event}</span></li>`).join('')}
          </ul>
        </div>
        <footer class="sr-char-back-foot"><span>TRACEABILITY</span><span>点击翻回</span></footer>
      </div>
    </div>
  </div>`
}

/** 图标形态（96×96）：资产体系「画板图标」同款 —— 符文镶边 + 名称玻璃条 + 席位玻璃标签 */
function iconHTML(d: CharacterData): string {
  return `
  <div class="sr-food-form sr-char-form sr-food-form-icon" data-character-id="${d.id}">
    <span class="asset-board-token">
      <span class="asset-icon asset-icon-board asset-rune" data-rune-tone="${d.editionTone}">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        <span class="asset-icon-glass"><span>${d.name}</span></span>
        <span class="asset-quantity-glass" aria-label="持有席位 ${d.owned} ${d.unit}"><strong>${d.owned}</strong><span>${d.unit}</span></span>
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
    </span>
  </div>`
}

/** 节点形态（238×172）：对齐资产体系厨师节点 —— 输入：买入/资金；输出：提供烹饪、卖出 */
function nodeHTML(d: CharacterData): string {
  const h = assetFormSize('character', 'node').h
  return `
  <div class="sr-food-form sr-char-form sr-food-form-node talent-network" data-character-id="${d.id}">
    <article class="asset-node flow-chef is-dormant" style="left:0;top:0;width:${assetFormSize('character', 'node').w}px;height:${h}px">
      <svg class="talent-frame" viewBox="0 0 238 ${h}" aria-hidden="true"><path class="talent-frame-brackets" d="${talentFrameCorners(h)}" /></svg>
      <header>
        <span class="asset-node-thumbnail rune-thumbnail"><img src="${d.image}" alt="" draggable="false" />${RUNE_SVG}</span>
        <span><small>角色资产 · 烹饪服务</small><strong>${d.name}</strong></span>
        <i class="talent-node-led" title="${d.status}"></i>
      </header>
      <span class="asset-port input flow-trade" style="top:76px" data-port="buy" data-port-side="in" title="输入端口 · 买入 / 资金"><i><span></span></i><span>买入 / 资金</span></span>
      <span class="asset-port output flow-chef" style="top:76px" data-port="cook" data-port-side="out" title="输出端口 · 提供烹饪（按住拖向食品卡输入端口）"><i><span></span></i><span>提供烹饪</span></span>
      <span class="asset-port output flow-trade" style="top:106px" data-port="sell" data-port-side="out" title="输出端口 · 卖出（按住拖向目标卡输入端口）"><i><span></span></i><span>卖出</span></span>
      <footer><span>${d.title} · ${d.status}</span><span>${d.assetNo}</span></footer>
    </article>
  </div>`
}

/** 组件形态（288×72）：资产体系 AssetInfo 行同款 —— 符文小图标 + 姓名/头衔 + 价值/席位 */
function infoHTML(d: CharacterData): string {
  return `
  <div class="sr-food-form sr-char-form sr-food-form-info" data-character-id="${d.id}">
    <div class="asset-info-row">
      <span class="asset-icon asset-rune" data-rune-tone="${d.editionTone}" style="width:44px;height:44px">
        <img src="${d.image}" alt="${d.imageAlt}" draggable="false" />
        ${RUNE_SVG}
        <span class="asset-icon-dot" title="${d.status}"></span>
      </span>
      <span class="asset-info-name"><strong>${d.name}</strong><small>${d.profession} · ${d.title}</small></span>
      <span class="asset-info-value"><strong>${d.value}</strong><small>${d.owned} ${d.unit} · ${d.status}</small></span>
    </div>
  </div>`
}

/**
 * 引擎 buildCard 的 character 分支：与 food 同一形态分发（缺省 card）；
 * 卡片形态额外异步回填卡背二维码。
 */
export function buildCharacterCard(node: HTMLElement, card: BoardCard): void {
  const d = demoCharacters.find((x) => x.id === card.meta.characterId)
  if (!d) {
    node.classList.add('sr-card-food-missing')
    node.textContent = `未知角色：${card.meta.characterId ?? '(无 characterId)'}`
    return
  }
  const form = card.meta.form ?? 'card'
  node.dataset.characterForm = form
  node.innerHTML =
    form === 'icon' ? iconHTML(d)
    : form === 'node' ? nodeHTML(d)
    : form === 'info' ? infoHTML(d)
    : cardHTML(d)
  if (form === 'card') fillTraceQr(node, d)
}

/**
 * 侧栏「角色」浮窗的预览实例（与画板渲染同一函数，保证所见即所得）；
 * 预览固定卡片形态 200×280，flipped=true 时展示卡背（溯源档案）。
 */
export function buildCharacterPreview(node: HTMLElement, characterId: string, flipped = false): void {
  buildCharacterCard(node, {
    id: `preview-${characterId}`,
    type: 'character',
    x: 0,
    y: 0,
    w: 200,
    h: 280,
    text: '',
    meta: { characterId, form: 'card' },
  })
  if (flipped) node.querySelector('.sr-char-card')?.classList.add('is-flipped')
}
