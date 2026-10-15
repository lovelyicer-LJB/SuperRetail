import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3000/workshop/nft-card-05');await page.locator('.card-model-canvas[data-ready=true]').waitFor();
const model=JSON.parse(await page.locator('.card-model-canvas').getAttribute('data-geometry'));assert.equal(model.thickness,2);assert.deepEqual(model.backParts,['material-surface','outer-laser-frame']);
for(const [label,file] of [['正面','front'],['反面','back'],['侧面 · 2px','side'],['立体视角','perspective']]){await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(250);await page.screenshot({path:`../../output/nft-card-05/model-${file}.png`});}
await page.getByRole('button',{name:'AE 原版参考',exact:true}).click();await page.locator('video').waitFor();await page.getByRole('button',{name:'第 2 步 · 3D 模型',exact:true}).click();await page.locator('.card-model-canvas[data-ready=true]').waitFor();
assert.equal(await page.locator('.card-model-canvas canvas').count(),1);assert.deepEqual(errors,[]);console.log(JSON.stringify({model,errors}));await browser.close();
