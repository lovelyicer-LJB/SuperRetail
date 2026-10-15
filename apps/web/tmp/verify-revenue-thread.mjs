/* 收益循环 & 收益线程演示页验证：金色虚线框 + 技能激活 + 形态切换（循环回流 / 线程单向）+ UE5 执行流动效截图 */
import { chromium } from '@playwright/test'

const run = async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)))
  await page.goto('http://localhost:3000/workshop/revenue-thread', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  const snapshot = () => page.evaluate(() => ({
    frameDashed: getComputedStyle(document.querySelector('.rt-frame')).strokeDasharray,
    nodes: document.querySelectorAll('.rt-node').length,
    wires: document.querySelectorAll('.rt-wire').length,
    loopWire: document.querySelectorAll('.rt-wire[data-depth="4"]').length,
    active: document.querySelector('.rt')?.classList.contains('is-active'),
    threadMode: document.querySelector('.rt')?.classList.contains('is-thread'),
    flowVisible: [...document.querySelectorAll('.rt-wire-flow')].filter((el) => getComputedStyle(el).opacity !== '0').length,
    pill: document.querySelector('.rt-state-pill')?.textContent?.trim(),
    badge: document.querySelector('.rt-frame-badge text')?.textContent?.trim(),
    loopPorts: document.querySelectorAll('.rt-port').length,
  }))

  const before = await snapshot()
  console.log('DORMANT_LOOP:', JSON.stringify(before))
  await page.screenshot({ path: 'tmp/revenue-thread-dormant.png', fullPage: true })

  // 循环形态：点击技能 → 激活（收益循环）
  await page.getByRole('button', { name: /运行技能/ }).click()
  await page.waitForTimeout(700)
  const afterClick = await snapshot()
  console.log('AFTER_CLICK_LOOP:', JSON.stringify(afterClick))
  await page.waitForTimeout(1600)
  await page.screenshot({ path: 'tmp/revenue-thread-loop-active.png', fullPage: true })

  // 切换为「收益线程」：回连线消失、脉冲单向、文案切换
  await page.getByRole('button', { name: '收益线程', exact: true }).click()
  await page.waitForTimeout(700)
  const afterSwitch = await snapshot()
  console.log('AFTER_SWITCH_THREAD:', JSON.stringify(afterSwitch))
  await page.waitForTimeout(1600)
  await page.screenshot({ path: 'tmp/revenue-thread-thread-active.png', fullPage: true })

  // 重置 → 线程形态下拖入虚线框激活
  await page.getByRole('button', { name: /重新演示/ }).click()
  await page.waitForTimeout(300)
  const chip = page.getByRole('button', { name: /运行技能/ })
  const chipBox = await chip.boundingBox()
  const frameBox = await page.locator('.rt-frame').boundingBox()
  if (!chipBox || !frameBox) throw new Error('chip/frame box missing')
  await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2, { steps: 18 })
  await page.mouse.up()
  await page.waitForTimeout(900)
  const afterDragThread = await snapshot()
  console.log('AFTER_DRAG_THREAD:', JSON.stringify(afterDragThread))

  // 拖出框外松开 → 不激活（线程形态下验证一次）
  await page.getByRole('button', { name: /重新演示/ }).click()
  await page.waitForTimeout(300)
  const chipBox2 = await chip.boundingBox()
  if (!chipBox2) throw new Error('chip box missing after reset')
  await page.mouse.move(chipBox2.x + chipBox2.width / 2, chipBox2.y + chipBox2.height / 2)
  await page.mouse.down()
  await page.mouse.move(chipBox2.x + 60, chipBox2.y + 260, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const afterMiss = await snapshot()
  console.log('AFTER_DRAG_MISS:', JSON.stringify(afterMiss))

  // 工坊入口卡验证
  await page.goto('http://localhost:3000/workshop', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const entry = await page.evaluate(() => ({
    link: [...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/workshop/revenue-thread'),
    heading: [...document.querySelectorAll('h2')].some((h) => h.textContent?.includes('收益循环')),
  }))
  console.log('WORKSHOP_ENTRY:', JSON.stringify(entry))
  await page.screenshot({ path: 'tmp/revenue-thread-entry.png', fullPage: true })

  await browser.close()
  console.log('SHOTS_OK')
}
run().catch((e) => { console.error(e); process.exit(1) })
