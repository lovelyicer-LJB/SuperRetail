/* 悬浮子画板（画中画）交互验证：框选重叠选中 / 蓝色四边分隔线 / 左键拖动（选中后）/ 右键直接拖动 */
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
  const raw = JSON.stringify(baseDoc())
  await ctx.addInitScript(({ k, raw }) => {
    localStorage.setItem(k, raw)
    localStorage.removeItem('superretail.atlas.split.v1')
  }, { k: KEY, raw })
  await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)

  const snap = () =>
    page.evaluate(() => {
      const win = document.querySelector('.sr-pinned-board')
      const r = win?.getBoundingClientRect()
      return {
        win: !!win,
        selected: win?.classList.contains('is-selected') ?? false,
        dividers: document.querySelectorAll('.sr-pin-divider').length,
        corners: document.querySelectorAll('.sr-pin-corner').length,
        box: r ? { x: Math.round(r.left), y: Math.round(r.top) } : null,
        ctxMenu: !!document.querySelector('.sr-board-ctxmenu'),
      }
    })

  // 激活 → 悬浮窗口
  const runSkill = page.getByRole('button', { name: /技能槽 2 · 运行/ })
  await runSkill.click()
  await page.waitForTimeout(300)
  const frameBox = await page.locator('.sr-board-frame-gold').first().boundingBox()
  if (!frameBox) throw new Error('frame missing')
  await page.mouse.click(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2)
  await page.waitForTimeout(1000)
  const initial = await snap()
  console.log('PIP_CREATED:', JSON.stringify(initial))

  // ① 框线框选（矩形与窗口重叠即选中）
  await page.mouse.move(1000, 250)
  await page.mouse.down()
  await page.mouse.move(400, 380, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const afterMarquee = await snap()
  console.log('AFTER_MARQUEE_OVERLAP:', JSON.stringify(afterMarquee))
  await page.screenshot({ path: 'tmp/board-pip-selected.png' })

  // ② 框选不重叠 → 取消选中
  await page.mouse.move(1100, 650)
  await page.mouse.down()
  await page.mouse.move(1250, 720, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const afterMiss = await snap()
  console.log('AFTER_MARQUEE_MISS:', JSON.stringify(afterMiss))

  // ③ 左键点击窗口（未选中）→ 进入选中，位置不变
  const win1 = await page.locator('.sr-pinned-board').boundingBox()
  if (!win1) throw new Error('win1 missing')
  await page.mouse.click(win1.x + win1.width / 2, win1.y + 24) // 头部
  await page.waitForTimeout(300)
  const afterClickSelect = await snap()
  console.log('AFTER_CLICK_SELECT:', JSON.stringify(afterClickSelect))

  // ④ 未选中时左键拖动 → 不移动（先取消选中）
  await page.mouse.move(1200, 200)
  await page.mouse.down()
  await page.mouse.move(1210, 205, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const win2 = await page.locator('.sr-pinned-board').boundingBox()
  if (!win2) throw new Error('win2 missing')
  const beforeDrag = { x: Math.round(win2.x), y: Math.round(win2.y) }
  // 现在未选中（空点点击取消）→ 拖头部应只选中不移动
  await page.mouse.move(win2.x + 100, win2.y + 14)
  await page.mouse.down()
  await page.mouse.move(win2.x + 180, win2.y + 60, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const win3 = await page.locator('.sr-pinned-board').boundingBox()
  const afterUnselectedDrag = await snap()
  console.log('AFTER_UNSELECTED_DRAG:', JSON.stringify({ ...afterUnselectedDrag, moved: !win3 || (Math.round(win3.x) !== beforeDrag.x || Math.round(win3.y) !== beforeDrag.y) }))

  // ⑤ 已选中 → 左键拖动头部移动窗口
  const win4 = await page.locator('.sr-pinned-board').boundingBox()
  if (!win4) throw new Error('win4 missing')
  await page.mouse.move(win4.x + 120, win4.y + 14)
  await page.mouse.down()
  await page.mouse.move(win4.x + 120 + 90, win4.y + 14 + 70, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const win5 = await page.locator('.sr-pinned-board').boundingBox()
  const afterSelectedDrag = await snap()
  console.log('AFTER_SELECTED_DRAG:', JSON.stringify({ ...afterSelectedDrag, dx: win5 ? Math.round(win5.x - win4.x) : null, dy: win5 ? Math.round(win5.y - win4.y) : null }))

  // ⑥ 右键直接拖动（任意部位，无需选中）
  const win6 = await page.locator('.sr-pinned-board').boundingBox()
  if (!win6) throw new Error('win6 missing')
  // 先取消选中（空白点击）
  await page.mouse.click(1250, 250)
  await page.waitForTimeout(250)
  await page.mouse.move(win6.x + 200, win6.y + 300)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(win6.x + 200 - 60, win6.y + 300 + 50, { steps: 8 })
  await page.mouse.up({ button: 'right' })
  await page.waitForTimeout(300)
  const win7 = await page.locator('.sr-pinned-board').boundingBox()
  const afterRightDrag = await snap()
  console.log('AFTER_RIGHT_DRAG:', JSON.stringify({ ...afterRightDrag, dx: win7 ? Math.round(win7.x - win6.x) : null, dy: win7 ? Math.round(win7.y - win6.y) : null }))
  await page.screenshot({ path: 'tmp/board-pip-dragged.png' })

  // ⑦ 右键原地点击 → 不弹画板右键菜单
  await page.mouse.click(win7.x + 200, win7.y + 200, { button: 'right' })
  await page.waitForTimeout(300)
  const ctxAfterRightClick = await snap()
  console.log('AFTER_RIGHT_CLICK_NO_MENU:', JSON.stringify({ ctxMenu: ctxAfterRightClick.ctxMenu }))

  await browser.close()
  console.log('SHOTS_OK')
}
run().catch((e) => { console.error(e); process.exit(1) })
