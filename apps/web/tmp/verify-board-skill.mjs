/* 版图技能系统验证：收益链路虚线框（运行→收益线程）/ 回流买入端口形成循环实线框（运转→收益循环） */
import { chromium } from '@playwright/test'

const KEY = 'superretail.atlas.board.v1'

const baseDoc = (withLoop) => ({
  title: '技能验证',
  viewport: { x: 60, y: 40, zoom: 1 },
  cards: [
    { id: 'c-chili', type: 'food', x: 80, y: 120, w: 238, h: 172, text: '', meta: { foodId: 'anjihai-chili', form: 'node' } },
    { id: 'c-recipe', type: 'recipe', x: 560, y: 180, w: 238, h: 232, text: '', meta: { recipeId: 'la-long-tui', form: 'node' } },
    { id: 'c-rev', type: 'revenue', x: 380, y: 500, w: 238, h: 160, text: '', meta: { sale: 'l-sale', title: '安集海辣皮子 · 收益' } },
  ],
  lines: [
    { id: 'l-supply', from: 'c-chili', to: 'c-recipe', fromPort: 'supply', toPort: 'ing-0' },
    { id: 'l-sale', from: 'c-chili', to: 'c-recipe', fromPort: 'sell', toPort: 'buy' },
    ...(withLoop ? [{ id: 'l-back', from: 'c-rev', to: 'c-chili', fromPort: 'materials', toPort: 'in' }] : []),
  ],
})

const run = async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)))

  const loadDoc = async (withLoop) => {
    const raw = JSON.stringify(baseDoc(withLoop))
    await ctx.addInitScript(({ k, raw }) => localStorage.setItem(k, raw), { k: KEY, raw })
    await page.goto('http://localhost:3000/atlas', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
  }

  const snapshot = () =>
    page.evaluate((k) => {
      const board = document.querySelector('.sr-board')
      return {
        frameGold: document.querySelectorAll('.sr-board-frame-gold').length,
        frameLoop: document.querySelectorAll('.sr-board-frame-loop').length,
        frameThread: document.querySelectorAll('.sr-board-frame-thread').length,
        frameCycle: document.querySelectorAll('.sr-board-frame-cycle').length,
        castable: document.querySelectorAll('.sr-board-frame.is-castable').length,
        badge: document.querySelector('.sr-board-frame-badge text')?.textContent?.trim() ?? null,
        pulses: [...document.querySelectorAll('.sr-board-thread-pulse')].filter((el) => getComputedStyle(el).opacity !== '0').length,
        armed: board?.classList.contains('sr-skill-armed') ?? false,
        revFoot: document.querySelector('.sr-revenue-foot')?.textContent?.trim() ?? null,
        storedActivated: JSON.parse(localStorage.getItem(k) || '{}').cards?.find((c) => c.id === 'c-rev')?.meta?.activated ?? false,
        hint: document.querySelector('.sr-skill-hint')?.textContent?.trim() ?? null,
      }
    }, KEY)

  const frameCenter = async (sel) => {
    const box = await page.locator(sel).first().boundingBox()
    if (!box) throw new Error(`frame missing: ${sel}`)
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }
  const runSkill = page.getByRole('button', { name: /技能槽 2 · 运行/ })
  const operateSkill = page.getByRole('button', { name: /技能槽 3 · 运转/ })

  // ================= 未循环：虚线框（运行 → 收益线程） =================
  await loadDoc(false)
  console.log('THREAD_ELIGIBLE:', JSON.stringify(await snapshot()))
  await page.screenshot({ path: 'tmp/board-skill-eligible.png' })
  await runSkill.click()
  await page.waitForTimeout(300)
  const c = await frameCenter('.sr-board-frame-gold')
  await page.mouse.click(c.x, c.y)
  await page.waitForTimeout(900)
  console.log('THREAD_ACTIVATED:', JSON.stringify(await snapshot()))
  await page.screenshot({ path: 'tmp/board-skill-thread.png' })

  // 运转打未循环链路 → 未命中
  await loadDoc(false)
  await operateSkill.click()
  await page.waitForTimeout(300)
  const c0 = await frameCenter('.sr-board-frame-gold')
  await page.mouse.click(c0.x, c0.y)
  await page.waitForTimeout(900)
  console.log('OPERATE_ON_THREAD_CHAIN:', JSON.stringify(await snapshot()))

  // ================= 已循环：实线框（运转 → 收益循环） =================
  await loadDoc(true)
  console.log('LOOP_ELIGIBLE:', JSON.stringify(await snapshot()))
  await page.screenshot({ path: 'tmp/board-skill-loop-eligible.png' })

  // 运行打已循环链路 → 未命中（只接受运转）
  await runSkill.click()
  await page.waitForTimeout(300)
  const c1 = await frameCenter('.sr-board-frame-loop')
  await page.mouse.click(c1.x, c1.y)
  await page.waitForTimeout(900)
  console.log('PLAY_ON_LOOP_CHAIN:', JSON.stringify(await snapshot()))

  // 运转选中 → 实线框高亮（is-castable）→ 释放激活
  await operateSkill.click()
  await page.waitForTimeout(300)
  const armedLoop = await snapshot()
  console.log('ARMED_OPERATE:', JSON.stringify(armedLoop))
  const c2 = await frameCenter('.sr-board-frame-loop')
  await page.mouse.click(c2.x, c2.y)
  await page.waitForTimeout(900)
  console.log('CYCLE_ACTIVATED:', JSON.stringify(await snapshot()))
  await page.screenshot({ path: 'tmp/board-skill-cycle.png' })

  // ================= 工坊演示页（虚线框 vs 实线循环） =================
  await page.goto('http://localhost:3000/workshop/revenue-wires', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const demo = await page.evaluate(() => ({
    gold: document.querySelectorAll('.sr-board-frame-gold').length,
    cycle: document.querySelectorAll('.sr-board-frame-cycle').length,
    badges: document.querySelectorAll('.sr-board-frame-badge text').length,
  }))
  console.log('DEMO_PAGE:', JSON.stringify(demo))

  await browser.close()
  console.log('SHOTS_OK')
}
run().catch((e) => { console.error(e); process.exit(1) })
