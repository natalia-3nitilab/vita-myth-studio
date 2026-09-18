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
  const by = new Map();
  window.__vrm.scene.traverse(o => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m) return;
      const e = by.get(m.name) || { name: m.name, meshes: 0, verts: 0 };
      e.meshes++; e.verts += o.geometry.attributes.position.count;
      by.set(m.name, e);
    });
  });
  return [...by.values()].sort((a,b)=>a.name.localeCompare(b.name));
});
console.log(out.map(r => `${String(r.meshes).padStart(3)} meshes  ${r.name}`).join('\n'));
await b.close();
