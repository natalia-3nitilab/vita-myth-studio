/**
 * Twenty looks for the presenter, as data: ten colour studies and ten mythic sets.
 *
 * A VRoid body is one mesh with named materials — hair, tops, shoes, iris — so a "look" is
 * a palette applied to those plus a tattoo. Nothing is re-modelled and nothing is generated
 * by an image model, which means a look is reproducible frame to frame and free.
 *
 * The tattoos are drawn procedurally onto a canvas rather than shipped as PNGs, so a motif
 * can be recoloured and rescaled per look without a second asset.
 */
import * as THREE from 'three';

// ---------------------------------------------------------------- tattoo motifs
// Each draws white-on-transparent into a 512x512 canvas. u wraps the arm, v runs along it.
// They are tinted and made to glow by the material, not by the drawing.
const M = {
  runes(c, g) {
    g.lineWidth = 9; g.lineCap = 'round';
    for (let row = 0; row < 6; row++) {
      const y = 60 + row * 78;
      for (let i = 0; i < 5; i++) {
        const x = 50 + i * 100, s = 26;
        g.beginPath();
        const k = (row * 5 + i) % 5;
        if (k === 0) { g.moveTo(x, y - s); g.lineTo(x, y + s); g.moveTo(x - s * .7, y - s * .4); g.lineTo(x + s * .7, y + s * .2); }
        if (k === 1) { g.moveTo(x - s * .6, y - s); g.lineTo(x, y); g.lineTo(x - s * .6, y + s); g.moveTo(x, y); g.lineTo(x + s * .6, y); }
        if (k === 2) { g.moveTo(x - s * .6, y - s); g.lineTo(x + s * .6, y - s); g.lineTo(x - s * .6, y + s); g.lineTo(x + s * .6, y + s); }
        if (k === 3) { g.moveTo(x, y - s); g.lineTo(x - s * .7, y + s); g.moveTo(x, y - s); g.lineTo(x + s * .7, y + s); g.moveTo(x - s * .35, y); g.lineTo(x + s * .35, y); }
        if (k === 4) { g.arc(x, y, s * .7, 0, Math.PI * 2); g.moveTo(x, y - s); g.lineTo(x, y + s); }
        g.stroke();
      }
    }
  },
  crescent(c, g) {
    for (let row = 0; row < 4; row++) {
      const cy = 80 + row * 120, cx = 256;
      g.beginPath(); g.arc(cx, cy, 52, Math.PI * 0.32, Math.PI * 1.68); g.lineWidth = 16; g.stroke();
      for (const [dx, dy, r] of [[-110, -28, 7], [118, 20, 9], [-84, 52, 5], [92, -50, 6]]) {
        g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); g.fill();
      }
    }
  },
  serpent(c, g) {
    g.lineWidth = 15; g.lineCap = 'round';
    g.beginPath();
    for (let y = 0; y <= 512; y += 6) g.lineTo(256 + Math.sin(y * 0.026) * 130, y);
    g.stroke();
    g.lineWidth = 6;
    for (let y = 30; y < 512; y += 46) {
      const x = 256 + Math.sin(y * 0.026) * 130;
      g.beginPath(); g.ellipse(x, y, 26, 11, Math.cos(y * 0.026), 0, Math.PI * 2); g.stroke();
    }
  },
  sigil(c, g) {
    for (let row = 0; row < 3; row++) {
      const cy = 100 + row * 160, cx = 256, R = 74;
      g.lineWidth = 8;
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx, cy, R * 0.62, 0, Math.PI * 2); g.stroke();
      for (const rot of [0, Math.PI]) {
        g.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = rot + i * Math.PI * 2 / 3 - Math.PI / 2;
          g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        }
        g.closePath(); g.stroke();
      }
      g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fill();
    }
  },
  vine(c, g) {
    g.lineWidth = 11; g.lineCap = 'round';
    g.beginPath();
    for (let y = 0; y <= 512; y += 6) g.lineTo(256 + Math.sin(y * 0.018) * 96, y);
    g.stroke();
    for (let y = 24; y < 512; y += 38) {
      const x = 256 + Math.sin(y * 0.018) * 96, s = y % 76 === 24 ? 1 : -1;
      g.beginPath(); g.ellipse(x + s * 36, y, 30, 14, s * 0.6, 0, Math.PI * 2); g.fill();
    }
  },
  constellation(c, g) {
    const pts = [[120, 40], [210, 120], [170, 230], [280, 290], [230, 400], [330, 470],
                 [360, 150], [90, 330], [400, 360], [150, 470]];
    g.lineWidth = 5;
    g.beginPath();
    pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
    g.stroke();
    pts.forEach(([x, y], i) => {
      g.beginPath(); g.arc(x, y, i % 3 === 0 ? 14 : 8, 0, Math.PI * 2); g.fill();
    });
  },
  flame(c, g) {
    for (let row = 0; row < 4; row++) {
      const base = 500 - row * 128;
      g.beginPath();
      g.moveTo(256, base);
      g.bezierCurveTo(180, base - 40, 200, base - 90, 256, base - 130);
      g.bezierCurveTo(312, base - 90, 332, base - 40, 256, base);
      g.fill();
      g.beginPath();
      g.moveTo(256, base - 20);
      g.bezierCurveTo(226, base - 44, 234, base - 72, 256, base - 96);
      g.bezierCurveTo(278, base - 72, 286, base - 44, 256, base - 20);
      g.globalCompositeOperation = 'destination-out'; g.fill();
      g.globalCompositeOperation = 'source-over';
    }
  },
  eye(c, g) {
    for (let row = 0; row < 3; row++) {
      const cy = 100 + row * 160, cx = 256;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(cx - 92, cy); g.quadraticCurveTo(cx, cy - 64, cx + 92, cy);
      g.quadraticCurveTo(cx, cy + 64, cx - 92, cy); g.stroke();
      g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 104, cy + Math.sin(a) * 74);
        g.lineTo(cx + Math.cos(a) * 128, cy + Math.sin(a) * 92);
        g.lineWidth = 6; g.stroke();
      }
    }
  },
  phases(c, g) {
    for (let i = 0; i < 6; i++) {
      const cy = 52 + i * 84, cx = 256, R = 34, f = i / 5;
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.lineWidth = 7; g.stroke();
      g.beginPath();
      g.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2);
      g.ellipse(cx, cy, R * Math.abs(1 - 2 * f), R, 0, Math.PI / 2, -Math.PI / 2, f < 0.5);
      g.fill();
    }
  },
  circuit(c, g) {
    g.lineWidth = 7; g.lineCap = 'square';
    let x = 256, y = 0;
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; y < 512; i++) {
      const dx = (i % 2 ? 1 : -1) * (40 + (i * 37) % 70);
      y += 46; x = Math.max(70, Math.min(442, x + dx));
      g.lineTo(x, y - 24); g.lineTo(x, y);
    }
    g.stroke();
    for (let i = 0; i < 9; i++) {
      const px = 90 + (i * 91) % 340, py = 40 + i * 52;
      g.beginPath(); g.rect(px - 11, py - 11, 22, 22); g.lineWidth = 6; g.stroke();
      g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();
    }
  },
};

