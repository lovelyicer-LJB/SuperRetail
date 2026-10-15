// 🔴 改动 2026-10-12 · 验收：工坊页底部的「查询/命令/权限」能力占位声明已撤下；其余模块占位页（/market）保留。
import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const out = new URL('../../../output/workshop-trim/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
await mkdir(out, { recursive: true })

try {
  // ---- 1. 工坊页：占位声明区块与脚注不再出现，入口卡片仍在 ----
  await page.goto('http://127.0.0.1:3000/workshop')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByText('查询 Queries')).toHaveCount(0)
  await expect(page.getByText('命令 Commands')).toHaveCount(0)
  await expect(page.getByText('权限 Permissions')).toHaveCount(0)
  await expect(page.getByText(/能力接口为占位声明/)).toHaveCount(0)
  await expect(page.getByText('数字资产 · 四种形态')).toBeVisible()
  await page.screenshot({ path: `${out}/01-workshop-without-capabilities.png`, fullPage: true })

  // ---- 2. 其他模块占位页（/market）：占位声明保留 ----
  await page.goto('http://127.0.0.1:3000/market')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByText('查询 Queries')).toBeVisible()
  await expect(page.getByText('权限 Permissions')).toBeVisible()
  await page.screenshot({ path: `${out}/02-market-keeps-capabilities.png`, fullPage: true })

  expect(errors, 'No browser exceptions').toEqual([])
  console.log(JSON.stringify({ passed: true, assertions: 'workshop page capability cards + footnote removed, entry cards kept; /market placeholder page unchanged', screenshots: out }))
} finally { await browser.close() }
