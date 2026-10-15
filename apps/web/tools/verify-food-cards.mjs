// 🔴 改动 2026-10-09 · 食品原材料三卡对比页截图验收。
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = '../../output/food-cards';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:3000/workshop/food-cards');
// 🔴 改动 2026-10-10 · 页面默认三维镭射版，先切到平面版再验收。
await page.getByRole('button', { name: '平面版 · 信息密度' }).click();
await page.waitForSelector('.food-card');
assert.equal(await page.locator('.food-card').count(), 3, 'three cards');
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/food-cards-dark.png` });
await page.getByRole('button', { name: '切换主题' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/food-cards-light.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/food-cards-mobile.png` });
for (const sel of ['.food-card-badges img', '.food-card-art > img']) {
  for (const img of await page.locator(sel).all()) {
    assert.ok(await img.evaluate(i => i.complete && i.naturalWidth > 0), `image loaded: ${await img.getAttribute('src')}`);
  }
}
// 🔴 改动 2026-10-10 · 购买按钮：三张卡各一，点击不触发翻面。
assert.equal(await page.locator('.food-card-buy').count(), 3, 'three buy buttons');
await page.locator('.food-card-buy').first().click();
await page.waitForTimeout(400);
assert.equal(await page.locator('.food-card.is-flipped').count(), 0, 'buy click does not flip card');
assert.deepEqual(errors, []);
console.log(JSON.stringify({ passed: ['render-3-cards', 'dark', 'light', 'mobile', 'images-loaded', 'buy-buttons', 'buy-no-flip'], errors }));
await browser.close();
