import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/private/tmp/claude-501/-Users-natalia-YouTube/675bd06e-eac6-469d-ab6f-aae401933995/scratchpad/sets';
fs.mkdirSync(OUT, { recursive: true });
const ids = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport:{ width:1920, height:1080 } });
p.on('pageerror', e => console.log('exc:', e.message));
for (const id of ids) {
  await p.goto(`file://${path.resolve('scene.html')}?char=${encodeURIComponent('../assets/Vita.vrm')}&look=${id}`);
  try { await p.waitForFunction('window.READY === true', null, { timeout: 120000 }); }
  catch { console.log(id, 'TIMEOUT'); continue; }
  await p.evaluate(() => window.setFrame({ cam:[0.30,0.78,1.62], look:[0,0.56,0], clip:'idle', set:'none', push:0 }, 0.3));
  await p.screenshot({ path: `${OUT}/${id}.png` });
  console.log('  ', id);
}
await b.close();
