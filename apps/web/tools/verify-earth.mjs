// 🔴 改动 2026-10-01 · 验证地球渲染、拖拽、居中和两种主题。
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3000/atlas');
await page.locator('[data-ready=true]').waitFor();
await page.waitForTimeout(800);
const globe=page.locator('.atlas-earth');
const b=await globe.boundingBox();
assert.ok(Math.abs(b.x+b.width/2-1440*.75/2)<2,'horizontal center');
assert.ok(Math.abs(b.y+b.height/2-(68+(1000-68)/2))<2,'vertical center');
const before=await page.locator('.atlas-earth-node').first().getAttribute('style');
await page.waitForTimeout(700);
assert.notEqual(await page.locator('.atlas-earth-node').first().getAttribute('style'),before,'auto rotation');
await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
await page.mouse.down(); await page.mouse.move(b.x+b.width/2+160,b.y+b.height/2+35,{steps:15}); await page.mouse.up();
await page.waitForTimeout(500);
assert.notEqual(await page.locator('.atlas-earth-node').first().getAttribute('style'),before,'drag rotation');
await page.screenshot({path:'../../tmp_shots/atlas-earth-dark.png'});
await page.getByRole('button',{name:'切换主题'}).click();
await page.screenshot({path:'../../tmp_shots/atlas-earth-light.png'});
await page.setViewportSize({width:1100,height:760});
await page.waitForTimeout(300);
const small=await globe.boundingBox(); assert.ok(small.x>=0 && small.x+small.width<=825,'fits workspace');
await page.getByTitle('点击放大预览 · 收入组件 / L',{exact:true}).click();
await page.getByRole('button',{name:'关闭预览'}).first().click();
assert.deepEqual(errors,[]);
console.log(JSON.stringify({center:b,smaller:small,errors,passed:['render','center','auto-rotate','drag','theme','resize','preview']}));
await browser.close();



