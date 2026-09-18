/**
 * Prove the Mixamo -> VRM retarget without a Mixamo download.
 *
 * Builds a skeleton with Mixamo's exact bone names and rest pose (T-pose, centimetres,
 * hips at y=100), animates one arm down, and pushes it through mixamoToVRMClip. If the
 * bone map, the track renaming, the quaternion rebasing and the hip scaling are right the
 * VRM's arm comes down too — which is visible in the frame it writes.
 *
 *   node selftest.mjs
 */
import { chromium } from 'playwright-core';
import path from 'node:path';

// Playwright drives an installed Chrome rather than bundling one. Override with
// CHROME_PATH on Linux or a non-standard install.
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-gpu-rasterization',
         '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.log('  page exception:', e.message));
await page.goto('file://' + path.resolve('scene.html'));
await page.waitForFunction('window.READY === true', null, { timeout: 120000 });

await page.addScriptTag({ type: 'module', content: `
import * as THREE from 'three';
import { mixamoToVRMClip, RIG_MAP } from './retarget.mjs';

// --- a synthetic Mixamo export -------------------------------------------------
// Mixamo rigs are centimetres, Y-up, T-pose, hips ~100 units off the floor.
function bone(name, pos) { const b = new THREE.Bone(); b.name = name; b.position.set(...pos); return b; }
const chain = [
  ['mixamorigHips',[0,100,0]], ['mixamorigSpine',[0,10,0]], ['mixamorigSpine1',[0,12,0]],
  ['mixamorigSpine2',[0,12,0]], ['mixamorigNeck',[0,15,0]], ['mixamorigHead',[0,10,0]],
];
const asset = new THREE.Group();
let parent = asset;
const nodes = {};
for (const [n, p] of chain) { const b = bone(n, p); parent.add(b); nodes[n] = b; parent = b; }
// Arms hang off Spine2, pointing along X — the T-pose.
for (const [side, sx] of [['Left',1],['Right',-1]]) {
  let p = nodes.mixamorigSpine2;
  for (const [n, off] of [['Shoulder',[5*sx,10,0]],['Arm',[12*sx,0,0]],
                          ['ForeArm',[26*sx,0,0]],['Hand',[24*sx,0,0]]]) {
    const b = bone('mixamorig'+side+n, off); p.add(b); nodes['mixamorig'+side+n] = b; p = b;
  }
}
asset.updateMatrixWorld(true);

// One second of the left arm swinging down 80 degrees, plus a hips bob.
const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), -80*Math.PI/180);
asset.animations = [new THREE.AnimationClip('mixamo.com', 1, [
  new THREE.QuaternionKeyframeTrack('mixamorigLeftArm.quaternion', [0,1],
    [0,0,0,1, down.x,down.y,down.z,down.w]),
  new THREE.QuaternionKeyframeTrack('mixamorigRightArm.quaternion', [0,1],
    [0,0,0,1, -down.x,-down.y,down.z,down.w]),
  new THREE.VectorKeyframeTrack('mixamorigHips.position', [0,1], [0,100,0, 0,104,0]),
])];

// --- run it ---------------------------------------------------------------------
const out = { ok: false, notes: [] };
try {
  const vrm = window.__vrm;
  const clip = mixamoToVRMClip(asset, vrm, 'selftest');
  out.trackCount = clip.tracks.length;
  out.trackNames = clip.tracks.map(t => t.name);
  out.mappedBones = Object.keys(RIG_MAP).length;

  const hips = clip.tracks.find(t => t.name.endsWith('.position'));
  out.hipsScaled = hips ? [hips.values[1], hips.values[4]] : null;
  out.hipsInMetres = !!hips && hips.values[1] > 0.3 && hips.values[1] < 2.0;
  out.hasArmTrack = clip.tracks.some(t => t.name.endsWith('.quaternion'));

  // Sample at 0.9, not 1.0: a LoopRepeat action wraps exactly on the boundary, so t=1 of a
  // one-second clip is frame 0 again — the rest pose, which looks like a dead retarget.
  const hand = () => vrm.humanoid.getNormalizedBoneNode('leftHand').getWorldPosition(new THREE.Vector3()).y;
  const before = hand();
  window.__playTest(clip);
  window.setFrame('wide', 0.9);
  const after = hand();
  out.upperArmQuat = vrm.humanoid.getNormalizedBoneNode('leftUpperArm').quaternion.toArray().map(v => +v.toFixed(3));
  out.rawArmQuat = vrm.humanoid.getRawBoneNode('leftUpperArm').quaternion.toArray().map(v => +v.toFixed(3));
  out.handY = { before: +before.toFixed(3), after: +after.toFixed(3), dropped: +(before - after).toFixed(3) };
  out.ok = out.hipsInMetres && out.hasArmTrack && (before - after) > 0.1;
} catch (e) { out.notes.push(e.message); }
window.__selftest = out;
` });

await page.waitForFunction('window.__selftest !== undefined', null, { timeout: 30000 });
const r = await page.evaluate(() => window.__selftest);
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'selftest.png' });
await browser.close();
process.exit(r.ok ? 0 : 1);
