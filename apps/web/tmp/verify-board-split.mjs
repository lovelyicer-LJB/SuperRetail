/* 版图子画板化 + 树形拆分 + 主画板规则 + 删除弹窗 验证 */
import { chromium } from '@playwright/test'

const KEY = 'superretail.atlas.board.v1'

const baseDoc = () => ({
  title: '主画板',
  viewport: { x: 60, y: 40, zoom: 1 },
  cards: [
    { id: 'c-chili', type: 'food', x: 80, y: 120, w: 238, h: 172, text: '', meta: { foodId: 'anjihai-chili', form: 'node' } },
    { id: 'c-recipe', type: 'recipe', x: 560, y: 180, w: 238, h: 232, text: '', meta: { recipeId: 'la-long-tui', form: 'node' } },
    { id: 'c-rev', type: 'revenue', x: 380, y: 500, w: 238, h: 160, text: '', meta: { sale: 'l-sale', title: '安集海辣皮子 · 收益' } },
  ],
  lines: [
    { id: 'l-supply', from: 'c-chili', to: 'c-recipe', fromPort: 'supply', toPort: 'ing-0' },
    { id: 'l-sale', from: 'c-chili', to: 'c-recipe', fromPort: 'sell', toPort: 'buy' },
  ],
})

const run = async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)))

  const loadDoc = async () => {
    const raw = JSON.stringify(baseDoc())
    await ctx.addInitScript(({ k, raw }) => {
      localStorage.setItem(k, raw)
      localStorage.removeItem('superretail.atlas.split.v1')
    }, { k: KEY, raw })
    await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1600)
  }

  const snap = () =>
    page.evaluate(() => {
      const split = JSON.parse(localStorage.getItem('superretail.atlas.split.v1') || 'null')
      const collect = (node) => {
        if (!node) return []
        if (node.kind === 'board') return [{ tab: node.tab, collapsed: !!node.collapsed }]
        return [...collect(node.first), ...collect(node.second)]
      }
      return {
        boards: document.querySelectorAll('.sr-board').length,
        cards: document.querySelectorAll('.sr-board-card').length,
        frames: document.querySelectorAll('.sr-board-frame').length,
        pinnedWin: !!document.querySelector('.sr-pinned-board'),
        pinnedCards: document.querySelectorAll('.sr-pinned-board .sr-board-card').length,
        pinnedFrames: document.querySelectorAll('.sr-pinned-board .sr-board-frame').length,
        pinnedPulses: [...document.querySelectorAll('.sr-pinned-board .sr-board-thread-pulse')].filter((el) => getComputedStyle(el).opacity !== '0').length,
        tabs: [...document.querySelectorAll('[aria-label="画板 Tab 坞"] button')].map((b) => b.textContent?.replace(/[\s·屏幕钉]+$/g, '').trim()),
        splitBoards: split?.boards?.length ?? 0,
        splitLeaves: collect(split?.root).length,
        collapsedLeaves: collect(split?.root).filter((l) => l.collapsed).length,
        splitPinned: split?.pinned ?? [],
        mainCards: [...document.querySelectorAll('.sr-board-card')].filter((el) => !el.closest('.sr-pinned-board')).length,
      }
    })

  // ============ ① 技能激活 → 框线范围变子画板（新 Tab + 屏幕钉浮动窗口 + 框线删除只留脉冲） ============
  await loadDoc()
  console.log('INITIAL:', JSON.stringify(await snap()))
  const runSkill = page.getByRole('button', { name: /技能槽 2 · 运行/ })
  await runSkill.click()
  await page.waitForTimeout(300)
  const frameBox = await page.locator('.sr-board-frame-gold').first().boundingBox()
  if (!frameBox) throw new Error('frame missing')
  await page.mouse.click(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2)
  await page.waitForTimeout(1200)
  const afterThread = await snap()
  console.log('AFTER_THREAD_ACTIVATION:', JSON.stringify(afterThread))
  await page.screenshot({ path: 'tmp/board-split-pinned-thread.png' })

  // ============ ② 收起浮动窗口 → Tab 复位 ============
  await page.getByRole('button', { name: /^收起 / }).click()
  await page.waitForTimeout(600)
  const afterCollapse = await snap()
  console.log('AFTER_WINDOW_COLLAPSE:', JSON.stringify(afterCollapse))
  await page.locator('[aria-label="画板 Tab 坞"] button', { hasText: '收益线程' }).click()
  await page.waitForTimeout(900)
  const afterRestore = await snap()
  console.log('AFTER_TAB_RESTORE:', JSON.stringify(afterRestore))

  // ============ ③ 空白右键菜单（拆分/收起/删除；主画板无「成为主画板」） ============
  const gridBox = await page.locator('.sr-board-grid').first().boundingBox()
  if (!gridBox) throw new Error('grid missing')
  await page.mouse.click(gridBox.x + 40, gridBox.y + 40, { button: 'right' })
  await page.waitForTimeout(300)
  const mainMenu = await page.evaluate(() => [...document.querySelectorAll('.sr-board-ctxitem')].map((el) => el.textContent?.trim()))
  console.log('MAIN_CTX_MENU:', JSON.stringify(mainMenu))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // ============ ④ 空白右键「拆分画板」→ 该画板拆分（两块） ============
  await page.mouse.click(gridBox.x + 40, gridBox.y + 40, { button: 'right' })
  await page.waitForTimeout(300)
  await page.locator('.sr-board-ctxitem', { hasText: '拆分画板' }).click()
  await page.waitForTimeout(900)
  const afterSplit = await snap()
  console.log('AFTER_BOARD_SPLIT:', JSON.stringify(afterSplit))
  await page.screenshot({ path: 'tmp/board-split-two.png' })

  // ============ ⑤ 分隔线右键：拆分（两块同时 → 4 块） ============
  const divider = page.locator('[data-split-divider]').first()
  const dividerBox = await divider.boundingBox()
  if (!dividerBox) throw new Error('divider missing')
  await page.mouse.click(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2, { button: 'right' })
  await page.waitForTimeout(300)
  const dividerMenu = await page.evaluate(() => [...document.querySelectorAll('[aria-label="分隔线操作菜单"] button')].map((el) => el.textContent?.trim()))
  console.log('DIVIDER_MENU:', JSON.stringify(dividerMenu))
  await page.getByRole('menuitem', { name: '拆分（两块同时）' }).click()
  await page.waitForTimeout(900)
  const afterFour = await snap()
  console.log('AFTER_4_PANE_SPLIT:', JSON.stringify(afterFour))
  await page.screenshot({ path: 'tmp/board-split-four.png' })

  // ============ ⑥ 分隔线右键：向左覆盖 → 被覆盖画板进入收起态 ============
  const divider2 = page.locator('[data-split-divider]').first()
  const dividerBox2 = await divider2.boundingBox()
  if (!dividerBox2) throw new Error('divider2 missing')
  await page.mouse.click(dividerBox2.x + dividerBox2.width / 2, dividerBox2.y + dividerBox2.height / 2, { button: 'right' })
  await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: '向左覆盖' }).click()
  await page.waitForTimeout(700)
  const afterCover = await snap()
  console.log('AFTER_COVER_LEFT:', JSON.stringify(afterCover))

  // ============ ⑦ Tab 菜单「成为主画板」→ 主画板与 Tab 互换（取最后一个 Tab4） ============
  const lastBoardTab = page.locator('[aria-label="画板 Tab 坞"] button', { hasText: 'Tab4' })
  const tabBox = await lastBoardTab.boundingBox()
  if (!tabBox) throw new Error('tab missing')
  await page.mouse.click(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2, { button: 'right' })
  await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: '成为主画板' }).click()
  await page.waitForTimeout(900)
  const afterBecomeMain = await snap()
  console.log('AFTER_BECOME_MAIN:', JSON.stringify(afterBecomeMain))

  // ============ ⑧ 删除拆分 Tab（旧主画板进 Tab 坞）：确认弹窗（取消 / 确认） ============
  const oldMainTab = page.locator('[aria-label="画板 Tab 坞"] button', { hasText: '主画板' }).last()
  const tabBox2 = await oldMainTab.boundingBox()
  if (!tabBox2) throw new Error('old-main tab missing')
  await page.mouse.click(tabBox2.x + tabBox2.width / 2, tabBox2.y + tabBox2.height / 2, { button: 'right' })
  await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: '删除 Tab' }).click()
  await page.waitForTimeout(400)
  const confirmShown = await page.getByRole('dialog', { name: '删除画板' }).isVisible()
  console.log('CONFIRM_MODAL_SHOWN:', confirmShown)
  await page.screenshot({ path: 'tmp/board-split-confirm.png' })
  await page.getByRole('button', { name: '取消' }).click()
  await page.waitForTimeout(300)
  const afterCancel = await snap()
  console.log('AFTER_DELETE_CANCEL:', JSON.stringify(afterCancel))
  // 再删一次并确认
  const tabBox3 = await oldMainTab.boundingBox()
  if (!tabBox3) throw new Error('old-main tab3 missing')
  await page.mouse.click(tabBox3.x + tabBox3.width / 2, tabBox3.y + tabBox3.height / 2, { button: 'right' })
  await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: '删除 Tab' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '确认' }).click()
  await page.waitForTimeout(900)
  const afterDeleteTab = await snap()
  console.log('AFTER_DELETE_TAB:', JSON.stringify(afterDeleteTab))

  // ============ ⑨ 删除主画板：安全弹窗（用户名 + 密码）→ 右侧画板成为主画板全展开 ============
  const mainTab = page.locator('[aria-label="画板 Tab 坞"] button').first()
  const mainTabBox = await mainTab.boundingBox()
  if (!mainTabBox) throw new Error('main tab missing')
  await page.mouse.click(mainTabBox.x + mainTabBox.width / 2, mainTabBox.y + mainTabBox.height / 2, { button: 'right' })
  await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: '删除画板' }).click()
  await page.waitForTimeout(400)
  const sec = page.getByRole('dialog', { name: '删除主画板 · 安全确认' })
  const secShown = await sec.isVisible()
  const username = await sec.locator('input').first().inputValue()
  console.log('SECURITY_MODAL:', JSON.stringify({ secShown, username }))
  // 空密码 → 报错
  await sec.getByRole('button', { name: '确认删除' }).click()
  await page.waitForTimeout(300)
  const errText = await page.locator('text=请输入密码后再确认删除').isVisible()
  console.log('EMPTY_PASSWORD_ERROR:', errText)
  // 输入密码 → 确认删除 → 右侧画板成为主画板并全展开
  await sec.locator('input[type=password]').fill('demo-pass')
  await sec.getByRole('button', { name: '确认删除' }).click()
  await page.waitForTimeout(1200)
  const afterDeleteMain = await snap()
  console.log('AFTER_DELETE_MAIN:', JSON.stringify(afterDeleteMain))
  await page.screenshot({ path: 'tmp/board-split-main-replaced.png' })

  await browser.close()
  console.log('SHOTS_OK')
}
run().catch((e) => { console.error(e); process.exit(1) })
