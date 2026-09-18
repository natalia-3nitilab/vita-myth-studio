/**
 * Set dressing, in the same flat-illustration language as the character.
 *
 * Everything is primitives with three-tone toon shading and a dark inverted hull, because
 * a photographic room behind a cel-shaded character reads as a compositing mistake. The
 * shot plan asks for a door in 16 shots, a table and lamp in 15, a desk in 14 and a sofa
 * in 3, so these are composed into sets rather than modelled one shot at a time.
 *
 * Units are metres. Heights that have to meet the character (the sofa seat, the desk) are
 * set at runtime from the animation, not hardcoded — see placeSeat() in scene.html.
 */
import * as THREE from 'three';

export const PALETTE = {
  floor:  '#d9ccb6',
  wall:   '#e8e0d2',
  sofa:   '#8fa9a6',
  cushion:'#a6c0bc',
  wood:   '#8a6242',
  woodDk: '#6d4c33',
  shade:  '#f0dcb4',
  metal:  '#4a4741',
  paper:  '#f2efe6',
};

/** A group holding the mesh plus its inverted hull, so props outline like the character. */
function solid(geo, color, mk, outline = 0.012) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mk.toon(color)));
  const o = new THREE.Mesh(geo, mk.outline(outline));
  g.add(o);
  return g;
}

function box(w, h, d, color, mk, out) { return solid(new THREE.BoxGeometry(w, h, d), color, mk, out); }
function cyl(rt, rb, h, color, mk, seg = 20, out) {
  return solid(new THREE.CylinderGeometry(rt, rb, h, seg), color, mk, out);
}

/** Large ground plane. Everything else stands on it, and it takes the shadows. */
export function makeFloor(mk) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mk.toon(PALETTE.floor));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  g.add(m);                              // no hull: a ground plane's outline is the horizon
  return g;
}

/**
 * Back wall, built from four panels around a rectangular hole so a door or window can sit
 * in it without CSG. `opening` is [centreX, sillY, width, height]; omit for a blank wall.
 */
export function makeWall(mk, { width = 14, height = 3.2, z = -3.2, opening = null } = {}) {
  const g = new THREE.Group();
  const T = 0.12;
  const panel = (w, h, x, y) => {
    if (w <= 0.001 || h <= 0.001) return;
    const p = box(w, h, T, PALETTE.wall, mk, 0.006);
    p.position.set(x, y + h / 2, z);
    p.children.forEach(c => { c.receiveShadow = true; });
    g.add(p);
  };
  const skirting = box(width, 0.10, T + 0.05, PALETTE.woodDk, mk, 0.006);
  skirting.position.set(0, 0.05, z + 0.02);
  g.add(skirting);

  if (!opening) { panel(width, height, 0, 0); return g; }
  const [cx, sill, ow, oh] = opening;
  const left = cx - ow / 2, right = cx + ow / 2;
  panel(left + width / 2, height, (-width / 2 + left) / 2, 0);        // left of the hole
  panel(width / 2 - right, height, (right + width / 2) / 2, 0);       // right of the hole
  panel(ow, sill, cx, 0);                                             // under the hole
  panel(ow, height - sill - oh, cx, sill + oh);                       // over the hole
  return g;
}

/** A doorway: frame plus a door panel standing ajar in the wall opening. */
export function makeDoor(mk, { z = -3.2, x = 0, w = 1.0, h = 2.1 } = {}) {
  const g = new THREE.Group();
  const jamb = 0.08;
  for (const sx of [-1, 1]) {
    const j = box(jamb, h + jamb, 0.2, PALETTE.woodDk, mk, 0.008);
    j.position.set(x + sx * (w / 2 + jamb / 2), (h + jamb) / 2, z);
    g.add(j);
  }
  const head = box(w + jamb * 2, jamb, 0.2, PALETTE.woodDk, mk, 0.008);
  head.position.set(x, h + jamb / 2, z); g.add(head);
  // The panel itself, hinged open — a closed door is a flat rectangle and reads as nothing.
  const panel = box(w, h, 0.05, PALETTE.wood, mk, 0.008);
  const hinge = new THREE.Group();
  hinge.position.set(x - w / 2, 0, z);
  panel.position.set(w / 2, h / 2, 0);
  hinge.add(panel); hinge.rotation.y = 0.55;
  g.add(hinge);
  return g;
}

