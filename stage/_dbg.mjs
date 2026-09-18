import { chromium } from 'playwright-core';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport:{ width:800, height:600 } });
p.on('pageerror', e => console.log('exc:', e.message));
await p.goto(`file://${path.resolve('scene.html')}?char=${encodeURIComponent('../assets/Vita.vrm')}&look=delphi`);
await p.waitForFunction('window.READY === true', null, { timeout: 120000 });
const out = await p.evaluate(() => {
  const T = window.__THREE, v = window.__vrm;
  window.setFrame({ cam:[0.30,0.78,1.62], look:[0,0.56,0], clip:'idle', set:'none', push:0 }, 0.3);
  const bb = (o) => { const x = new T.Box3().setFromObject(o); return {
    min: [x.min.x, x.min.y, x.min.z].map(n=>+n.toFixed(3)),
    max: [x.max.x, x.max.y, x.max.z].map(n=>+n.toFixed(3)) }; };
  const res = { wear: [], body: null, sceneQuat: null, spine: null };
  const sq = new T.Quaternion(); v.scene.getWorldQuaternion(sq);
  res.sceneQuat = [sq.x, sq.y, sq.z, sq.w].map(n=>+n.toFixed(3));
  const sp = v.humanoid.getRawBoneNode('spine');
  const spw = new T.Vector3(); sp.getWorldPosition(spw);
  res.spine = [spw.x, spw.y, spw.z].map(n=>+n.toFixed(3));
  v.scene.traverse(o => {
    if (o.isMesh && o.userData.__wear) res.wear.push({ name: o.name || o.geometry.type, ...bb(o) });
    if (o.isSkinnedMesh && /Tops/.test((o.material?.name)||'')) res.body = bb(o);
  });
  return res;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
