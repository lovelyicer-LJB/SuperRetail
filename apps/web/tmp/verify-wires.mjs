/* 收益金色连线验证：两个独立浏览器上下文分别造静态金（仅收益节点）与流动金（闭环）场景截图 */
import { chromium } from '@playwright/test'

const KEY = 'superretail.atlas.board.v1'

const baseDoc = () => ({
  title: '收益验证',
  viewport: { x: 60, y: 40, zoom: 1 },
  cards: [
    { id: 'c-chili', type: 'food', x: 80, y: 120, w: 238, h: 172, text: '', meta: { foodId: 'anjihai-chili', form: 'node' } },
    { id: 'c-tea', type: 'food', x: 80, y: 360, w: 238, h: 172, text: '', meta: { foodId: 'xihu-longjing', form: 'node' } },
    { id: 'c-recipe', type: 'recipe', x: 560, y: 180, w: 238, h: 232, text: '', meta: { recipeId: 'la-long-tui', form: 'node' } },
    { id: 'c-rev', type: 'revenue', x: 380, y: 500, w: 238, h: 160, text: '', meta: { sale: 'l-sale', title: '安集海辣皮子 · 收益' } },
  ],
  lines: [
    { id: 'l-supply', from: 'c-chili', to: 'c-recipe', fromPort: 'supply', toPort: 'ing-0' },
    { id: 'l-tea', from: 'c-tea', to: 'c-recipe', fromPort: 'supply', toPort: 'ing-1' },
    { id: 'l-sale', from: 'c-chili', to: 'c-recipe', fromPort: 'sell', toPort: 'buy' },
  ],
})

const loopDoc = () => {
  const d = baseDoc()
  d.lines.push({ id: 'l-back', from: 'c-rev', to: 'c-chili', fromPort: 'materials', toPort: 'in' })
  return d
}

const shoot = async (browser, doc, path) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript(({ k, doc: d }) => localStorage.setItem(k, JSON.stringify(d)), { k: KEY, doc })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)))
  await page.goto('http://localhost:5199/atlas', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  const dbg = await page.evaluate(() => ({
    cards: document.querySelectorAll('.sr-board-card').length,
    gold: document.querySelectorAll('.sr-wire-gold').length,
    loop: document.querySelectorAll('.sr-wire-gold-loop').length,
    shimmer: document.querySelectorAll('.sr-board-wire-shimmer').length,
  }))
  console.log(path, JSON.stringify(dbg))
  await page.screenshot({ path })
  return { ctx, page }
}

const run = async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  })
  const a = await shoot(browser, baseDoc(), 'tmp/wire-static-gold.png')
  await a.ctx.close()
  const b = await shoot(browser, loopDoc(), 'tmp/wire-loop-gold.png')
  // 场景 C：双击删除卖出连线 → 收益节点及其直连连线应级联删除（剩 3 卡 2 线，金色全消失）
  await b.page.evaluate(() => {
    const hits = document.querySelectorAll('.sr-board-wire-hit')
    // board.lines 顺序：l-supply, l-tea, l-sale, l-back → 卖出连线是第 3 组
    hits[2]?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
  await b.page.waitForTimeout(1100)
  const after = await b.page.evaluate((k) => ({
    cards: document.querySelectorAll('.sr-board-card').length,
    wires: document.querySelectorAll('.sr-board-wire').length,
    gold: document.querySelectorAll('.sr-wire-gold').length,
    revenueCards: document.querySelectorAll('.sr-card-revenue').length,
    stored: JSON.parse(localStorage.getItem(k) || '{}').lines?.length,
  }), KEY)
  console.log('AFTER_CASCADE', JSON.stringify(after))
  await b.page.screenshot({ path: 'tmp/wire-cascade.png' })
  await b.ctx.close()
  await browser.close()
  console.log('SHOTS_OK')
}
run().catch((e) => { console.error(e); process.exit(1) })