/** Window with a sill and a cross mullion; the opening itself is left bright. */
export function makeWindow(mk, { z = -3.2, x = 0, w = 1.4, h = 1.2, sill = 1.0 } = {}) {
  const g = new THREE.Group();
  const frame = 0.07;
  for (const [ww, hh, ox, oy] of [[w + frame*2, frame, 0, -frame/2], [w + frame*2, frame, 0, h + frame/2],
                                  [frame, h, -w/2 - frame/2, h/2], [frame, h, w/2 + frame/2, h/2]]) {
    const f = box(ww, hh, 0.14, PALETTE.paper, mk, 0.006);
    f.position.set(x + ox, sill + oy, z); g.add(f);
  }
  const vert = box(frame * 0.7, h, 0.12, PALETTE.paper, mk, 0.005);
  vert.position.set(x, sill + h / 2, z); g.add(vert);
  const horiz = box(w, frame * 0.7, 0.12, PALETTE.paper, mk, 0.005);
  horiz.position.set(x, sill + h / 2, z); g.add(horiz);
  const ledge = box(w + frame * 3, 0.06, 0.3, PALETTE.wood, mk, 0.006);
  ledge.position.set(x, sill - frame, z + 0.08); g.add(ledge);
  return g;
}

/**
 * Two-seat sofa. `seatH` is the height of the cushion top — set from the animation so the
 * character rests on it instead of hovering above it.
 */
