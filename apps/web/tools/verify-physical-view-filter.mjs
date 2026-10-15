// 🔴 改动 2026-10-12 · 侧栏「实物」列表顶部形态筛选验收：默认资产图标形态、可切卡片形态、两种形态均可点击建卡。
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = '../../output/physical-view-filter';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:3000/atlas');
await page.waitForSelector('.sr-board');

// 1) 打开实物浮窗：默认资产图标形态（切换器「图标」aria-pressed=true，列表渲染 3 个符文图标）
await page.getByRole('button', { name: '实物', exact: true }).click();
const panel = page.locator('aside[aria-label="实物面板"]');
await panel.waitFor();
await page.waitForTimeout(400);
const group = panel.getByRole('group', { name: '展示形态' });
await group.waitFor();
const iconBtn = group.getByRole('button', { name: '图标' });
const cardBtn = group.getByRole('button', { name: '卡片' });
assert.equal(await iconBtn.getAttribute('aria-pressed'), 'true', 'default view = icon');
assert.equal(await cardBtn.getAttribute('aria-pressed'), 'false', 'card unpressed by default');
assert.equal(await panel.locator('.asset-icon.asset-rune').count(), 3, 'icon view renders 3 rune asset icons');
assert.equal(await panel.locator('.sr-food-card').count(), 0, 'icon view shows no cards');
await page.screenshot({ path: `${out}/physical-icon-view.png` });

// 2) 图标形态点击建卡（回归：点击 → 画板中心建 food 卡，浮窗关闭）
await panel.locator('button[draggable="true"]', { hasText: '西湖龙井' }).click();
await page.waitForSelector('.sr-board-card.sr-card-food');
assert.ok(await page.locator('.sr-card-food').first().textContent().then(t => t.includes('西湖龙井')), 'icon click creates 西湖龙井 card');

// 3) 切到卡片形态：渲染 200×280 预览卡列表
await page.getByRole('button', { name: '实物', exact: true }).click();
await panel.waitFor();
await cardBtn.click();
assert.equal(await cardBtn.getAttribute('aria-pressed'), 'true', 'card view pressed');
assert.equal(await panel.locator('.sr-food-card').count(), 3, 'card view renders 3 preview cards');
const box = await panel.locator('.sr-food-card').first().boundingBox();
assert.ok(Math.abs(box.width - 200) < 2 && Math.abs(box.height - 280) < 2, 'preview card is 200x280');
await page.screenshot({ path: `${out}/physical-card-view.png` });

// 4) 卡片形态点击建卡（原行为不回归）
await panel.locator('button[draggable="true"]').first().click();
await page.waitForTimeout(300);
assert.equal(await page.locator('.sr-card-food').count(), 2, 'card click creates food card');

assert.deepEqual(errors, [], 'no page errors');
console.log('OK · 形态筛选默认图标、可切卡片、双形态建卡均通过');
await browser.close();
