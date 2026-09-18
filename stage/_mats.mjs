import { chromium } from 'playwright-core';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport:{ width:800, height:600 } });
p.on('pageerror', e => console.log('exc:', e.message));
await p.goto(`file://${path.resolve('scene.html')}?char=${encodeURIComponent('../assets/Vita.vrm')}&look=ember`);
await p.waitForFunction('window.READY === true', null, { timeout: 120000 });
const out = await p.evaluate(() => {
  const rows = [];
  window.__vrm.scene.traverse(o => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const groups = (o.geometry.groups||[]).length;
    rows.push({ mesh: o.name, type: o.type, verts: o.geometry.attributes.position.count,
      groups, mats: mats.map(m => m && m.name) });
  });
  return rows;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