export function makeSofa(mk, { seatH = 0.45, w = 2.0, d = 0.9 } = {}) {
  const g = new THREE.Group();
  const baseH = seatH - 0.12;
  const base = box(w, baseH, d, PALETTE.sofa, mk);
  base.position.y = baseH / 2; g.add(base);

  for (let i = 0; i < 2; i++) {                       // seat cushions
    const c = box(w / 2 - 0.09, 0.14, d - 0.12, PALETTE.cushion, mk);
    c.position.set((i - 0.5) * (w / 2 + 0.02), baseH + 0.07, 0.02);
    g.add(c);
  }
  const back = box(w, 0.62, 0.18, PALETTE.sofa, mk);
  back.position.set(0, seatH + 0.31, -d / 2 + 0.09); g.add(back);
  for (let i = 0; i < 2; i++) {                       // back cushions
    const c = box(w / 2 - 0.12, 0.44, 0.13, PALETTE.cushion, mk);
    c.position.set((i - 0.5) * (w / 2 + 0.02), seatH + 0.24, -d / 2 + 0.24);
    g.add(c);
  }
  for (const sx of [-1, 1]) {                         // arms
    const a = box(0.18, seatH + 0.22, d, PALETTE.sofa, mk);
    a.position.set(sx * (w / 2 - 0.09), (seatH + 0.22) / 2, 0); g.add(a);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Low side table. */
export function makeTable(mk, { h = 0.52, w = 0.62, d = 0.52 } = {}) {
  const g = new THREE.Group();
  const top = box(w, 0.055, d, PALETTE.wood, mk, 0.008);
  top.position.y = h; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.055, h, 0.055, PALETTE.woodDk, mk, 0.006);
    leg.position.set(sx * (w / 2 - 0.06), h / 2, sz * (d / 2 - 0.06)); g.add(leg);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Writing desk — wider than the side table, with a modesty panel. */
export function makeDesk(mk, { h = 0.74, w = 1.5, d = 0.68 } = {}) {
  const g = new THREE.Group();
  const top = box(w, 0.06, d, PALETTE.wood, mk, 0.008);
  top.position.y = h; g.add(top);
  for (const sx of [-1, 1]) {
    const leg = box(0.07, h, d - 0.08, PALETTE.woodDk, mk, 0.006);
    leg.position.set(sx * (w / 2 - 0.06), h / 2, 0); g.add(leg);
  }
  const panel = box(w - 0.24, h - 0.30, 0.04, PALETTE.woodDk, mk, 0.006);
  panel.position.set(0, (h - 0.30) / 2 + 0.16, -d / 2 + 0.06); g.add(panel);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Plain seat for desk shots; seatH is set from the animation, like the sofa. */
export function makeChair(mk, { seatH = 0.45, w = 0.48, d = 0.48 } = {}) {
  const g = new THREE.Group();
  const seat = box(w, 0.07, d, PALETTE.wood, mk, 0.008);
  seat.position.y = seatH; g.add(seat);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.05, seatH, 0.05, PALETTE.woodDk, mk, 0.006);
    leg.position.set(sx * (w / 2 - 0.05), seatH / 2, sz * (d / 2 - 0.05)); g.add(leg);
  }
  const back = box(w, 0.5, 0.05, PALETTE.wood, mk, 0.008);
  back.position.set(0, seatH + 0.28, -d / 2 + 0.03); g.add(back);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/**
 * Table lamp. The shade is emissive rather than lit, and carries a small point light — the
 * script calls for a warm lamp in 15 shots and a shade that only reflects looks switched off.
 */
export function makeLamp(mk, { h = 0.46 } = {}) {
  const g = new THREE.Group();
  const base = cyl(0.11, 0.13, 0.04, PALETTE.metal, mk, 20, 0.008);
  base.position.y = 0.02; g.add(base);
  const stem = cyl(0.018, 0.018, h * 0.62, PALETTE.metal, mk, 12, 0.006);
  stem.position.y = h * 0.31 + 0.04; g.add(stem);

  const shadeGeo = new THREE.CylinderGeometry(0.11, 0.17, 0.2, 24, 1, true);
  const shade = new THREE.Mesh(shadeGeo, new THREE.MeshBasicMaterial({
    color: PALETTE.shade, side: THREE.DoubleSide,
  }));
  shade.position.y = h * 0.93 + 0.04;
  g.add(shade);
  const hull = new THREE.Mesh(shadeGeo, mk.outline(0.008));
  hull.position.copy(shade.position); g.add(hull);

  // 1.6 over 4.5m washed the sofa out to pure white. The shade should read as lit, not the
  // furniture next to it.
  const bulb = new THREE.PointLight(0xffd9a0, 0.5, 2.6 * (h / 0.46), 2);
  bulb.position.y = shade.position.y;
  g.add(bulb);
  g.userData.bulb = bulb;
  return g;
}

/**
 * Named sets. A shot names one of these instead of listing props, so the 123-shot plan can
 * say "living" and get a consistent room every time it comes back to it.
 */
/** A colonnade — the cheapest thing that says "Greek" without modelling a temple. */
export function makeColumns(mk, { n = 6, spacing = 1.5, h = 3.0, r = 0.17, z = -3.0 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * spacing;
    const shaft = cyl(r * 0.88, r, h, PALETTE.wall, mk, 18, 0.014);
    shaft.position.set(x, h / 2, z); g.add(shaft);
    const cap = box(r * 2.6, 0.16, r * 2.6, PALETTE.wall, mk, 0.012);
    cap.position.set(x, h + 0.08, z); g.add(cap);
    const base = box(r * 2.6, 0.16, r * 2.6, PALETTE.wall, mk, 0.012);
    base.position.set(x, 0.08, z); g.add(base);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** A cave mouth: a dark arch to walk down into. Built from a torus half and two piers. */
export function makeArch(mk, { w = 2.4, h = 3.0, z = -3.2 } = {}) {
  const g = new THREE.Group();
  const r = w / 2, pierH = h - r;
  for (const sx of [-1, 1]) {
    const pier = box(0.30, pierH, 0.5, PALETTE.metal, mk, 0.012);
    pier.position.set(sx * (r + 0.15), pierH / 2, z); g.add(pier);
  }
  const ring = solid(new THREE.TorusGeometry(r + 0.15, 0.15, 10, 28, Math.PI), PALETTE.metal, mk, 0.012);
  ring.position.set(0, pierH, z); g.add(ring);
  // The opening itself: black, unlit, so it reads as depth rather than as a painted wall.
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
                               new THREE.MeshBasicMaterial({ color: '#0a0a10' }));
  mouth.position.set(0, h / 2 - 0.1, z - 0.26); g.add(mouth);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

/** Scattered points for the night moods. Unlit, so the backdrop gradient shows through. */
export function makeStars(mk, { n = 320 } = {}) {
  const g = new THREE.Group();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // Deterministic: a fixed hash, not Math.random, or every frame reshuffles the sky.
    const a = (i * 2.399963), r = 6 + ((i * 7919) % 1000) / 1000 * 16;
    pos[i*3] = Math.cos(a) * r;
    pos[i*3+1] = 1.5 + ((i * 6151) % 1000) / 1000 * 11;
    pos[i*3+2] = -10 - ((i * 5147) % 1000) / 1000 * 6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fdf6e0', size: 0.07, sizeAttenuation: true })));
  return g;
}

export const SETS = {
  none:   [],
  bare:   ['floor'],
  living: ['floor', 'wall', 'sofa', 'table', 'lamp'],
  door:   ['floor', 'wallDoor', 'doorway', 'table', 'lamp'],
  desk:   ['floor', 'wallWindow', 'window', 'desk', 'chair', 'lamp'],
  // Mythology sets — no furniture, just enough scenery to place her somewhere.
  temple: ['floor', 'columns'],
  cave:   ['floor', 'arch'],
  night:  ['floor', 'stars'],
  void:   [],
  // Photographic backdrop: no 3D environment at all, just her and a contact shadow.
  photo:  ['contact'],
};
