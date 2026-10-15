import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/CardModelPreview.tsx*',async route=>{const r=await route.fetch();let body=await r.text();assert.ok(body.includes('controls.enablePan = false;'));body=body.replace('controls.enablePan = false;','controls.enablePan = false; window.__dragCheck = controls;');await route.fulfill({response:r,body});});
await page.goto('http://127.0.0.1:3000/workshop/nft-card-05');await page.locator('.card-model-canvas[data-ready=true]').waitFor();
const canvas=page.locator('.card-model-canvas canvas');const b=await canvas.boundingBox();
const start=await page.evaluate(()=>[window.__dragCheck.getAzimuthalAngle(),window.__dragCheck.getPolarAngle()]);
await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+65,b.y+b.height/2+40,{steps:8});await page.mouse.up();await page.waitForTimeout(400);
const end=await page.evaluate(()=>[window.__dragCheck.getAzimuthalAngle(),window.__dragCheck.getPolarAngle()]);assert.ok(end[0]>start[0]);assert.ok(end[1]>start[1]);
await page.screenshot({path:'../../output/nft-card-05/drag-direction-fixed.png'});
for(const label of ['正面','反面','侧面 · 2px','立体视角']){await page.getByRole('button',{name:label,exact:true}).click();}
assert.deepEqual(errors,[]);console.log(JSON.stringify({start,end,errors,passed:'horizontal and vertical reversed; presets work'}));await browser.close();

