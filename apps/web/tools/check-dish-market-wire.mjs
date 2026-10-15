// 🔴 改动 2026-10-12 · 菜品节点 ⇄ 用户（市场）节点连线验收：
// 菜品卡端口补齐 data-port/data-port-side 后，两个方向都能按住输出端口拖线到对方输入端口；
// 卖出（sell）连线自动生成金色收益节点；刷新后连线与收益节点都在。
import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const out = new URL('../../../output/dish-market-wire/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
await mkdir(out, { recursive: true })

/** 按住 from 端口拖到 to 端口（引擎用 pointerdown + elementFromPoint 命中落点） */
async function wireDrag(page, fromLoc, toLoc) {
  const a = await fromLoc.boundingBox()
  const b = await toLoc.boundingBox()
  if (!a || !b) throw new Error('端口不可见，无法取坐标')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
  await page.mouse.up()
}

try {
  await page.goto('http://127.0.0.1:3000/atlas')
  await page.evaluate(() => document.fonts.ready)

  // ---- 1. 建菜品节点（浮窗图标视图点击） ----
  await page.getByRole('button', { name: '菜品', exact: true }).click()
  await page.locator('aside[aria-label="菜品"] button', { hasText: '辣龙腿' }).first().click()
  const dishCard = page.locator('.sr-board-card.sr-card-dish')
  await expect(dishCard.locator('[data-dish-id="la-long-tui"]')).toBeVisible()
  // 菜品节点端口锚点标记齐全（连线引擎靠 data-port-side 识别）
  await expect(dishCard.locator('[data-port="recipe"][data-port-side="in"]')).toHaveCount(1)
  await expect(dishCard.locator('[data-port="chef"][data-port-side="in"]')).toHaveCount(1)
  await expect(dishCard.locator('[data-port="buy"][data-port-side="in"]')).toHaveCount(1)
  await expect(dishCard.locator('[data-port="sell"][data-port-side="out"]')).toHaveCount(1)

  // ---- 2. 建用户（市场）节点，然后把它拖开避免与菜品节点重叠 ----
  await page.getByRole('button', { name: '市场', exact: true }).click()
  await page.locator('aside[aria-label="市场"] button', { hasText: '用户' }).first().click()
  const marketCard = page.locator('.sr-board-card.sr-card-market')
  await expect(marketCard.locator('[data-market-id="users"]')).toBeVisible()
  const mHead = await marketCard.locator('.asset-node header').boundingBox()
  await page.mouse.move(mHead.x + mHead.width / 2, mHead.y + mHead.height / 2)
  await page.mouse.down()
  await page.mouse.move(mHead.x + mHead.width / 2 + 360, mHead.y + mHead.height / 2 + 60, { steps: 10 })
  await page.mouse.up()
  await page.screenshot({ path: `${out}/01-two-nodes.png` })

  // ---- 3. 菜品.卖出 → 用户.买入/资金：连线成立 + 自动生成收益节点 ----
  await wireDrag(
    page,
    dishCard.locator('.asset-port.output[data-port="sell"] i'),
    marketCard.locator('.asset-port.input[data-port="buy"] i'),
  )
  await expect(page.locator('.sr-board-wire')).toHaveCount(1)
  await expect(page.locator('.sr-board-card.sr-card-revenue')).toHaveCount(1)
  await expect(page.locator('.sr-board-card.sr-card-revenue')).toContainText('辣龙腿 · 收益')
  await page.screenshot({ path: `${out}/02-dish-sell-to-market.png` })

  // ---- 4. 用户.卖出 → 菜品.买入/资金：反方向同样成立 ----
  await wireDrag(
    page,
    marketCard.locator('.asset-port.output[data-port="sell"] i'),
    dishCard.locator('.asset-port.input[data-port="buy"] i'),
  )
  await expect(page.locator('.sr-board-wire')).toHaveCount(2)
  await expect(page.locator('.sr-board-card.sr-card-revenue')).toHaveCount(2)
  await expect(page.locator('.sr-board-card.sr-card-revenue').nth(1)).toContainText('用户 · 收益')
  await page.screenshot({ path: `${out}/03-market-sell-to-dish.png` })

  // ---- 5. 持久化：刷新后两条连线 + 两个收益节点都在 ----
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.sr-board-wire')).toHaveCount(2)
  await expect(page.locator('.sr-board-card.sr-card-revenue')).toHaveCount(2)
  await expect(page.locator('[data-dish-id="la-long-tui"]')).toHaveCount(1)
  await expect(page.locator('[data-market-id="users"]')).toHaveCount(1)

  expect(errors, 'No browser exceptions').toEqual([])
  console.log(JSON.stringify({ passed: true, assertions: 'dish node ports carry data-port anchors, dish.sell→market.buy wire + revenue node, market.sell→dish.buy wire + revenue node, persistence after reload', screenshots: out }))
} finally { await browser.close() }
