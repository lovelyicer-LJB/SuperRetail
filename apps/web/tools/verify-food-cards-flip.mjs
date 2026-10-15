// 🔴 改动 2026-10-10 · 平面卡背翻转验收：点击翻面、卡背字段与二维码、翻回正面。
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = '../../output/food-cards';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:3000/workshop/food-cards');
await page.getByRole('button', { name: '平面版 · 信息密度' }).click();
await page.waitForSelector('.food-card');

// 点击第一张卡翻面
const first = page.locator('.food-card').first();
await first.click();
await page.waitForSelector('.food-card.is-flipped');
assert.equal(await page.locator('.food-card.is-flipped').count(), 1, 'exactly one card flipped');

// 卡背字段：批次号 / 证书编号 / 发行价
for (const text of ['溯源档案', '批次号', '证书编号', '发行价']) {
  assert.ok(await page.locator('.food-card-back', { hasText: text }).count() >= 1, `back shows ${text}`);
}
assert.equal(await page.locator('.food-card-back-flow li').count(), 9, 'three cards × three circulation records');

// 二维码生成（qrcode → dataURL）
await page.waitForSelector('.food-card-qr[src^="data:image"]');
assert.equal(await page.locator('.food-card-qr[src^="data:image"]').count(), 3, 'three QR codes rendered');
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/food-card-back-dark.png` });

// 浅色主题卡背
await page.getByRole('button', { name: '切换主题' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/food-card-back-light.png` });
await page.getByRole('button', { name: '切换主题' }).click();

// 翻回正面
await first.click();
await page.waitForTimeout(700);
assert.equal(await page.locator('.food-card.is-flipped').count(), 0, 'flipped back to front');

assert.deepEqual(errors, []);
console.log(JSON.stringify({ passed: ['flip-to-back', 'back-fields', 'circulation-records', 'qr-rendered', 'dark-light-back', 'flip-to-front'], errors }));
await browser.close();