const cache = new Map();
export function tattooTexture(motif) {
  if (cache.has(motif)) return cache.get(motif);
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineJoin = 'round';
  (M[motif] || M.runes)(c, g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(motif, t);
  return t;
}

// ---------------------------------------------------------------- the ten looks
export const LOOKS = [
  { id: 'ember', body: 'Vita',    name: 'Ember',       hair: '#ff5c2e', tops: '#8c4a5e', shoes: '#1a1018',
    wear: ['cape', 'belt'],      wearColor: '#c8362a', trim: '#ffb24d',
    iris: '#ffb24d', tattoo: { motif: 'flame',        color: '#ff8a3d', glow: 1.5 } },
  { id: 'astral', body: 'Vita',   name: 'Astral',      hair: '#8f6bff', tops: '#4a4b9c', shoes: '#0d0c1f',
    wear: ['hood', 'cape'],      wearColor: '#241f52', trim: '#9ad8ff',
    iris: '#7fe6ff', tattoo: { motif: 'constellation',color: '#9ad8ff', glow: 1.8 } },
  { id: 'jade', body: 'Vita',     name: 'Jade',        hair: '#1fae7a', tops: '#2f8f6b', shoes: '#0c1f1a',
    wear: ['sash', 'armbands'],  wearColor: '#1d6b4f', trim: '#d8c274',
    iris: '#d8c274', tattoo: { motif: 'vine',         color: '#7ef0b0', glow: 1.1 } },
  { id: 'frost', body: 'Vita',    name: 'Frost',       hair: '#dbe9f5', tops: '#7fb4d8', shoes: '#1d3346',
    wear: ['scarf', 'cape'],     wearColor: '#e8f3fb', trim: '#68c6ff',
    iris: '#68c6ff', tattoo: { motif: 'runes',        color: '#a9e4ff', glow: 1.6 } },
  { id: 'neon', body: 'Vita',     name: 'Neon',        hair: '#ff3fb4', tops: '#6b3f8c', shoes: '#0a0714',
    wear: ['armbands', 'choker'],wearColor: '#2ef2ff', trim: '#ff3fb4',
    iris: '#2ef2ff', tattoo: { motif: 'circuit',      color: '#2ef2ff', glow: 2.2 } },
  { id: 'solstice', body: 'Vita', name: 'Solstice',    hair: '#f2c14e', tops: '#c98a3e', shoes: '#4d2a12',
    wear: ['cape', 'sash'],      wearColor: '#e0a33a', trim: '#fff0c2',
    iris: '#b8651f', tattoo: { motif: 'sigil',        color: '#ffd977', glow: 1.3 } },
  { id: 'nocturne', body: 'Vita', name: 'Nocturne',    hair: '#2f3358', tops: '#4a4f80', shoes: '#101122',
    wear: ['hood', 'sash'],      wearColor: '#12142a', trim: '#cfd4ff',
    iris: '#c6c9f0', tattoo: { motif: 'phases',       color: '#cfd4ff', glow: 1.7 } },
  { id: 'venom', body: 'Vita',    name: 'Venom',       hair: '#9cff3d', tops: '#4e7a32', shoes: '#0d100b',
    wear: ['armbands', 'belt'],  wearColor: '#25301c', trim: '#b6ff5c',
    iris: '#6fe03a', tattoo: { motif: 'serpent',      color: '#b6ff5c', glow: 1.9 } },
  { id: 'quartz', body: 'Vita',   name: 'Rose Quartz', hair: '#ff9ec4', tops: '#ffd6e6', shoes: '#c98fa8',
    wear: ['scarf', 'choker'],   wearColor: '#ffd3e2', trim: '#ff7fae',
    iris: '#ff7fae', tattoo: { motif: 'crescent',     color: '#ffc2da', glow: 1.2 } },
  { id: 'oracle', body: 'Vita',   name: 'Oracle',      hair: '#17a2a6', tops: '#a06a3c', shoes: '#241309',
    wear: ['cape', 'choker'],    wearColor: '#14545c', trim: '#e08a3c',
    iris: '#e08a3c', tattoo: { motif: 'eye',          color: '#5ee6e0', glow: 1.6 } },

  // ---------------------------------------------------------------- mythic sets
  // Ten storyteller sets, each built from one named tradition rather than from "fantasy".
  // The rules they all follow, because of what Vita's mesh is:
  //   - `tops` and `shoes` go dark and neutral. They multiply a navy texture carrying cyan
  //     tech lines, so they can only ever be an under-layer; the silhouette is geometry.
  //   - `hair` multiplies a pink base, so it can be tinted and darkened but not lightened.
  //   - no `tattoo` field. They read as decals on a cel-shaded body and were rejected.
  // A garment can override the set palette: give it as an object instead of a string.
  { id: 'delphi', body: 'Vita',   name: 'Delphi',      hair: '#d6c7a6', tops: '#2a2a32', shoes: '#2b2419',
    wear: ['gown', 'overfold', 'wreath', 'beads'],
    wearColor: '#efe7d6', trim: '#c4a24c', accent: '#8d9b6a',
    iris: '#8a9a72', note: 'Greek. Doric chiton with the peplos overfold, laurel, gold.' },

  { id: 'volva', body: 'Vita',    name: 'Volva',       hair: '#b6a58f', tops: '#22242c', shoes: '#2b2119',
    wear: [{ kind: 'apron', wear: '#5d6b7a', accent: '#c8862f' }, 'cloak', 'torc', 'beads'],
    wearColor: '#3f4854', trim: '#2c333d', accent: '#c8862f',
    iris: '#8fa3b8', note: 'Norse. Hangerok apron dress on brooches, wool cloak, torc, amber.' },

  { id: 'druid', body: 'Vita',    name: 'Druid',       hair: '#8a6a52', tops: '#232a26', shoes: '#241f18',
    wear: ['gown', { kind: 'mantle', wear: '#41603f' }, 'torc'],
    wearColor: '#7d8a6a', trim: '#c9963c', accent: '#d8c48a',
    iris: '#6f9a72', note: 'Irish. Leine under a brat cloak pinned at the shoulder, torc.' },

  { id: 'miko', body: 'Vita',     name: 'Miko',        hair: '#4a3a42', tops: '#26262c', shoes: '#2a2020',
    wear: ['gown', { kind: 'overskirt', wear: '#c1362c', trim: '#e8e2d6' },
           { kind: 'obi', wear: '#e8e2d6', trim: '#c1362c' }],
    wearColor: '#f2eee4', trim: '#d9d2c4', accent: '#c1362c',
    iris: '#6b5a4a', note: 'Japanese. White haku-e over vermilion hakama, wide obi.' },

  { id: 'firebird', body: 'Vita', name: 'Firebird',    hair: '#a08a6e', tops: '#2a2228', shoes: '#2b1f1a',
    wear: ['gown', { kind: 'overskirt', wear: '#8f2a30', trim: '#d8b44a' }, 'sash', 'crest', 'beads'],
    wearColor: '#efe6d4', trim: '#d8b44a', accent: '#9c2f36',
    iris: '#8a7250', note: 'Slavic. Linen rubakha, striped poneva, woven sash, kokoshnik.' },

  { id: 'nile', body: 'Vita',     name: 'Nile',        hair: '#2f2a30', tops: '#26262e', shoes: '#2a2620',
    wear: ['gown', { kind: 'collar', wear: '#1f6f8f', trim: '#d9b24a', accent: '#8f2f3a' },
           'circlet', 'bangles'],
    wearColor: '#e9e2cf', trim: '#d9b24a', accent: '#1f6f8f',
    iris: '#6a5a3a', note: 'Egyptian. Pleated kalasiris under a wesekh broad collar.' },

  { id: 'anansi', body: 'Vita',   name: 'Anansi',      hair: '#3a2c28', tops: '#282329', shoes: '#2a201a',
    wear: ['gown', { kind: 'mantle', wear: '#d9a327', trim: '#1c7a4a' }, 'beads', 'bangles'],
    wearColor: '#25242a', trim: '#d9a327', accent: '#1c7a4a',
    iris: '#7a5a32', note: 'Akan. Kente strip-weave worn as a shoulder wrapper, gold.' },

  { id: 'quetzal', body: 'Vita',  name: 'Quetzal',     hair: '#33272c', tops: '#262630', shoes: '#241d1a',
    wear: [{ kind: 'shawl', wear: '#1f9a91', trim: '#d94f36' }, 'overskirt',
           { kind: 'collar', wear: '#1f9a91', trim: '#d94f36', accent: '#e0b83a' }],
    wearColor: '#e7ddc8', trim: '#d94f36', accent: '#1f9a91',
    iris: '#7a5a3a', note: 'Mesoamerican. Diamond quechquemitl over a wrapped skirt.' },

  { id: 'apsara', body: 'Vita',   name: 'Apsara',      hair: '#33262c', tops: '#2a2430', shoes: '#2a1f22',
    wear: ['gown', { kind: 'mantle', wear: '#b0246a', trim: '#e0b23a' }, 'bangles', 'circlet', 'beads'],
    wearColor: '#d9772a', trim: '#e0b23a', accent: '#b0246a',
    iris: '#6b4a30', note: 'South Asian. Draped sari with the dupatta over one shoulder.' },

  { id: 'selkie', body: 'Vita',   name: 'Selkie',      hair: '#6d6a68', tops: '#242730', shoes: '#22252a',
    wear: [{ kind: 'gown', wear: '#8d9498', trim: '#6b747a' }, 'cloak', 'shawl'],
    wearColor: '#3c4348', trim: '#2b3136', accent: '#9fb0ad',
    iris: '#7fa5a8', note: 'Hebridean. Undyed wool under a sealskin mantle, sea greys.' },
];

// ---------------------------------------------------------------- skeleton metrics
/**
 * Garment dimensions come from the character's own skeleton, not from one global scale
 * factor. Vita measures 1.71m to the top of the hair, not the 1.45m the first draft
 * assumed, so a hem written as "0.42 x scale" landed at the knee on one body and the shin
 * on another. Measure hips-to-ankle once and express every garment as a fraction of it and
 * a gown reaches the ankle on any VRM.
 */
function metrics(vrm) {
  const raw = (b) => vrm.humanoid.getRawBoneNode(b);
  const wp = (b) => {
    const n = raw(b);
    if (!n) return null;
    const v = new THREE.Vector3();
    n.updateWorldMatrix(true, false);
    n.getWorldPosition(v);
    return v;
  };
  const head = wp('head'), neck = wp('neck');
  const chest = wp('upperChest') || wp('chest');
  const spine = wp('spine'), hips = wp('hips');
  const foot = wp('leftFoot') || wp('rightFoot');
  const knee = wp('leftLowerLeg');
  const headY = head?.y ?? 1.44;
  const hipsY = hips?.y ?? 0.95;
  const footY = foot?.y ?? hipsY - 0.80;
  const leg = Math.max(0.2, hipsY - footY);
  return {
    headY, neckY: neck?.y ?? headY - 0.08,
    chestY: chest?.y ?? headY - 0.19, spineY: spine?.y ?? hipsY + 0.05,
    hipsY, footY, kneeY: knee?.y ?? (hipsY + footY) / 2, leg,
    // Where the body's midline actually is. Not zero: this VRM's spine sits 1.5cm to one
    // side of the origin, which is enough to hang a gown visibly off-centre.
    cx: spine?.x ?? 0, cz: spine?.z ?? 0,
    hx: head?.x ?? 0, hz: head?.z ?? 0,
    // Hip half-width. A VRoid body is about a sixth of its leg length across the hip, which
    // is a better source for garment radius than anything derived from total height: total
    // height moves with the hair and with whatever the idle clip is doing to the arms.
    girth: leg * 0.17,
  };
}

/**
 * Garment pieces added as geometry, parented to the skeleton so they animate with her.
 *
 * Vita's own clothes are a single mesh under a single material (`Tops_01_CLOTH`) over a
 * single `Shoes_01_CLOTH` — there is no separate bodice, skirt or sleeve to hide, and the
 * baked texture is a dark navy carrying cyan tech lines. Recolouring multiplies that
 * texture, so the palette alone can only darken it: it can never make her read as anything
 * but a science-fiction idol. Every mythic set therefore drops the baked outfit to a dark
 * under-layer and builds the silhouette that actually reads out of these primitives.
 */
export function buildWear(kind, vrm, colors) {
  const raw = (b) => vrm.humanoid.getRawBoneNode(b);
  const mat = (hex, side = THREE.DoubleSide) => new THREE.MeshToonMaterial({
    color: hex, side, gradientMap: colors.ramp,
  });
  const chest = raw('upperChest') || raw('chest') || raw('spine');
  const scale = colors.scale;                   // character build vs an average adult
  const accent = colors.accent || colors.trim;
  const M = metrics(vrm);
  const g = new THREE.Group();

  // Garments are dimensioned in metres but get parented into a BONE's local space, and a
  // VRM's bones are not unit-scaled — on some models the chest bone carries a scale of
  // several times one, which turned a 30cm shoulder cape into a cone that swallowed her
  // head. Undo the parent's world scale so the numbers above mean metres.
  const _ws = new THREE.Vector3();
  const mark = (obj) => {
    // Mark here rather than at the call site. Pieces that attach straight to a bone (the
    // armbands, the bangles) are never children of the returned group, so a caller that
    // walks that group to tag them misses them — and the next look change then fails to
    // clear them and stacks a second pair on top.
    obj.userData.__wear = true;
    obj.traverse(o => { o.userData.__wear = true; if (o.isMesh) o.frustumCulled = false; });
  };
  const fit = (node, obj) => {
    node.getWorldScale(_ws);
    const k = Math.abs(_ws.x) > 1e-6 ? 1 / _ws.x : 1;
    obj.scale.multiplyScalar(k);
    mark(obj);
    node.add(obj);
  };

  /**
   * Hang a world-upright group off a bone at a given world height.
   *
   * The first version of this just wrote `position.y = worldY - boneY`, which assumes a
   * bone's local axes are the world's. They are not: the clip rotates the spine, so a gown
   * placed that way swung out behind her and the laurel sat across her eyes. Converting the
   * anchor through `worldToLocal` and cancelling the bone's world rotation puts the piece
   * where it belongs at build time, and it still follows the bone once the clip moves.
   */
  const _q = new THREE.Quaternion();
  const _wp = new THREE.Vector3();
  const hang = (node, obj, worldY, worldX, worldZ) => {
    node.updateWorldMatrix(true, false);
    // Centre on the bone the piece hangs from, not on the spine. A skirt anchored to the
    // spine's midline and parented to the hips ends up standing behind her the moment the
    // clip swings her legs forward, which is most of the idle.
    node.getWorldPosition(_wp);
    if (worldX === undefined) worldX = _wp.x;
    if (worldZ === undefined) worldZ = _wp.z;
    node.getWorldQuaternion(_q);
    obj.quaternion.premultiply(_q.clone().invert());
    // Derive local-units-per-metre by measuring a one-metre world span through the bone's
    // own matrix, rather than reading getWorldScale. The retargeted rig carries scale on
    // more than one node in the chain, so the shortcut built a gown two thirds of the
    // height it was asked for and a hem that stopped at the knee.
    const p0 = node.worldToLocal(new THREE.Vector3(worldX, worldY, worldZ));
    const p1 = node.worldToLocal(new THREE.Vector3(worldX, worldY + 1, worldZ));
    const unit = p1.distanceTo(p0) || 1;
    obj.scale.multiplyScalar(unit);
    obj.position.copy(p0);
    mark(obj);
    node.add(obj);
  };
  // A torso piece of world height h whose top edge sits at world height `top`.
  const column = (top, h) => top - h / 2;

  if (kind === 'cape') {
    // A shoulder cape: a half-cone open at the front, hung off the chest bone.
    // A SHORT shoulder cape. At 42cm long and 30cm wide it was a cone from the neck to
    // below the hips — it read as a lampshade and hid the outfit underneath, which is the
    // opposite of the point.
    const geo = new THREE.CylinderGeometry(0.085 * scale, 0.155 * scale, 0.155 * scale, 22, 1, true,
                                           Math.PI * 0.30, Math.PI * 1.40);
    const m = new THREE.Mesh(geo, mat(colors.wear));
    m.position.set(0, -0.015 * scale, -0.005 * scale);
    g.add(m);
    const hem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.157 * scale, 0.162 * scale, 0.022 * scale, 22, 1, true,
                                 Math.PI * 0.30, Math.PI * 1.40), mat(colors.trim));
    hem.position.set(0, -0.085 * scale, -0.005 * scale);
    g.add(hem);
    fit(chest, g);
  } else if (kind === 'hood') {
    const head = raw('head');
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.135 * scale, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
                             mat(colors.wear, THREE.BackSide));
    m.position.set(0, 0.03 * scale, -0.02 * scale);
    m.rotation.x = -0.28;
    g.add(m);
    fit(head, g);
  } else if (kind === 'scarf') {
    const neck = raw('neck');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.062 * scale, 0.030 * scale, 10, 22), mat(colors.wear));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01 * scale; g.add(ring);
    for (const sx of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05 * scale, 0.22 * scale, 0.022 * scale), mat(colors.wear));
      tail.position.set(sx * 0.035 * scale, -0.11 * scale, 0.055 * scale);
      tail.rotation.z = sx * 0.12; g.add(tail);
    }
    fit(neck, g);
  } else if (kind === 'choker') {
    const neck = raw('neck');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.050 * scale, 0.011 * scale, 8, 22), mat(colors.wear));
    ring.rotation.x = Math.PI / 2; g.add(ring);
    const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.020 * scale), mat(colors.trim));
    stone.position.set(0, -0.004 * scale, 0.050 * scale); g.add(stone);
    fit(neck, g);
  } else if (kind === 'belt' || kind === 'sash') {
    const hips = raw('hips');
    const r = kind === 'belt' ? 0.019 : 0.031;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.108 * scale, r * scale, 10, 26), mat(colors.wear));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.055 * scale; g.add(ring);
    if (kind === 'belt') {
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.048 * scale, 0.040 * scale, 0.016 * scale), mat(colors.trim));
      buckle.position.set(0, 0.055 * scale, 0.108 * scale); g.add(buckle);
    } else {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.30 * scale, 0.02 * scale), mat(colors.trim));
      tail.position.set(0.075 * scale, -0.10 * scale, 0.085 * scale);
      tail.rotation.z = 0.1; g.add(tail);
    }
    fit(hips, g);
  } else if (kind === 'armbands') {
    for (const side of ['left', 'right']) {
      const arm = raw(side + 'UpperArm');
      if (!arm) continue;
      const child = vrm.humanoid.getRawBoneNode(side + 'LowerArm');
      const dir = child ? child.position.clone().normalize() : new THREE.Vector3(0, -1, 0);
      const len = child ? child.position.length() : 0.2 * scale;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032 * scale, 0.031 * scale, 0.046 * scale, 20, 1, true), mat(colors.wear));
      band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      band.position.copy(dir).multiplyScalar(len * 0.72);
      fit(arm, band);
      g.userData.detached = true;
    }

  // -------------------------------------------------------------- mythic pieces
  } else if (kind === 'gown') {
    // The workhorse. A full-length draped dress: the Greek chiton, the Egyptian kalasiris,
    // the Irish leine and the Slavic rubakha are all this shape with a different palette
    // and a different thing belted over it.
    //
    // Built as two pieces on two bones rather than one cone on the spine. A single cone
    // from chest to ankle is a 1m lever arm on one joint: the idle clip swings the pelvis
    // and the whole skirt steps out from under her. The bodice follows the torso and the
    // skirt follows the pelvis, which is how a real dress behaves anyway.
    const spine = raw('spine') || chest;
    const hips = raw('hips') || spine;
    const waist = M.hipsY + (M.chestY - M.hipsY) * 0.42;
    const top = M.chestY - 0.015, bh = Math.max(0.1, top - waist);
    const bodice = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 0.94, M.girth * 1.16, bh, 28, 1, true), mat(colors.wear));
    hang(spine, bodice, column(top, bh));

    const bot = M.footY + 0.055, sh = Math.max(0.2, waist + 0.02 - bot);
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.14, M.girth * 1.78, sh, 30, 1, true), mat(colors.wear));
    g.add(skirt);
    const hem = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.79, M.girth * 1.84, sh * 0.05, 30, 1, true), mat(colors.trim));
    hem.position.y = -sh / 2 + sh * 0.025;
    g.add(hem);
    hang(hips, g, column(waist + 0.02, sh));
  } else if (kind === 'overfold') {
    // The apoptygma: a Doric peplos is cut longer than the body and the excess folded back
    // over the chest, so the fold is the garment's signature rather than a trim.
    const top = M.chestY + 0.012, h = (M.chestY - M.hipsY) * 1.30;
    const fold = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 0.99, M.girth * 1.42, h, 28, 1, true), mat(colors.trim));
    g.add(fold);
    hang(chest, g, column(top, h));
  } else if (kind === 'cloak') {
    // Full-length and open at the front, so it frames the gown rather than hiding it.
    const top = M.chestY + 0.045, bot = M.kneeY - 0.06, h = Math.max(0.25, top - bot);
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.14, M.girth * 2.00, h, 30, 1, true,
                                 Math.PI * 0.34, Math.PI * 1.32), mat(colors.wear));
    g.add(c);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 2.01, M.girth * 2.06, h * 0.045, 30, 1, true,
                                 Math.PI * 0.34, Math.PI * 1.32), mat(colors.trim));
    band.position.y = -h / 2 + h * 0.022;
    g.add(band);
    hang(chest, g, column(top, h), undefined, undefined);
  } else if (kind === 'mantle') {
    // A himation, an Irish brat, a dupatta: one rectangle of cloth over the left shoulder
    // and round under the right arm. The asymmetry is the whole read, so this one is
    // deliberately tilted rather than hung square.
    const top = M.chestY + 0.05, h = (M.chestY - M.hipsY) * 2.3;
    const drape = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.18, M.girth * 1.62, h, 28, 1, true,
                                 Math.PI * 0.08, Math.PI * 1.02), mat(colors.wear));
    drape.rotation.z = 0.15;
    g.add(drape);
    const pin = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.008, 8, 18), mat(accent));
    pin.position.set(-M.girth * 1.05, h / 2 - 0.035, 0.045);
    g.add(pin);
    hang(chest, g, column(top, h), M.cx, M.cz);
  } else if (kind === 'apron') {
    // The Norse hangerok: a wool tube held up by two straps, each fastened at the chest by
    // an oval brooch. The brooches are the diagnostic part — without them it is a pinafore.
    const spine = raw('spine') || chest;
    const top = M.chestY - 0.035, bot = M.kneeY + 0.02, h = Math.max(0.2, top - bot);
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.04, M.girth * 1.46, h, 26, 1, true), mat(colors.wear));
    g.add(tube);
    for (const sx of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.13, 0.012), mat(colors.wear));
      strap.position.set(sx * M.girth * 0.58, h / 2 + 0.055, -0.020);
      strap.rotation.z = sx * 0.05;
      g.add(strap);
      const brooch = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), mat(accent));
      brooch.scale.set(1, 1.45, 0.42);
      brooch.position.set(sx * M.girth * 0.60, h / 2 - 0.012, M.girth * 0.82);
      g.add(brooch);
    }
    hang(spine, g, column(top, h));
  } else if (kind === 'overskirt') {
    // A wrap skirt over the gown, open down the front-left.
    const hips = raw('hips');
    const top = M.hipsY + 0.035, bot = M.kneeY - 0.14, h = Math.max(0.15, top - bot);
    const wrap = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.32, M.girth * 1.74, h, 28, 1, true,
                                 Math.PI * 0.12, Math.PI * 1.62), mat(colors.wear));
    g.add(wrap);
    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.75, M.girth * 1.80, h * 0.08, 28, 1, true,
                                 Math.PI * 0.12, Math.PI * 1.62), mat(colors.trim));
    edge.position.y = -h / 2 + h * 0.04;
    g.add(edge);
    hang(hips, g, column(top, h));
  } else if (kind === 'shawl') {
    // The quechquemitl: two rectangles seamed into a diamond that points front and back, so
    // it is built on four radial segments rather than a smooth cone.
    const top = M.chestY + 0.035, h = (M.chestY - M.hipsY) * 1.5;
    const d = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 0.60, M.girth * 1.92, h, 4, 1, true), mat(colors.wear));
    d.rotation.y = Math.PI / 4;
    g.add(d);
    const fringe = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.93, M.girth * 1.97, h * 0.09, 4, 1, true), mat(colors.trim));
    fringe.rotation.y = Math.PI / 4;
    fringe.position.y = -h / 2 + h * 0.045;
    g.add(fringe);
    hang(chest, g, column(top, h), M.cx, M.cz);
  } else if (kind === 'collar') {
    // The Egyptian wesekh: a broad flat collar that sits on the collarbone like a plate.
    const base = M.chestY + (M.neckY - M.chestY) * 0.48;
    [colors.wear, colors.trim, accent].forEach((hex, i) => {
      const r0 = M.girth * (0.40 + i * 0.28), r1 = M.girth * (0.66 + i * 0.28);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32, 1), mat(hex));
      ring.rotation.x = -Math.PI / 2 + 0.24;
      ring.position.set(0, -i * 0.014, 0.004);
      g.add(ring);
    });
    hang(chest, g, base);
  } else if (kind === 'torc') {
    // Celtic and Norse both: a stiff open neck ring with terminals at the throat.
    const neck = raw('neck');
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.0105, 10, 26, Math.PI * 1.58), mat(colors.wear));
    ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI * 0.71;
    g.add(ring);
    for (const sx of [-1, 1]) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), mat(accent));
      ball.position.set(sx * 0.030, 0, 0.043);
      g.add(ball);
    }
    hang(neck, g, M.neckY - 0.022);
  } else if (kind === 'beads') {
    [0.058, 0.078, 0.098].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.0072, 8, 28), mat(i === 1 ? accent : colors.trim));
      ring.rotation.x = Math.PI / 2 - 0.18;
      ring.position.set(0, -i * 0.026, 0.010 + i * 0.008);
      g.add(ring);
    });
    hang(chest, g, M.chestY + 0.010);
  } else if (kind === 'obi') {
    // A wide Japanese waist sash, tied at the back. Nearly a third of the torso.
    const spine = raw('spine') || chest;
    const h = (M.chestY - M.hipsY) * 0.74;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(M.girth * 1.10, M.girth * 1.14, h, 26, 1, true), mat(colors.wear));
    g.add(band);
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.11, h * 0.90, 0.05), mat(colors.trim));
    knot.position.set(0, 0, -M.girth * 1.16);
    g.add(knot);
    hang(spine, g, M.spineY + 0.030);
  } else if (kind === 'veil') {
    // Head covering plus two panels to the shoulder. Read at a distance it is the single
    // strongest "this is a story from a long time ago" signal available.
    const head = raw('head');
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.152, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      mat(colors.wear, THREE.DoubleSide));
    cap.rotation.x = -0.20;
    g.add(cap);
    for (const sx of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.20, 0.012), mat(colors.wear));
      panel.position.set(sx * 0.125, -0.105, -0.012);
      panel.rotation.z = sx * 0.09;
      g.add(panel);
    }
    hang(head, g, M.headY + 0.045);
  } else if (kind === 'wreath') {
    const head = raw('head');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.0095, 8, 26), mat(colors.wear));
    ring.rotation.x = Math.PI / 2 - 0.10;
    g.add(ring);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 6), mat(colors.trim));
      leaf.scale.set(0.42, 1, 0.30);
      leaf.position.set(Math.cos(a) * 0.128, 0.008, Math.sin(a) * 0.128);
      leaf.rotation.set(0.5, -a, 0.35);
      g.add(leaf);
    }
    hang(head, g, M.headY + 0.105);
  } else if (kind === 'circlet') {
    const head = raw('head');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.126, 0.0068, 8, 28), mat(colors.wear));
    ring.rotation.x = Math.PI / 2 - 0.08;
    g.add(ring);
    const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), mat(accent));
    drop.position.set(0, -0.012, 0.124);
    g.add(drop);
    hang(head, g, M.headY + 0.085);
  } else if (kind === 'crest') {
    // A kokoshnik: the tall arched crest that reads as Slavic from the thumbnail alone.
    const head = raw('head');
    const arc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.118, 0.135, 24, 1, true, Math.PI * 0.42, Math.PI * 1.16),
      mat(colors.wear));
    g.add(arc);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.127, 0.127, 0.018, 24, 1, true, Math.PI * 0.42, Math.PI * 1.16),
      mat(colors.trim));
    rim.position.y = 0.064;
    g.add(rim);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.55 + (i / 4) * Math.PI * 0.90;
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 10, 8), mat(accent));
      stud.position.set(Math.cos(a) * 0.123, 0.012, Math.sin(a) * 0.123);
      g.add(stud);
    }
    hang(head, g, M.headY + 0.165);
  } else if (kind === 'bangles') {
    for (const side of ['left', 'right']) {
      const arm = raw(side + 'LowerArm');
      if (!arm) continue;
      const child = raw(side + 'Hand');
      const dir = child ? child.position.clone().normalize() : new THREE.Vector3(0, -1, 0);
      const len = child ? child.position.length() : 0.18;
      const stack = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.030, 0.0055, 8, 20), mat(i === 1 ? accent : colors.trim));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -i * 0.017;
        stack.add(ring);
      }
      stack.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      stack.position.copy(dir).multiplyScalar(len * 0.74);
      fit(arm, stack);
      g.userData.detached = true;
    }
  }
  return g;
}

export const byId = (id) => LOOKS.find(l => l.id === id) || LOOKS[0];
