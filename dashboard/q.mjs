import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve from this file, not from an absolute home path, so a clone can run it.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport:{width:1250,height:1000} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://' + path.join(HERE, 'index.html'));
await p.evaluate(()=>{try{localStorage.clear();}catch(e){}}); await p.reload(); await p.waitForTimeout(900);

await p.click('.tab[data-v="ren"]'); await p.waitForTimeout(1200);
console.log('publish btn on render:', await p.$$eval('[data-pubr]', n=>n.length));
await p.click('[data-dlopen="0"]'); await p.waitForTimeout(200);
console.log('popover open:', !(await p.$eval('#dlMenu0', e=>e.hidden)));
await p.click('#v-ren h2'); await p.waitForTimeout(250);
console.log('closes on outside click:', await p.$eval('#dlMenu0', e=>e.hidden));
await p.click('[data-pubr="0"]'); await p.waitForTimeout(400);
const pills = await p.$$eval('#v-ren .pill', n=>n.map(x=>x.textContent.trim()));
console.log('pills after publish:', pills);
await p.click('.tab[data-v="eps"]'); await p.waitForTimeout(300);
console.log('episode badge:', await p.$eval('.epcard .pill', e=>e.textContent.trim()));

await p.click('.tab[data-v="bgs"]'); await p.waitForTimeout(350);
console.log('sort label:', await p.$eval('.bar .rule', e=>e.textContent.trim()));
const firstDesc = await p.$eval('.bg .nm', e=>e.textContent.trim().split(/\d/)[0]);
await p.click('#bgDir'); await p.waitForTimeout(300);
const firstAsc = await p.$eval('.bg .nm', e=>e.textContent.trim().split(/\d/)[0]);
console.log('direction toggles:', firstDesc, '->', firstAsc, '| icon:', await p.$eval('#bgDir', e=>e.textContent.trim()));
console.log('errors:', errs.length?errs.slice(0,2):'none');
await b.close();
