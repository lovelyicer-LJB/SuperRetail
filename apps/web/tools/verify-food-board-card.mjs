// 🔴 改动 2026-10-11 · 侧栏「实物」→ 版图 food 卡验收：浮窗开合、点击建卡、拖放建卡、连线、持久化。
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = '../../output/food-cards';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:3000/atlas');
await page.waitForSelector('.sr-board');

// 1) 侧栏「实物」按钮打开浮窗，列出三张工坊卡
await page.getByRole('button', { name: '实物', exact: true }).click();
const panel = page.locator('aside[aria-label="实物面板"]');
await panel.waitFor();
await page.waitForTimeout(400);
assert.equal(await panel.locator('button[draggable="true"]').count(), 12, 'panel lists 12 food cards');
await page.screenshot({ path: `${out}/physical-panel.png` });

// 2) 点击列表项 → 画板中心建 food 卡（浮窗随之关闭；🔴 2026-10-12 起新建默认节点形态）
await panel.locator('button[draggable="true"]').first().click();
await page.waitForSelector('.sr-board-card.sr-card-food');
assert.equal(await page.locator('.sr-card-food').count(), 1, 'click creates food card');
assert.ok(await page.locator('.sr-card-food').first().textContent().then(t => t.includes('西湖龙井')), 'card shows 西湖龙井');
assert.equal(await page.locator('.sr-card-food').first().getAttribute('data-food-form'), 'node', 'new food card defaults to node form');

// 2b) 样式回归（卡片形态）：先 Tab+R 切到卡片形态再断言（新建卡保持选中态）
await page.keyboard.down('Tab');
await page.keyboard.press('r');
await page.keyboard.up('Tab');
await page.waitForTimeout(150);
assert.equal(await page.locator('.sr-card-food').first().getAttribute('data-food-form'), 'card', 'Tab+R switches to card form');
const nameColor = await page.locator('.sr-card-food .sr-food-name h3').first().evaluate(el => getComputedStyle(el).color);
assert.equal(nameColor, 'rgb(245, 245, 255)', 'card name color = --sr-d-gray-1 (#f5f5ff)');
const cardBg = await page.locator('.sr-card-food .sr-food-card').first().evaluate(el => getComputedStyle(el).backgroundImage);
assert.ok(cardBg.startsWith('linear-gradient'), 'card body gradient intact');

// 3) HTML5 拖放协议：text/plain = food:<id> 在画板落点建卡（合成 DragEvent 模拟）
await page.evaluate(() => {
  const root = document.querySelector('.sr-board');
  const dt = new DataTransfer();
  dt.setData('text/plain', 'food:xihu-longjing');
  const rect = root.getBoundingClientRect();
  const ev = new DragEvent('drop', { bubbles: true, cancelable: true, clientX: rect.left + rect.width * 0.62, clientY: rect.top + rect.height * 0.52 });
  Object.defineProperty(ev, 'dataTransfer', { value: dt });
  root.dispatchEvent(ev);
});
await page.waitForTimeout(300);
assert.equal(await page.locator('.sr-card-food').count(), 2, 'drop creates food card at point');

// 4) 连线：循环浮窗 → 连线工具 → 依次点击两张 food 卡
await page.getByRole('button', { name: '循环', exact: true }).click();
await page.locator('aside[aria-label="循环面板"] button', { hasText: '连线' }).first().click();
await page.waitForTimeout(200);
const boxes = await page.locator('.sr-card-food').all();
const b0 = await boxes[0].boundingBox(); const b1 = await boxes[1].boundingBox();
await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height / 2);
await page.waitForTimeout(150);
await page.mouse.click(b1.x + b1.width / 2, b1.y + b1.height / 2);
await page.waitForTimeout(1200); // 越过 800ms 防抖落盘

// 5) 持久化断言：localStorage 文档含 2 张 food 卡 + 1 条连线
const doc = await page.evaluate(() => JSON.parse(localStorage.getItem('superretail.atlas.board.v1')));
const foodCards = doc.cards.filter(c => c.type === 'food');
assert.equal(foodCards.length, 2, 'persisted food cards');
assert.ok(foodCards.every(c => typeof c.meta.foodId === 'string'), 'foodId persisted in meta');
assert.equal(doc.lines.length, 1, 'line persisted');
await page.screenshot({ path: `${out}/physical-board.png` });

// 6) 刷新后卡片仍在（localStorage 回放）
await page.reload();
await page.waitForSelector('.sr-board');
await page.waitForTimeout(500);
assert.equal(await page.locator('.sr-card-food').count(), 2, 'food cards survive reload');

// 7) 第二批地标卡端到端：点击浮窗中的樟树港辣椒 → 默认节点形态建卡 → Tab+R 切卡片形态 → 金色限定版
await page.getByRole('button', { name: '实物', exact: true }).click();
const panel2 = page.locator('aside[aria-label="实物面板"]');
await panel2.waitFor();
await page.waitForTimeout(400);
await panel2.locator('button[title^="樟树港辣椒"]').click();
await page.waitForTimeout(400);
const zsg = page.locator('.sr-card-food', { hasText: '樟树港辣椒' });
assert.equal(await zsg.count(), 1, 'click creates zhangshugang card');
assert.equal(await zsg.first().getAttribute('data-food-form'), 'node', 'zhangshugang defaults to node form');
assert.ok(await zsg.locator('[data-food-id="zhangshugang-chili"]').count().then(n => n > 0), 'node form bound to zhangshugang data');
// Tab+R 切到卡片形态（新建卡保持选中态）
await page.keyboard.down('Tab');
await page.keyboard.press('r');
await page.keyboard.up('Tab');
await page.waitForTimeout(150);
assert.equal(await zsg.first().getAttribute('data-food-form'), 'card', 'Tab+R switches zhangshugang to card form');
assert.ok(await zsg.locator('.sr-food-card').first().getAttribute('class').then(c => c.includes('sr-tone-gold')), 'zhangshugang renders gold edition');

assert.deepEqual(errors, []);
console.log(JSON.stringify({ passed: ['panel-open', 'click-create', 'tone-style-regression', 'drop-create', 'connect-line', 'persist', 'reload-replay', 'new-gi-card'], errors }));
await browser.close();
