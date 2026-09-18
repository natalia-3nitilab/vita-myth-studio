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
  const T = window.__THREE, v = window.__vrm;
  const names = ['head','neck','upperChest','chest','spine','hips',
    'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
    'leftUpperLeg','leftLowerLeg','leftFoot'];
  const box = new T.Box3().setFromObject(v.scene);
  const rows = names.map(n => {
    const b = v.humanoid.getRawBoneNode(n);
    if (!b) return { bone: n, missing: true };
    const wp = new T.Vector3(), ws = new T.Vector3();
    b.getWorldPosition(wp); b.getWorldScale(ws);
    return { bone: n, y: +wp.y.toFixed(3), x: +wp.x.toFixed(3), z: +wp.z.toFixed(3),
             worldScale: +ws.x.toFixed(3), localLen: +b.position.length().toFixed(3) };
  });
  return { height: +box.max.y.toFixed(3), width: +(box.max.x-box.min.x).toFixed(3), rows };
});
console.log('height', out.height, 'width', out.width);
console.table(out.rows);
await b.close();
