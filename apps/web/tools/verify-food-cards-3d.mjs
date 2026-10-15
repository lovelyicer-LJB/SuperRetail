// 🔴 改动 2026-10-09 · 镭射材质三维食品卡截图验收。
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = '../../output/food-cards';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:3000/workshop/food-cards');
await page.waitForFunction(() => document.querySelectorAll('.food-card-model-canvas[data-ready]').length === 3, null, { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/food-cards-3d-dark.png` });
// 拖动第一张卡验证交互与材质反射
const box = await page.locator('.food-card-model-canvas').first().boundingBox();
await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * .9, box.y + box.height * .35, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/food-cards-3d-tilted.png` });
// 切回平面版确认双模式
await page.getByRole('button', { name: '平面版 · 信息密度' }).click();
await page.waitForSelector('.food-card');
assert.equal(await page.locator('.food-card').count(), 3, 'flat mode three cards');
assert.deepEqual(errors, []);
console.log(JSON.stringify({ passed: ['3d-render-3-cards', 'drag-tilt', 'toggle-flat'], errors }));
await browser.close();
