// 🔴 改动 2026-10-10 · 量取平面版食品卡各元素的精确排版位置，供三维版对齐。
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('http://localhost:3000/workshop/food-cards');
await page.getByRole('button', { name: '平面版 · 信息密度' }).click();
await page.waitForSelector('.food-card');
const layout = await page.locator('.food-card').first().evaluate(card => {
  const cb = card.getBoundingClientRect();
  const rel = el => {
    const b = el.getBoundingClientRect();
    return { x: +(b.left - cb.left).toFixed(2), y: +(b.top - cb.top).toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) };
  };
  const q = sel => rel(card.querySelector(sel));
  return {
    card: { w: cb.width, h: cb.height },
    top: q('.food-card-top'),
    edition: q('.food-card-edition'),
    status: q('.food-card-status'),
    art: q('.food-card-art'),
    badges: q('.food-card-badges'),
    badgeImg: rel(card.querySelector('.food-card-badges img')),
    // 🔴 改动 2026-10-10 · 稀有度角标已移除，不再量取。
    info: q('.food-card-info'),
    vintage: q('.food-card-vintage'),
    name: q('.food-card-name'),
    origin: q('.food-card-origin'),
    qty: q('.food-card-qty'),
    qtyBar: q('.food-card-qty-bar'),
    price: q('.food-card-price'),
    asset: q('.food-card-asset'),
    foot: q('.food-card-foot'),
  };
});
console.log(JSON.stringify(layout, null, 1));
await browser.close();
