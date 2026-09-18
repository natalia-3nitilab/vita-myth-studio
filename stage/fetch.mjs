/**
 * Export every clip in clips.json from Mixamo as FBX into ../assets/anim/.
 *
 * Mixamo's catalogue is public but every export is gated on an Adobe OAuth token, so this
 * needs one pasted from a signed-in browser (see README). The token is read from
 * MIXAMO_TOKEN or ./token.txt and never stored anywhere else.
 *
 * Exports are animation-only (skin:false): the clips are retargeted onto our own character
 * at render time, so a skinned mesh per clip would be 31 copies of a body we do not use.
 *
 *   MIXAMO_TOKEN=... node fetch.mjs [--fps=30] [--only=phone-talk,thinking]
 */
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://www.mixamo.com/api/v1';
const OUT = path.resolve('../assets/anim');
const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--'))
  .map(a => a.replace(/^--/, '').split('=').concat(['1']).slice(0, 2)));

const token = (process.env.MIXAMO_TOKEN
  || (fs.existsSync('token.txt') ? fs.readFileSync('token.txt', 'utf8') : '')).trim();
if (!token) {
  console.error('No token. Sign in at mixamo.com, then see README.md ("Getting a token").');
  process.exit(2);
}

const H = {
  'X-Api-Key': 'mixamo2',
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'Origin': 'https://www.mixamo.com',
  'Referer': 'https://www.mixamo.com/',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Mixamo's export queue is per-user and serial, and it answers 429 well before 31 clips if
// you just loop. Back off and retry rather than dropping the clip — the first run got 5.
async function api(url, init, tries = 6) {
  for (let i = 0; ; i++) {
    const r = await fetch(url.startsWith('http') ? url : API + url, { ...init, headers: H });
    if (r.status === 401) throw new Error('401 — token expired. Reload mixamo.com for a new one.');
    if (r.status === 429 && i < tries) {
      const wait = Math.min(60, 5 * 2 ** i);
      process.stdout.write(`(429, waiting ${wait}s) `);
      await sleep(wait * 1000);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${url}`);
    return r.json();
  }
}

// Every export is expressed relative to a character, even a skinless one. Use the account's
// primary character; any of them produces the same motion curves.
async function primaryCharacter() {
  // Signed in, /characters is the account's own list under {results:[...]}. With the guest
  // token Mixamo hands out on a first visit it is a bare array of the stock library, and
  // the key is `uuid`, not `id`. Both work as an export target.
  const j = await api('/characters?page=1&limit=1&type=Character');
  const c = Array.isArray(j) ? j[0] : j.results?.[0];
  if (!c) throw new Error('no characters returned — is the token still valid?');
  return { id: c.uuid || c.id, name: c.name };
}

async function exportClip(clip, characterId, fps) {
  const dest = path.join(OUT, `${clip.slug}.fbx`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return 'cached';

  // The product detail carries the motion's own default parameters. Inventing them gives a
  // technically valid export with every slider at zero, which is not the clip you browsed.
  const detail = await api(`/products/${clip.id}?similar=0&character_id=${characterId}`);
  const gms = detail.details.gms_hash;
  const body = {
    gms_hash: [{ ...gms, params: (gms.params || []).map(p => p[1]).join(',') }],
    preferences: { format: 'fbx7_2019', skin: 'false', fps: String(fps), reducekf: '0' },
    character_id: characterId,
    type: detail.type === 'MotionPack' ? 'MotionPack' : 'Motion',
    product_name: clip.name,
  };
  await api('/animations/export', { method: 'POST', body: JSON.stringify(body) });

  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const m = await api(`/characters/${characterId}/monitor`);
    if (m.status === 'completed') {
      const bin = Buffer.from(await (await fetch(m.job_result)).arrayBuffer());
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(dest, bin);
      return `${(bin.length / 1024).toFixed(0)} KB`;
    }
    if (m.status === 'failed') throw new Error('Mixamo reported the export failed');
  }
  throw new Error('timed out after 120s');
}

const { clips } = JSON.parse(fs.readFileSync('clips.json', 'utf8'));
const only = flags.only ? new Set(flags.only.split(',')) : null;
const wanted = only ? clips.filter(c => only.has(c.slug)) : clips;
const fps = +(flags.fps || 30);

const char = await primaryCharacter();
console.log(`character: ${char.name} (${char.id})`);
console.log(`exporting ${wanted.length} clips at ${fps}fps -> ${OUT}\n`);

let ok = 0, failed = [];
for (const c of wanted) {
  process.stdout.write(`  ${c.slug.padEnd(15)} ${c.name.padEnd(24)} `);
  try { console.log(await exportClip(c, char.id, fps)); ok++; }
  catch (e) { console.log('FAILED — ' + e.message); failed.push(c.slug); }
  await sleep(2500);   // let the queue drain before asking for the next one
}
console.log(`\n${ok}/${wanted.length} exported.`);
if (failed.length) console.log('retry: node fetch.mjs --only=' + failed.join(','));
