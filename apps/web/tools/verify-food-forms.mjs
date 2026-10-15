// 🔴 改动 2026-10-12 · 实物四形态验收：节点圆角描边（只描圆角）、拖入/点击默认节点形态、Tab+Q/W/E/R 切换。
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = '../../output/food-forms';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));

// ---------- 1) 资产体系页：节点描边只保留圆角括号（无整圈 track / 中线 trace），且拐角为圆弧 ----------
await page.goto('http://localhost:3000/workshop/asset-system');
await page.waitForSelector('.talent-frame');
assert.equal(await page.locator('.talent-frame-track').count(), 0, 'no chamfer track path');
assert.equal(await page.locator('.talent-frame-trace').count(), 0, 'no trace path');
const brackets = page.locator('.talent-frame-brackets').first();
assert.ok(await brackets.count() > 0, 'corner brackets kept');
const d = await brackets.getAttribute('d');
assert.ok(d.includes('A15 15'), 'corners are arcs (rounded)');
// 🔴 2026-10-12 · 四角等长：直腿统一 12px（左上角应为 M3 30V18 … H30，不再 H44）
assert.ok(d.startsWith('M3 30V18A15 15 0 0 1 18 3H30'), 'corner legs equal length (12px both sides)');
await page.screenshot({ path: `${out}/asset-node-rounded.png` });

// ---------- 2) 版图：实物列表拖入 → 默认节点形态 ----------
await page.goto('http://localhost:3000/atlas');
await page.waitForSelector('.sr-board');
await page.evaluate(() => {
  const root = document.querySelector('.sr-board');
  const dt = new DataTransfer();
  dt.setData('text/plain', 'food:anjihai-chili');
  const rect = root.getBoundingClientRect();
  const ev = new DragEvent('drop', { bubbles: true, cancelable: true, clientX: rect.left + rect.width * 0.55, clientY: rect.top + rect.height * 0.45 });
  Object.defineProperty(ev, 'dataTransfer', { value: dt });
  root.dispatchEvent(ev);
});
await page.waitForSelector('.sr-card-food');
let card = page.locator('.sr-card-food').first();
assert.equal(await card.getAttribute('data-food-form'), 'node', 'drop creates node form');
assert.ok(await card.locator('.asset-node').count() === 1, 'node form markup present');
assert.ok(await card.locator('.talent-frame-brackets').count() === 1, 'board node uses rounded frame');
let box = await card.boundingBox();
assert.ok(Math.abs(box.width - 238) < 2 && Math.abs(box.height - 172) < 2, `node size 238x172, got ${box.width}x${box.height}`);
await page.screenshot({ path: `${out}/board-node-default.png` });

// ---------- 3) Tab+Q/W/E/R 依次切换形态（中心点保持） ----------
const center = async () => { const b = await page.locator('.sr-card-food').first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } };
const c0 = await center();
const expectForm = async (form, sel, w, h, shot) => {
  await page.locator('.sr-card-food').first().waitFor();
  const card = page.locator('.sr-card-food').first();
  assert.equal(await card.getAttribute('data-food-form'), form, `form = ${form}`);
  assert.ok(await card.locator(sel).count() >= 1, `${form} markup (${sel})`);
  const b = await card.boundingBox();
  assert.ok(Math.abs(b.width - w) < 2 && Math.abs(b.height - h) < 2, `${form} size ${w}x${h}, got ${b.width}x${b.height}`);
  const c = await center();
  assert.ok(Math.abs(c.x - c0.x) < 3 && Math.abs(c.y - c0.y) < 3, 'center preserved');
  await page.screenshot({ path: `${out}/${shot}` });
};
// 点击卡片确保选中（drag 落点建卡后已选中，此处兜底）
await card.click();
await page.waitForTimeout(150);
await page.keyboard.down('Tab');
await page.keyboard.press('q'); // → 图标形态
await page.waitForTimeout(120);
await expectForm('icon', '.asset-icon-board', 96, 96, 'form-icon.png');
await page.keyboard.press('e'); // → 组件形态
await page.waitForTimeout(120);
await expectForm('info', '.asset-info-row', 288, 72, 'form-info.png');
await page.keyboard.press('r'); // → 卡片形态
await page.waitForTimeout(120);
await expectForm('card', '.sr-food-card', 200, 280, 'form-card.png');
await page.keyboard.press('w'); // → 回到节点形态
await page.waitForTimeout(120);
await expectForm('node', '.asset-node', 238, 172, 'form-node.png');
await page.keyboard.up('Tab');

// ---------- 4) 持久化：localStorage 记录形态 ----------
await page.waitForTimeout(1000); // 越过 800ms 防抖
const doc = await page.evaluate(() => JSON.parse(localStorage.getItem('superretail.atlas.board.v1')));
assert.equal(doc.cards[0].meta.form, 'node', 'persisted form = node');
assert.equal(doc.cards[0].w, 238, 'persisted node width');

// ---------- 5) 刷新后形态保留（读盘兼容） ----------
await page.reload();
await page.waitForSelector('.sr-card-food');
assert.equal(await page.locator('.sr-card-food').first().getAttribute('data-food-form'), 'node', 'form survives reload');

// ---------- 6) 存量无 form 字段的卡 → 回退卡片形态（兼容 10-11 落盘数据） ----------
// 引擎在 pagehide 时会把内存文档写回 localStorage，直接改写会被覆盖；改用 addInitScript 在文档加载前播种
await page.addInitScript(() => {
  const doc = JSON.parse(localStorage.getItem('superretail.atlas.board.v1') || '{"title":"t","viewport":{"x":0,"y":0,"zoom":1},"cards":[],"lines":[]}');
  if (!doc.cards.some((c) => c.id === 'c_legacyfood')) {
    doc.cards.push({ id: 'c_legacyfood', type: 'food', x: 700, y: 300, w: 200, h: 280, text: '', meta: { foodId: 'xihu-longjing' } });
    localStorage.setItem('superretail.atlas.board.v1', JSON.stringify(doc));
  }
});
await page.reload();
await page.waitForSelector('.sr-card-food[data-food-form="card"]');
const legacy = page.locator('.sr-card-food[data-food-form="card"]');
assert.ok(await legacy.count() === 1, 'legacy card without form falls back to card form');
assert.ok(await legacy.first().locator('.sr-food-card').count() === 1, 'legacy renders 200x280 card');

assert.deepEqual(errors, [], 'no page errors');
console.log('OK · 圆角节点 / 默认节点形态 / Tab+QWER 切换 / 持久化与兼容均通过');
await browser.close();
