/** Render Cleo on a transparent background, for compositing into thumbnails. */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [clip = 'thinking', out = 'cleo.png'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files']});
const p = await b.newPage({ viewport:{width:1080,height:1080} });
p.on('pageerror', e => console.log('exc:', e.message));
await p.goto('file://'+path.resolve('scene.html')+'?char='+encodeURIComponent('../assets/Vita.vrm')+'&alpha=1&w=1080&h=1080');
await p.waitForFunction('window.READY === true', null, { timeout: 240000 });
await p.evaluate((c) => window.setFrame(
  { cam:[0.26,0.88,1.05], look:[0,0.66,0], push:0, set:'none', mood:'light', clip:c, track:'head' },
  0.42, { mouth:0.2, tAbs:1.0 }), clip);
// Read the canvas itself. A screenshot composites over the page's own background, so the
// alpha channel is lost before it reaches the file; toDataURL keeps it.
const dataUrl = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote', out);
await b.close();
