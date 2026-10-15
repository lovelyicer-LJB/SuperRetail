/* 工坊收益连线演示页截图验证 */
import { chromium } from '@playwright/test'

const run = async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)))
  await page.goto('http://localhost:5199/workshop/revenue-wires', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const dbg = await page.evaluate(() => ({
    boards: document.querySelectorAll('.sr-board').length,
    gold: document.querySelectorAll('.sr-wire-gold').length,
    loop: document.querySelectorAll('.sr-wire-gold-loop').length,
    shimmer: document.querySelectorAll('.sr-board-wire-shimmer').length,
    revenue: document.querySelectorAll('.sr-card-revenue').length,
  }))
  console.log('DBG:', JSON.stringify(dbg))
  await page.screenshot({ path: 'tmp/revenue-wires-page.png', fullPage: true })
  await browser.close()
  console.log('SHOT_OK')
}
run().catch((e) => { console.error(e); process.exit(1) })
