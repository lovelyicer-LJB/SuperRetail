// 🔴 改动 2026-10-12 · 「角色」（杨峥 · 厨师）与「配方」（辣龙腿）资产的浏览器验收：
// 侧栏入口 / 浮窗列表（图标+卡片形态）/ 角色卡翻面（全息照片正面 + 溯源档案背面）/
// 点击建卡进画板（默认节点形态）/ Tab+Q/W/E/R 形态切换 / 拖放协议。
import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const out = new URL('../../../output/character-recipe/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
await mkdir(out, { recursive: true })

try {
  await page.goto('http://127.0.0.1:3000/atlas')
  await page.evaluate(() => document.fonts.ready)

  // ---- 1. 侧边栏出现「角色」「配方」入口 ----
  const railChars = page.getByRole('button', { name: '角色', exact: true })
  const railRecipes = page.getByRole('button', { name: '配方', exact: true })
  await expect(railChars).toBeVisible()
  await expect(railRecipes).toBeVisible()
  await page.screenshot({ path: `${out}/01-rail-buttons.png` })

  // ---- 2. 「角色」浮窗：图标形态列表含杨峥 ----
  await railChars.click()
  const charPanel = page.locator('aside[aria-label="角色"]')
  await expect(charPanel).toBeVisible()
  await expect(charPanel.getByText('杨峥', { exact: true })).toBeVisible()
  await expect(charPanel.locator('.asset-icon img')).toHaveCount(1)
  await charPanel.screenshot({ path: `${out}/02-characters-icon-view.png` })

  // ---- 3. 角色卡片形态：正面 = 照片铺满 + 边缘全息 ----
  await charPanel.getByRole('button', { name: '卡片', exact: true }).click()
  const charCard = charPanel.locator('.sr-char-card')
  await expect(charCard).toBeVisible()
  await expect(charCard.locator('.sr-char-photo')).toHaveCount(1)
  await expect(charCard.locator('.sr-char-holo-edge')).toHaveCount(1)
  await expect(charCard.locator('.sr-char-holo-band')).toHaveCount(1)
  await expect(charCard.locator('.sr-char-name')).toHaveText('杨峥')
  await expect(charCard.locator('.sr-char-eyebrow')).toContainText('CHEF')
  await expect(charCard.locator('.sr-char-stats')).toContainText('¥380/次')
  const photoLoaded = await charCard.locator('.sr-char-photo').evaluate((img) => img.complete && img.naturalWidth > 0)
  expect(photoLoaded, '角色照片加载成功').toBe(true)
  await page.waitForTimeout(400)
  await charPanel.screenshot({ path: `${out}/03-character-card-front.png` })

  // ---- 4. 翻面：卡背溯源档案（设计不变） ----
  await charPanel.locator('span[role="button"][aria-label="翻转查看溯源档案"]').click()
  await expect(charPanel.locator('.sr-char-card.is-flipped')).toHaveCount(1)
  await expect(charCard.locator('.sr-char-qr-img')).toHaveCount(1)
  await expect(charCard.locator('.sr-char-back-rows')).toContainText('CHEF-2026-YZ-066')
  await expect(charCard.locator('.sr-char-back-flow')).toContainText('辣龙腿')
  await page.waitForTimeout(650)
  await charPanel.screenshot({ path: `${out}/04-character-card-back.png` })

  // ---- 5. 点击卡片建卡进画板（默认节点形态） ----
  await charPanel.locator('.sr-char-card').click()
  await expect(charPanel).not.toBeVisible()
  const charNode = page.locator('.sr-board-card.sr-card-character [data-character-id="yangzheng"]')
  await expect(charNode).toBeVisible()
  await expect(charNode.locator('.asset-port.output.flow-chef')).toContainText('提供烹饪')
  await expect(charNode.locator('.asset-node-thumbnail img')).toHaveCount(1)

  // ---- 6. 「配方」浮窗：图标 + 卡片形态 ----
  await railRecipes.click()
  const recipePanel = page.locator('aside[aria-label="配方"]')
  await expect(recipePanel).toBeVisible()
  await expect(recipePanel.getByText('辣龙腿', { exact: true })).toBeVisible()
  await recipePanel.screenshot({ path: `${out}/05-recipes-icon-view.png` })
  await recipePanel.getByRole('button', { name: '卡片', exact: true }).click()
  const recipeCard = recipePanel.locator('.sr-recipe-card')
  await expect(recipeCard).toBeVisible()
  await expect(recipeCard.locator('h3')).toHaveText('辣龙腿')
  await expect(recipeCard.locator('.sr-recipe-chip')).toHaveCount(3)
  await expect(recipeCard.locator('.sr-food-qty')).toContainText('¥68/次')
  const dishLoaded = await recipeCard.locator('.sr-food-art img').evaluate((img) => img.complete && img.naturalWidth > 0)
  expect(dishLoaded, '菜品图加载成功').toBe(true)
  await recipePanel.screenshot({ path: `${out}/06-recipe-card-front.png` })

  // ---- 7. 配方建卡：节点形态 4 行端口（3 原料必备 + 买入），高 232 ----
  await recipeCard.click()
  const recipeNode = page.locator('.sr-board-card.sr-card-recipe [data-recipe-id="la-long-tui"]')
  await expect(recipeNode).toBeVisible()
  await expect(recipeNode.locator('.asset-port.input')).toHaveCount(4)
  await expect(recipeNode.locator('.asset-port.input.flow-material')).toHaveCount(3)
  await expect(recipeNode.locator('.asset-port.output.flow-recipe')).toContainText('配方服务')
  const nodeBox = await page.locator('.sr-board-card.sr-card-recipe').boundingBox()
  expect(Math.round(nodeBox.height), '配方节点高 232').toBe(232)
  await page.screenshot({ path: `${out}/07-board-nodes.png` })

  // ---- 8. Tab+ 快捷键切换形态：角色卡 R=卡片 / Q=图标，配方卡 E=组件 ----
  // 两张新卡默认落在同一中心点：先把配方卡拖开，避免遮挡点击
  const recipeHeader = recipeNode.locator('header')
  const rb = await recipeHeader.boundingBox()
  await page.mouse.move(rb.x + 100, rb.y + 20)
  await page.mouse.down()
  await page.mouse.move(rb.x + 380, rb.y + 60, { steps: 6 })
  await page.mouse.up()
  const charBoardCard = page.locator('.sr-board-card.sr-card-character')
  await charBoardCard.click()
  await page.keyboard.down('Tab')
  await page.keyboard.press('r')
  await page.keyboard.up('Tab')
  await expect(charBoardCard.locator('.sr-char-card')).toBeVisible()
  await expect(charBoardCard.locator('.sr-char-photo')).toHaveCount(1)
  await expect(charBoardCard.locator('.sr-char-qr-img')).toHaveCount(1)
  await page.screenshot({ path: `${out}/08-board-character-card-form.png` })
  await page.keyboard.down('Tab')
  await page.keyboard.press('q')
  await page.keyboard.up('Tab')
  await expect(charBoardCard.locator('.sr-food-form-icon')).toBeVisible()

  const recipeBoardCard = page.locator('.sr-board-card.sr-card-recipe')
  await recipeBoardCard.click()
  await page.keyboard.down('Tab')
  await page.keyboard.press('e')
  await page.keyboard.up('Tab')
  await expect(recipeBoardCard.locator('.sr-food-form-info')).toContainText('辣龙腿')
  await page.screenshot({ path: `${out}/09-board-forms-switched.png` })

  // ---- 9. 持久化：刷新后两张资产卡仍在（storage 白名单放行） ----
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[data-character-id="yangzheng"]')).toHaveCount(1)
  await expect(page.locator('[data-recipe-id="la-long-tui"]')).toHaveCount(1)
  await expect(page.locator('.sr-board-card.sr-card-character .sr-food-form-icon')).toHaveCount(1)
  await expect(page.locator('.sr-board-card.sr-card-recipe .sr-food-form-info')).toHaveCount(1)

  expect(errors, 'No browser exceptions').toEqual([])
  console.log(JSON.stringify({ passed: true, assertions: 'rail buttons, character panel icon/card views, holo front + unchanged back flip + QR, click-to-create node forms, recipe 4-port node 232h, Tab+QWER form switch, persistence after reload', screenshots: out }))
} finally { await browser.close() }
