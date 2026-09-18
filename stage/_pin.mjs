import { chromium } from 'playwright-core';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await chromium.launch({ executablePath: CHROME,
  args:['--use-angle=metal','--use-gl=angle','--enable-gpu-rasterization','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport:{ width:1920, height:1080 } });
p.on('pageerror', e => console.log('exc:', e.message));
await p.goto(`file://${path.resolve('scene.html')}?char=${encodeURIComponent('../assets/Vita.vrm')}&look=delphi`);
await p.waitForFunction('window.READY === true', null, { timeout: 120000 });
await p.evaluate(() => {
  const T = window.__THREE, v = window.__vrm;
  window.setFrame({ cam:[0.30,0.78,1.62], look:[0,0.56,0], clip:'idle', set:'none', push:0 }, 0.3);
  const cols = { hips:0xff0000, spine:0x00ff00, head:0x0000ff, leftFoot:0xffff00, chest:0xff00ff };
  for (const [n, c] of Object.entries(cols)) {
    const bone = v.humanoid.getNormalizedBoneNode(n) || v.humanoid.getRawBoneNode(n);
    const s = new T.Mesh(new T.SphereGeometry(0.035, 12, 10),
                         new T.MeshBasicMaterial({ color: c, depthTest: false }));
    s.renderOrder = 999;
    bone.add(s);
  }
  window.__rawRender();
});
await p.screenshot({ path: '/private/tmp/claude-501/-Users-natalia-YouTube/675bd06e-eac6-469d-ab6f-aae401933995/scratchpad/pins-norm.png' });
console.log('ok');
await b.close();
