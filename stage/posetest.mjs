/**
 * Pose the humanoid rig directly, to show which joints the retarget can actually drive.
 * No Mixamo download involved — this sets VRM humanoid bones by hand and renders.
 *
 *   node posetest.mjs [--char=../assets/Vivi.vrm]
 */
import { chromium } from 'playwright-core';
import path from 'node:path';

const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--'))
  .map(a => a.replace(/^--/, '').split('=').concat(['1']).slice(0, 2)));
const CHAR = flags.char || '../assets/Vivi.vrm';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-gpu-rasterization',
         '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.log('  page exception:', e.message));
await page.goto('file://' + path.resolve('scene.html') + '?char=' + encodeURIComponent(CHAR));
await page.waitForFunction('window.READY === true', null, { timeout: 120000 });

await page.addScriptTag({ type: 'module', content: `
import * as THREE from 'three';

// Playwright drives an installed Chrome rather than bundling one. Override with
// CHROME_PATH on Linux or a non-standard install.
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Degrees, XYZ, applied to the VRM humanoid's normalised bones. vrm.update(0) inside
// setFrame() copies them onto the real skeleton.
window.__pose = (p) => {
  const vrm = window.__vrm;
  for (const b of Object.keys(vrm.humanoid.humanBones)) {
    const n = vrm.humanoid.getNormalizedBoneNode(b);
    if (n) n.rotation.set(0, 0, 0);
  }
  const hips = vrm.humanoid.getNormalizedBoneNode('hips');
  hips.position.y = p.hipsY ?? hips.position.y;
  for (const [bone, deg] of Object.entries(p.bones || {})) {
    const n = vrm.humanoid.getNormalizedBoneNode(bone);
    if (n) n.rotation.set(deg[0]*Math.PI/180, deg[1]*Math.PI/180, deg[2]*Math.PI/180);
  }
};
` });

// Arms down with bent elbows, a hand-to-chin think, and a full seated pose.
// Signs: the left arm hangs on +Z rotation and the right on -Z; thighs swing forward on
// +X. Both read backwards from the maths and were found by rendering.
const POSES = {
  'gesture': { shot: 'medium', bones: {
      leftUpperArm:[0,0,62], leftLowerArm:[0,-72,0], leftHand:[0,-14,0],
      rightUpperArm:[0,0,-62], rightLowerArm:[0,72,0], rightHand:[0,14,0],
      spine:[0,6,0], neck:[-4,-6,0], head:[2,-8,3] } },
  'thinking': { shot: 'closeup', bones: {
      leftUpperArm:[0,0,68], leftLowerArm:[0,-40,0],
      rightUpperArm:[-18,0,-72], rightLowerArm:[0,125,0], rightHand:[0,22,-10],
      spine:[2,-8,0], neck:[8,10,0], head:[6,8,-4] } },
  'sitting': { shot: 'sofa', hipsY: 0.55, bones: {
      leftUpperLeg:[88,0,4], leftLowerLeg:[-82,0,0], leftFoot:[-8,0,0],
      rightUpperLeg:[88,0,-4], rightLowerLeg:[-82,0,0], rightFoot:[-8,0,0],
      leftUpperArm:[0,0,60], leftLowerArm:[0,-62,0],
      rightUpperArm:[0,0,-60], rightLowerArm:[0,62,0],
      spine:[6,0,0], neck:[-6,0,0], head:[-2,4,0] } },
};

for (const [name, p] of Object.entries(POSES)) {
  await page.evaluate((pp) => window.__pose(pp), p);
  await page.evaluate((s) => window.setFrame(s, 0.35), p.shot);
  await page.screenshot({ path: `pose-${name}.png` });
  console.log('pose-' + name + '.png');
}
await browser.close();
