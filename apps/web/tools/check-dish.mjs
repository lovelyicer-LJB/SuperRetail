// 🔴 改动 2026-10-12 · 「菜品」（辣龙腿成品）资产的浏览器验收：
// 侧栏入口 / 浮窗列表（图标+卡片形态）/ 出品链路芯片 / 点击建卡进画板（默认节点形态，
// 3 行端口高 202）/ Tab+Q/W/E/R 形态切换 / 刷新持久化。
import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const out = new URL('../../../output/dish/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
await mkdir(out, { recursive: true })

try {
  await page.goto('http://127.0.0.1:3000/atlas')
  await page.evaluate(() => document.fonts.ready)

  // ---- 1. 侧边栏出现「菜品」入口 ----
  const railDishes = page.getByRole('button', { name: '菜品', exact: true })
  await expect(railDishes).toBeVisible()
  await page.screenshot({ path: `${out}/01-rail-dish-button.png` })

  // ---- 2. 「菜品」浮窗：图标形态列表含辣龙腿 ----
  await railDishes.click()
  const dishPanel = page.locator('aside[aria-label="菜品"]')
  await expect(dishPanel).toBeVisible()
  await expect(dishPanel.getByText('辣龙腿', { exact: true })).toBeVisible()
  await expect(dishPanel.locator('.asset-icon img')).toHaveCount(1)
  await dishPanel.screenshot({ path: `${out}/02-dishes-icon-view.png` })

  // ---- 3. 菜品卡片形态：成品图 + 出品链路芯片（配方/主厨） ----
  await dishPanel.getByRole('button', { name: '卡片', exact: true }).click()
  const dishCard = dishPanel.locator('.sr-dish-card')
  await expect(dishCard).toBeVisible()
  await expect(dishCard.locator('h3')).toHaveText('辣龙腿')
  await expect(dishCard.locator('.sr-recipe-chip')).toHaveCount(2)
  await expect(dishCard.locator('.sr-recipe-ingredients')).toContainText('配方「辣龙腿」')
  await expect(dishCard.locator('.sr-recipe-ingredients')).toContainText('主厨「杨峥」')
  await expect(dishCard.locator('.sr-food-qty')).toContainText('¥168/份')
  const imgLoaded = await dishCard.locator('.sr-food-art img').evaluate((img) => img.complete && img.naturalWidth > 0)
  expect(imgLoaded, '菜品图加载成功').toBe(true)
  await dishPanel.screenshot({ path: `${out}/03-dish-card-front.png` })

  // ---- 4. 点击建卡进画板（默认节点形态：配方* / 厨师* / 买入 3 行输入，高 202） ----
  await dishCard.click()
  await expect(dishPanel).not.toBeVisible()
  const dishNode = page.locator('.sr-board-card.sr-card-dish [data-dish-id="la-long-tui"]')
  await expect(dishNode).toBeVisible()
  await expect(dishNode.locator('.asset-port.input')).toHaveCount(3)
  await expect(dishNode.locator('.asset-port.input.flow-recipe')).toContainText('配方「辣龙腿」')
  await expect(dishNode.locator('.asset-port.input.flow-chef')).toContainText('主厨「杨峥」')
  await expect(dishNode.locator('.asset-port.output.flow-trade')).toContainText('卖出')
  // 端口锚点标记（连线引擎靠 data-port / data-port-side 识别拖拽起点与落点）
  await expect(dishNode.locator('[data-port="recipe"][data-port-side="in"]')).toHaveCount(1)
  await expect(dishNode.locator('[data-port="chef"][data-port-side="in"]')).toHaveCount(1)
  await expect(dishNode.locator('[data-port="buy"][data-port-side="in"]')).toHaveCount(1)
  await expect(dishNode.locator('[data-port="sell"][data-port-side="out"]')).toHaveCount(1)
  const nodeBox = await page.locator('.sr-board-card.sr-card-dish').boundingBox()
  expect(Math.round(nodeBox.height), '菜品节点高 202').toBe(202)
  await page.screenshot({ path: `${out}/04-board-dish-node.png` })

  // ---- 5. Tab+ 快捷键切换形态：R=卡片 / Q=图标 / E=组件 / W=节点 ----
  const dishBoardCard = page.locator('.sr-board-card.sr-card-dish')
  await dishBoardCard.click()
  await page.keyboard.down('Tab')
  await page.keyboard.press('r')
  await page.keyboard.up('Tab')
  await expect(dishBoardCard.locator('.sr-dish-card')).toBeVisible()
  await expect(dishBoardCard.locator('.sr-food-art img')).toHaveCount(1)
  await page.screenshot({ path: `${out}/05-board-dish-card-form.png` })
  await page.keyboard.down('Tab')
  await page.keyboard.press('q')
  await page.keyboard.up('Tab')
  await expect(dishBoardCard.locator('.sr-food-form-icon')).toBeVisible()
  await page.keyboard.down('Tab')
  await page.keyboard.press('e')
  await page.keyboard.up('Tab')
  await expect(dishBoardCard.locator('.sr-food-form-info')).toContainText('辣龙腿')
  await expect(dishBoardCard.locator('.sr-food-form-info')).toContainText('¥4,032')
  await page.keyboard.down('Tab')
  await page.keyboard.press('w')
  await page.keyboard.up('Tab')
  await expect(dishBoardCard.locator('.sr-food-form-node')).toBeVisible()
  await page.screenshot({ path: `${out}/06-board-dish-forms.png` })

  // ---- 6. 持久化：刷新后菜品卡仍在（storage 白名单放行） ----
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[data-dish-id="la-long-tui"]')).toHaveCount(1)
  await expect(page.locator('.sr-board-card.sr-card-dish .sr-food-form-node')).toHaveCount(1)

  expect(errors, 'No browser exceptions').toEqual([])
  console.log(JSON.stringify({ passed: true, assertions: 'rail button, dish panel icon/card views, provenance chips (recipe+chef), click-to-create node form (3 ports, 202h), Tab+QWER form switch, persistence after reload', screenshots: out }))
} finally { await browser.close() }
