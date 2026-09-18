/**
 * Render the episode: narration -> shot plan -> frames -> MP4.
 *
 * Frames pipe straight into ffmpeg as JPEG. At 1920x1080 and 24fps a ten-minute episode is
 * 13,400 stills; on disk that is roughly twenty gigabytes of PNG for a file under 200MB.
 *
 *   node build/render.mjs [fps] [--draft] [--seconds=N]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { direct, FRAMES } from './plan.mjs';

// Playwright drives an installed Chrome rather than bundling one. Override with
// CHROME_PATH on Linux or a non-standard install.
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const STAGE = path.resolve(ROOT, '../stage/scene.html');
const argv = process.argv.slice(2);
const DRAFT = argv.includes('--draft');
const FPS = Number(argv.find(a => !a.startsWith('--')) || (DRAFT ? 12 : 24));
const W = DRAFT ? 960 : 1920, H = DRAFT ? 540 : 1080;
const LIMIT = Number((argv.find(a => a.startsWith('--seconds=')) || '').split('=')[1] || 0);

const seg = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/segments.json'), 'utf8'));
const envJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/envelope.json'), 'utf8'));
const DUR = seg.duration;
const mouthAt = (t) => envJ.env[Math.min(envJ.n - 1, Math.max(0, Math.round(t * envJ.hz)))] ?? 0;

// Backgrounds follow the story, not a timer. Positions are fractions of the runtime so the
// arc survives the script being edited.
const ARC = [
  [0.00, 'dawn'], [0.07, 'grove'], [0.15, 'dusk'],  [0.21, 'descent'],
  [0.29, 'under'], [0.39, 'throne'], [0.47, 'climb'], [0.56, 'light'],
  [0.61, 'reflect'], [0.71, 'cold'], [0.80, 'night'], [0.91, 'reflect'],
];
const moodAt = (t) => { let m = ARC[0][1]; for (const a of ARC) if (t / DUR >= a[0]) m = a[1]; return m; };

// Which clips exist on disk — the director must not ask for one that was never downloaded.
const ANIM = path.resolve(ROOT, '../assets/anim');
const available = new Set(fs.readdirSync(ANIM).filter(f => f.endsWith('.fbx')).map(f => f.replace('.fbx', '')));

// One shot per sentence group, always breaking on a sentence boundary.
const shots = [];
let group = [], prev = { clip: null, frameName: null, n: 0 };
for (const s of seg.segments) {
  group.push(s);
  const span = group[group.length - 1].end - group[0].start;
  const isLast = s === seg.segments[seg.segments.length - 1];
  const paraEnds = seg.segments[s.i + 1] && seg.segments[s.i + 1].para !== s.para;
  if (span >= 2.8 || paraEnds || isLast) {
    const start = group[0].start;
    const text = group.map(g => g.text).join(' ');
    const mood = moodAt(start);
    const d = direct(text, mood, prev, available);
    shots.push({
      start, end: group[group.length - 1].end,
      ...FRAMES[d.frameName], clip: d.clip, mood, set: 'photo',
      emotion: d.emotion ? { name: d.emotion[0], value: d.emotion[1] } : null,
      frameName: d.frameName, text: text.slice(0, 80),
    });
    prev = { clip: d.clip, frameName: d.frameName, n: prev.n + 1 };
    group = [];
  }
}
shots.forEach((s, i) => { s.end = i + 1 < shots.length ? shots[i + 1].start : DUR; });
{
  const d = shots.map(s => s.end - s.start).sort((a, b) => a - b);
  const clips = {}; shots.forEach(s => clips[s.clip] = (clips[s.clip] || 0) + 1);
  console.log(`${shots.length} shots, median ${d[d.length >> 1].toFixed(1)}s, longest ${d[d.length-1].toFixed(1)}s`);
  console.log(`motions used: ${Object.entries(clips).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+'×'+v).join(' ')}`);
}
fs.writeFileSync(path.join(ROOT, 'shots.json'), JSON.stringify(shots, null, 1));
if (argv.includes('--plan-only')) process.exit(0);

// ---------------------------------------------------------------- render
const total = Math.round((LIMIT || DUR) * FPS);
const outFile = path.join(ROOT, 'out', DRAFT ? 'episode-draft.mp4' : 'episode.mp4');
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-i', path.join(ROOT, 'audio/narration.wav'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', DRAFT ? '26' : '20',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', outFile]);
ff.stderr.on('data', d => process.stderr.write(d));

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=metal', '--use-gl=angle', '--enable-gpu-rasterization',
         '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.log('  page exception:', e.message));
const bdUrl = 'file://' + path.join(ROOT, 'backdrops');   // resolved by the stage page
// LOOK picks a wardrobe set out of stage/looks.mjs. Unset renders the character in her own
// baked outfit, which is what every episode so far has done — the looks existed but the
// renderer never passed one, so they only ever appeared on the contact sheet.
//   LOOK=volva npm run render
const look = (process.env.LOOK || '').trim();
await page.goto(`file://${STAGE}?char=${encodeURIComponent(process.env.CHARACTER || '../assets/Vita.vrm')}&w=${W}&h=${H}`
  + (look ? `&look=${encodeURIComponent(look)}` : '')
  + `&backdrops=${encodeURIComponent(bdUrl)}`);
await page.waitForFunction('window.READY === true', null, { timeout: 240000 });
const st = await page.evaluate(() => window.STATUS);
console.log(`character: ${st.char}  head ${st.headHeight}m   clips ${st.clips.length}`);
console.log(`backdrops: ${(st.backdrops || []).join(' ') || '(none — falling back to gradients)'}`);

const t0 = Date.now();
let si = 0;
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  while (si + 1 < shots.length && t >= shots[si + 1].start) si++;
  const s = shots[si];
  const u = Math.min(1, Math.max(0, (t - s.start) / Math.max(0.001, s.end - s.start)));
  await page.evaluate(([sh, uu, o]) => window.setFrame(sh, uu, o),
    [s, u, { mouth: mouthAt(t), tAbs: t, emotion: s.emotion }]);
  const buf = await page.screenshot({ type: 'jpeg', quality: DRAFT ? 70 : 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % (FPS * 30) === 0) {
    const el = (Date.now() - t0) / 1000, rate = f / Math.max(el, 0.001);
    process.stderr.write(`\r  ${(t/60).toFixed(1)}/${((LIMIT||DUR)/60).toFixed(1)} min  ${rate.toFixed(1)} fps  eta ${((total-f)/Math.max(rate,0.01)/60).toFixed(0)}m   `);
  }
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(`\n${total} frames -> ${outFile} in ${((Date.now()-t0)/60000).toFixed(1)} min`);
