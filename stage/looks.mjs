/**
 * Ten looks for the presenter, as data.
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
];

/**
 * Garment pieces added as geometry, parented to the skeleton so they animate with her.
 * A VRM's clothes are baked into its mesh — this is the only way to change the silhouette
 * without authoring a new body in VRoid Studio.
 */
export function buildWear(kind, vrm, colors) {
  const raw = (b) => vrm.humanoid.getRawBoneNode(b);
  const mat = (hex, side = THREE.DoubleSide) => new THREE.MeshToonMaterial({
    color: hex, side, gradientMap: colors.ramp,
  });
  const chest = raw('upperChest') || raw('chest') || raw('spine');
  const scale = colors.scale;                   // character build vs an average adult
  const g = new THREE.Group();

  // Garments are dimensioned in metres but get parented into a BONE's local space, and a
  // VRM's bones are not unit-scaled — on some models the chest bone carries a scale of
  // several times one, which turned a 30cm shoulder cape into a cone that swallowed her
  // head. Undo the parent's world scale so the numbers above mean metres.
  const _ws = new THREE.Vector3();
  // Mark here rather than at the call site. Pieces that attach straight to a bone (the
  // armbands) are never children of the returned group, so a caller that walks that group
  // to tag them misses them — and the next look change then fails to clear them and stacks
  // a second pair on top.
  const mark = (obj) => {
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
  }
  return g;
}

export const byId = (id) => LOOKS.find(l => l.id === id) || LOOKS[0];
