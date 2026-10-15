import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe' })
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:5199/workshop', { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
await p.screenshot({ path: 'tmp/workshop-entry.png' })
await b.close()
console.log('OK')
