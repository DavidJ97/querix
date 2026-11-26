import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {START, ZONES, OCCLUDERS, canStand, moveWithCollisions, nearestZone, charHeight} from '../apps/web/app/clinicWorld.mjs';

const assets = new URL('../apps/web/public/game-assets/', import.meta.url);

test('le pack graphique est complet et à plat dans game-assets', () => {
  const names = ['clinic.webp', ...['back', 'front', 'right'].flatMap(d => [0, 1, 2, 3, 4, 5].map(i => `${d}-${i}.png`))];
  for (const n of names) assert.ok(existsSync(new URL(n, assets)), n);
});

test('le point de départ et toutes les zones sont praticables', () => {
  assert.ok(canStand(START.x, START.y));
  for (const z of ZONES) assert.ok(canStand(z.x, z.y), z.label);
});

test('le mobilier bloque le personnage', () => {
  assert.equal(canStand(200, 420), false, 'comptoir d’accueil');
  assert.equal(canStand(1150, 400), false, 'chaises');
  assert.equal(canStand(383, 322), false, 'plante');
  assert.equal(canStand(396, 389), false, 'cordon du guide-file');
  assert.equal(canStand(700, 270), false, 'fond de salle');
});

test('chaque zone est atteignable depuis le départ (recherche en largeur)', () => {
  const step = 6, key = (x, y) => `${x},${y}`, seen = new Set([key(START.x, START.y)]), queue = [[START.x, START.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const n = moveWithCollisions({x, y}, dx, dy);
      if ((n.x !== x || n.y !== y) && !seen.has(key(n.x, n.y))) { seen.add(key(n.x, n.y)); queue.push([n.x, n.y]); }
    }
  }
  for (const [i, z] of ZONES.entries()) {
    const reached = [...seen].some(s => { const [x, y] = s.split(',').map(Number); return nearestZone({x, y}, ZONES.length) === i; });
    assert.ok(reached, z.label);
  }
});

test('glissement le long d’un obstacle plutôt que blocage', () => {
  const p = moveWithCollisions({x: 310, y: 450}, -20, 6);
  assert.ok(p.y > 450 && p.x >= 300, JSON.stringify(p));
});

test('perspective et occultants cohérents', () => {
  assert.ok(charHeight(480) > charHeight(300) * 1.8);
  for (const o of OCCLUDERS) assert.ok(o.poly.length >= 3 && Number.isFinite(o.base), o.name);
});

test('le déplacement tactile contourne le guide-file', async () => {
  const {findPath} = await import('../apps/web/app/clinicWorld.mjs');
  const behindRope = {x: 400, y: 340};
  assert.ok(canStand(behindRope.x, behindRope.y));
  const path = findPath(START, behindRope);
  assert.ok(path.length >= 2, 'contournement nécessaire');
  let p = START;
  for (const w of path) { for (let t = 1; t <= 20; t++) assert.ok(canStand(p.x + (w.x - p.x) * t / 20, p.y + (w.y - p.y) * t / 20)); p = w; }
  assert.ok(findPath(behindRope, ZONES[0]).length >= 1);
});
