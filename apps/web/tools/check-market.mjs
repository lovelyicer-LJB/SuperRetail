// 🔴 改动 2026-10-12 · 「市场」（用户）资产的浏览器验收：
// 侧栏入口 / 浮窗列表（图标+卡片形态）/ 运营指标芯片（月活 / 复购）/ 点击建卡进画板（默认节点形态，
// 买入+卖出 1 行端口高 142，端口带 data-port 锚点）/ Tab+Q/W/E/R 形态切换 / 刷新持久化。
import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const out = new URL('../../../output/market/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
await mkdir(out, { recursive: true })

try {
  await page.goto('http://127.0.0.1:3000/atlas')
  await page.evaluate(() => document.fonts.ready)

  // ---- 1. 侧边栏出现「市场」入口 ----
  const railMarket = page.getByRole('button', { name: '市场', exact: true })
  await expect(railMarket).toBeVisible()
  await page.screenshot({ path: `${out}/01-rail-market-button.png` })

  // ---- 2. 「市场」浮窗：图标形态列表含「用户」 ----
  await railMarket.click()
  const marketPanel = page.locator('aside[aria-label="市场"]')
  await expect(marketPanel).toBeVisible()
  await expect(marketPanel.getByText('用户', { exact: true })).toBeVisible()
  await expect(marketPanel.locator('.asset-icon img')).toHaveCount(1)
  await marketPanel.screenshot({ path: `${out}/02-market-icon-view.png` })

  // ---- 3. 市场卡片形态：聚餐图 + 运营指标芯片（月活 / 复购） ----
  await marketPanel.getByRole('button', { name: '卡片', exact: true }).click()
  const marketCard = marketPanel.locator('.sr-market-card')
  await expect(marketCard).toBeVisible()
  await expect(marketCard.locator('h3')).toHaveText('用户')
  await expect(marketCard.locator('.sr-recipe-chip')).toHaveCount(2)
  await expect(marketCard.locator('.sr-recipe-ingredients')).toContainText('月活')
  await expect(marketCard.locator('.sr-recipe-ingredients')).toContainText('82%')
  await expect(marketCard.locator('.sr-recipe-ingredients')).toContainText('复购')
  await expect(marketCard.locator('.sr-recipe-ingredients')).toContainText('38%')
  await expect(marketCard.locator('.sr-food-qty')).toContainText('¥86/人')
  await expect(marketCard.locator('.sr-food-asset')).toHaveText('SR-2026-MKT-USR-00088')
  const imgLoaded = await marketCard.locator('.sr-food-art img').evaluate((img) => img.complete && img.naturalWidth > 0)
  expect(imgLoaded, '市场图加载成功').toBe(true)
  await marketPanel.screenshot({ path: `${out}/03-market-card-front.png` })

  // ---- 4. 点击建卡进画板（默认节点形态：买入/资金 入 + 卖出 出 = 1 行端口，高 142） ----
  await marketCard.click()
  await expect(marketPanel).not.toBeVisible()
  const marketNode = page.locator('.sr-board-card.sr-card-market [data-market-id="users"]')
  await expect(marketNode).toBeVisible()
  await expect(marketNode.locator('.asset-port.input')).toHaveCount(1)
  await expect(marketNode.locator('.asset-port.output')).toHaveCount(1)
  await expect(marketNode.locator('.asset-port.input.flow-trade')).toContainText('买入 / 资金')
  await expect(marketNode.locator('.asset-port.output.flow-trade')).toContainText('卖出')
  await expect(marketNode.locator('[data-port="buy"][data-port-side="in"]')).toHaveCount(1)
  await expect(marketNode.locator('[data-port="sell"][data-port-side="out"]')).toHaveCount(1)
  const nodeBox = await page.locator('.sr-board-card.sr-card-market').boundingBox()
  expect(Math.round(nodeBox.height), '市场节点高 142').toBe(142)
  await page.screenshot({ path: `${out}/04-board-market-node.png` })

  // ---- 5. Tab+ 快捷键切换形态：R=卡片 / Q=图标 / E=组件 / W=节点 ----
  const marketBoardCard = page.locator('.sr-board-card.sr-card-market')
  await marketBoardCard.click()
  await page.keyboard.down('Tab')
  await page.keyboard.press('r')
  await page.keyboard.up('Tab')
  await expect(marketBoardCard.locator('.sr-market-card')).toBeVisible()
  await expect(marketBoardCard.locator('.sr-food-art img')).toHaveCount(1)
  await page.screenshot({ path: `${out}/05-board-market-card-form.png` })
  await page.keyboard.down('Tab')
  await page.keyboard.press('q')
  await page.keyboard.up('Tab')
  await expect(marketBoardCard.locator('.sr-food-form-icon')).toBeVisible()
  await page.keyboard.down('Tab')
  await page.keyboard.press('e')
  await page.keyboard.up('Tab')
  await expect(marketBoardCard.locator('.sr-food-form-info')).toContainText('用户')
  await expect(marketBoardCard.locator('.sr-food-form-info')).toContainText('¥110,080')
  await page.keyboard.down('Tab')
  await page.keyboard.press('w')
  await page.keyboard.up('Tab')
  await expect(marketBoardCard.locator('.sr-food-form-node')).toBeVisible()
  await page.screenshot({ path: `${out}/06-board-market-forms.png` })

  // ---- 6. 持久化：刷新后市场卡仍在（storage 白名单放行） ----
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[data-market-id="users"]')).toHaveCount(1)
  await expect(page.locator('.sr-board-card.sr-card-market .sr-food-form-node')).toHaveCount(1)

  expect(errors, 'No browser exceptions').toEqual([])
  console.log(JSON.stringify({ passed: true, assertions: 'rail button, market panel icon/card views, metrics chips (月活/复购), click-to-create node form (1in+1out ports with data-port, 142h), Tab+QWER form switch, persistence after reload', screenshots: out }))
} finally { await browser.close() }
