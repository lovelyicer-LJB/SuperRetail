// 🔴 改动 2026-10-10 · 镭射三维卡翻面验收：点击翻面、双向翻回、卡背渲染、拖动不误触。
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

const first = page.locator('.food-card-model-canvas').first();
const box = await first.boundingBox();
const clickLeft = async () => { await page.mouse.click(box.x + box.width * .25, box.y + box.height * .5); await page.waitForTimeout(1200); };
const clickRight = async () => { await page.mouse.click(box.x + box.width * .75, box.y + box.height * .5); await page.waitForTimeout(1200); };
const flipped = () => first.getAttribute('data-flipped');

// 右半区点击 → 向右翻面到背面
await clickRight();
assert.equal(await flipped(), 'true', 'right-side click flips card to back');
// 🔴 改动 2026-10-10 · 翻到背面时购买按钮隐藏。
const buyBtn = page.locator('.food-card-model .food-card-buy').first();
assert.equal(await buyBtn.evaluate(b => getComputedStyle(b).opacity), '0', 'buy button hidden on back');
await page.screenshot({ path: `${out}/food-cards-3d-back.png` });

// 背面点右半区 → 继续向右转回正面（同向翻回）
await clickRight();
assert.equal(await flipped(), 'false', 'right-side click on back returns to front (same direction)');

// 左半区点击 → 向左翻面
await clickLeft();
assert.equal(await flipped(), 'true', 'left-side click flips card to back');

// 拖动（大位移）不应改变翻面状态
await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * .85, box.y + box.height * .3, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(400);
assert.equal(await flipped(), 'true', 'drag does not toggle flip');

// 背面点左半区 → 向左翻回正面
await clickLeft();
assert.equal(await flipped(), 'false', 'left-side click on back returns to front');
assert.equal(await buyBtn.evaluate(b => getComputedStyle(b).opacity), '1', 'buy button visible on front');

// 其余两张卡未被联动翻面
assert.equal(await page.locator('.food-card-model-canvas[data-flipped="true"]').count(), 0, 'other cards unaffected');

assert.deepEqual(errors, []);
console.log(JSON.stringify({ passed: ['click-flip-right', 'buy-hidden-on-back', 'back-face-render', 'flip-back-same-direction', 'click-flip-left', 'drag-no-toggle', 'flip-back-left', 'buy-visible-on-front', 'no-cross-flip'], errors }));
await browser.close();
