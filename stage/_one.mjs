import { chromium } from 'playwright-core';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const id = process.argv[2] || 'ember';
const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport:{ width:1920, height:1080 } });
p.on('pageerror', e => console.log('exc:', e.message));
p.on('console', m => { if (m.type()==='error') console.log('cerr:', m.text()); });
const url = `file://${path.resolve('scene.html')}?char=${encodeURIComponent('../assets/Vita.vrm')}&look=${id}`;
await p.goto(url);
try { await p.waitForFunction('window.READY === true', null, { timeout: 120000 }); }
catch { console.log('TIMEOUT'); await b.close(); process.exit(1); }
await p.evaluate(() => window.setFrame({ cam:[0.34,0.80,2.25], look:[0,0.58,0], clip:'idle', set:'none', push:0 }, 0.3));
await p.screenshot({ path: process.argv[3] || `/private/tmp/claude-501/-Users-natalia-YouTube/675bd06e-eac6-469d-ab6f-aae401933995/scratchpad/${id}.png` });
console.log('ok', id);
await b.close();
