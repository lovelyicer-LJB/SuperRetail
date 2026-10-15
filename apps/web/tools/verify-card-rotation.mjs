import { chromium } from '@playwright/test';
import { Quaternion, Vector3 } from 'three';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3000/workshop/nft-card-05?rotation=edge-follow-v1');
const host=page.locator('.card-model-canvas[data-ready=true]');await host.waitFor();
const q=async()=>new Quaternion().fromArray(JSON.parse(await host.getAttribute('data-rotation')));
async function drag(dx,dy){const b=await host.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:3});await page.mouse.up();}
for(const view of ['正面','反面','立体视角']) for(const [dx,dy] of [[80,0],[-80,0],[0,80],[0,-80]]) {
 await page.getByRole('button',{name:view,exact:true}).click();
 const before=await q();
 // Choose opposing points in screen space, then follow those same points during drag.
 const a=new Vector3(dx ? -100 : 0,dy ? 100 : 0,0).applyQuaternion(before.clone().invert());
 const b=a.clone().negate();
 await drag(dx,dy);const after=await q();a.applyQuaternion(after);b.applyQuaternion(after);
 // Camera is on +Z: larger Z is closer to the viewer.
 assert.ok((a.z-b.z)*(dx||dy)>0,`${view}: left/top must approach for right/down drag`);
 await page.waitForTimeout(100);assert.ok(after.angleTo(await q())<1e-6,'no release drift');
}
assert.deepEqual(errors,[]);console.log('PASS: right drag brings left edge toward viewer; down drag brings top edge toward viewer; inverse drags reverse; front/back/perspective; no drift');await browser.close();
