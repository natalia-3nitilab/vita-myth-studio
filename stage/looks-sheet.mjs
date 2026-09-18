/** Render every look on its paired body and tile them into one sheet. */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

// Playwright drives an installed Chrome rather than bundling one. Override with
// CHROME_PATH on Linux or a non-standard install.
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const src = fs.readFileSync('looks.mjs', 'utf8');
const looks = [...src.matchAll(/\{ id: '([a-z]+)', body: '([A-Za-z_]+)',\s+name: '([^']+)'/g)]
  .map(m => ({ id: m[1], body: m[2], name: m[3] }));
console.log('looks:', looks.map(l => `${l.id}/${l.body}`).join(' '));

const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport:{ width:1920, height:1080 } });
p.on('pageerror', e => console.log('  exc:', e.message));
fs.mkdirSync('looks', { recursive: true });

for (const l of looks) {
  const url = `${'file://' + path.resolve('scene.html')}?char=${encodeURIComponent('../assets/' + l.body + '.vrm')}&look=${l.id}`;
  await p.goto(url);
  try { await p.waitForFunction('window.READY === true', null, { timeout: 90000 }); }
  catch { console.log(l.id, 'TIMEOUT'); continue; }
  await p.evaluate(() => window.setFrame({ cam:[0.34,0.80,2.25], look:[0,0.58,0], clip:'idle', set:'none', push:0 }, 0.3));
  await p.screenshot({ path: `looks/${l.id}.png` });
  console.log(' ', l.id.padEnd(10), l.body);
}
await b.close();
