import { chromium } from 'playwright-core';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const id = process.argv[2];
const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport:{ width:1920, height:1080 } });
p.on('pageerror', e => console.log('exc:', e.message));
await p.goto(`file://${path.resolve('scene.html')}?char=${encodeURIComponent('../assets/Vita.vrm')}&look=${id}`);
await p.waitForFunction('window.READY === true', null, { timeout: 120000 });
const info = await p.evaluate(() => {
  const out = { look: window.STATUS.look, mats: {} };
  window.__vrm.scene.traverse(o => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    for (const m of [].concat(o.material)) {
      if (!m || !m.color) continue;
      const n = m.name || '?';
      if (/HAIR_01|Tops_01|Shoes_01|EyeIris/.test(n) && !out.mats[n])
        out.mats[n] = '#' + m.color.getHexString() + (m.map ? ' (textured)' : ' (flat)');
    }
  });
  return out;
});
console.log(JSON.stringify(info, null, 1));
await p.evaluate(() => window.setFrame({ cam:[0.26,0.80,1.95], look:[0,0.58,0], clip:'idle', set:'none', push:0 }, 0.3));
await p.screenshot({ path: `/private/tmp/claude-501/-Users-natalia-YouTube/675bd06e-eac6-469d-ab6f-aae401933995/scratchpad/chk-${id}.png` });
await b.close();
