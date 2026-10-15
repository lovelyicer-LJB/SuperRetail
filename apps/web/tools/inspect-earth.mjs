import { chromium } from '@playwright/test';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
await page.goto('https://www.huaweicloud.com/',{waitUntil:'domcontentloaded',timeout:60000});
await page.locator('#mountNode').scrollIntoViewIfNeeded();
 await page.waitForTimeout(2500);
await page.locator('#earth-section').screenshot({path:'../../tmp_shots/huawei-reference/reference.png'});
console.log(await page.locator('#earth-section').innerText());
await browser.close();



