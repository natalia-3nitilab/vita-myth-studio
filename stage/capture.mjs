/**
 * Render the Mixamo stage to PNG frames, headlessly and deterministically.
 *
 * Same contract as ../capture.mjs — the page exposes setFrame(shot, t) and this drives it
 * one frame at a time — with the loader status printed first, because a missing clip or a
 * failed retarget otherwise shows up as a character standing perfectly still for 3000
 * frames and nothing else.
 *
 *   node capture.mjs <shot> <seconds> <fps> <outdir> [--char=../assets/x.vrm] [--toon=house]
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--'))
  .map(a => a.replace(/^--/, '').split('=').concat(['1']).slice(0, 2)));
const [shot = 'medium', secs = '3', fps = '24', out = 'frames'] = argv.filter(a => !a.startsWith('--'));

// Playwright drives an installed Chrome rather than bundling one. Override with
// CHROME_PATH on Linux or a non-standard install.
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [
    // Headless Chrome falls back to software GL and renders a black canvas without these.
    '--use-angle=metal', '--use-gl=angle',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist',
    '--allow-file-access-from-files',
  ],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => { if (m.type() === 'error') console.log('  page error:', m.text()); });
page.on('pageerror', e => console.log('  page exception:', e.message));

const qs = new URLSearchParams(flags).toString();
await page.goto('file://' + path.resolve('scene.html') + (qs ? '?' + qs : ''));
await page.waitForFunction('window.READY === true', null, { timeout: 120000 });

const st = await page.evaluate(() => window.STATUS);
console.log(`character: ${st.char}  ${st.vrm ?? ''}  head ${st.headHeight ?? '?'}m  seat ${st.seatHeight ?? '?'}m`);
console.log(`clips:     ${st.clips.length ? st.clips.join(' ') : '(none — assets/anim is empty)'}`);
if (st.errors.length) console.log('errors:\n  ' + st.errors.join('\n  '));

const total = Math.round(Number(secs) * Number(fps));
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate(([s, t]) => window.setFrame(s, t), [shot, i / (total - 1 || 1)]);
  await page.screenshot({ path: path.join(out, `f-${String(i).padStart(5, '0')}.png`) });
}
const el = (Date.now() - t0) / 1000;
console.log(`${total} frames at 1920x1080 in ${el.toFixed(1)}s — ${(total / el).toFixed(1)} fps`);
await browser.close();
